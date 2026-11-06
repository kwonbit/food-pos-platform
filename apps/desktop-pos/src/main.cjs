const { app, BrowserWindow, ipcMain } = require("electron");
const Database = require("better-sqlite3");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

let db;
let deviceId;

function openDatabase() {
  const dataDir = app.getPath("userData");
  fs.mkdirSync(dataDir, { recursive: true });
  const deviceFile = path.join(dataDir, "device-id.txt");
  if (fs.existsSync(deviceFile)) {
    deviceId = fs.readFileSync(deviceFile, "utf8").trim();
  }
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    fs.writeFileSync(deviceFile, deviceId, "utf8");
  }

  const dbPath = path.join(dataDir, "food-pos.sqlite");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  const schemaPath = path.join(__dirname, "database", "schema.sql");
  db.exec(fs.readFileSync(schemaPath, "utf8"));
}

function registerIpc() {
  ipcMain.handle("pos:get-local-status", () => {
    const pending = db.prepare(
      "SELECT COUNT(*) AS count FROM sync_outbox WHERE status IN ('PENDING', 'FAILED')"
    ).get();
    const latest = db.prepare(
      "SELECT MAX(processed_at) AS lastSyncedAt FROM sync_outbox WHERE status = 'SUCCEEDED'"
    ).get();
    const orders = db.prepare("SELECT COUNT(*) AS count FROM local_orders").get();
    return {
      deviceId,
      databasePath: db.name,
      localOrderCount: orders.count,
      pendingSyncCount: pending.count,
      lastSyncedAt: latest.lastSyncedAt || null
    };
  });

  ipcMain.handle("pos:create-local-order", (_event, input) => {
    if (!input || typeof input !== "object") throw new Error("주문 정보가 올바르지 않습니다.");
    const { tenantId, storeId, orderType, tableId, tableName, customerName, requestNote, items } = input;
    if (!tenantId || !storeId) throw new Error("매장 정보가 필요합니다.");
    if (!["DINE_IN", "TAKEOUT", "DELIVERY", "PHONE", "QR"].includes(orderType)) {
      throw new Error("지원하지 않는 주문 유형입니다.");
    }
    if (!Array.isArray(items) || items.length === 0) throw new Error("주문 항목이 없습니다.");

    const normalizedItems = items.map((item) => {
      const unitPrice = Number(item.unitPrice);
      const quantity = Number(item.quantity);
      if (!item.menuName || !Number.isSafeInteger(unitPrice) || unitPrice < 0 ||
          !Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error("메뉴명, 가격 또는 수량이 올바르지 않습니다.");
      }
      return {
        id: crypto.randomUUID(),
        menuId: item.menuId || null,
        menuName: String(item.menuName),
        optionText: String(item.optionText || ""),
        unitPrice,
        quantity,
        lineTotal: unitPrice * quantity
      };
    });

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    if (!Number.isSafeInteger(subtotal)) throw new Error("주문 금액이 너무 큽니다.");

    const orderId = crypto.randomUUID();
    const occurredAt = new Date().toISOString();
    const createOrder = db.transaction(() => {
      db.prepare(
        "INSERT INTO device_sequence(device_id, next_order_sequence) VALUES (?, 1) ON CONFLICT(device_id) DO NOTHING"
      ).run(deviceId);
      const sequenceRow = db.prepare(
        "SELECT next_order_sequence FROM device_sequence WHERE device_id = ?"
      ).get(deviceId);
      const sequence = sequenceRow.next_order_sequence;
      db.prepare(
        "UPDATE device_sequence SET next_order_sequence = ?, updated_at = ? WHERE device_id = ?"
      ).run(sequence + 1, occurredAt, deviceId);

      const orderNumber = `OFF-${deviceId.slice(0, 6).toUpperCase()}-${String(sequence).padStart(6, "0")}`;
      db.prepare(`
        INSERT INTO local_orders (
          id, tenant_id, store_id, device_id, local_sequence, order_number,
          order_type, table_id, table_name, customer_name, request_note,
          order_status, payment_status, subtotal_amount, discount_amount,
          tax_amount, total_amount, sync_state, client_created_at
        ) VALUES (
          @id, @tenantId, @storeId, @deviceId, @sequence, @orderNumber,
          @orderType, @tableId, @tableName, @customerName, @requestNote,
          'PENDING', 'UNPAID', @subtotal, 0, 0, @subtotal, 'PENDING', @occurredAt
        )
      `).run({
        id: orderId, tenantId, storeId, deviceId, sequence, orderNumber,
        orderType, tableId: tableId || null, tableName: tableName || null,
        customerName: customerName || null, requestNote: requestNote || null,
        subtotal, occurredAt
      });

      const insertItem = db.prepare(`
        INSERT INTO local_order_items (
          id, order_id, menu_id, menu_name_snapshot, option_text_snapshot,
          unit_price_snapshot, quantity, line_total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of normalizedItems) {
        insertItem.run(item.id, orderId, item.menuId, item.menuName, item.optionText,
          item.unitPrice, item.quantity, item.lineTotal);
      }

      const eventId = crypto.randomUUID();
      const payload = {
        order: {
          id: orderId, tenantId, storeId, deviceId, localSequence: sequence,
          orderNumber, orderType, tableId: tableId || null, tableName: tableName || null,
          customerName: customerName || null, requestNote: requestNote || null,
          orderStatus: "PENDING", paymentStatus: "UNPAID",
          subtotalAmount: subtotal, totalAmount: subtotal, createdAt: occurredAt
        },
        items: normalizedItems
      };
      db.prepare(`
        INSERT INTO sync_outbox (
          id, tenant_id, store_id, device_id, aggregate_type, aggregate_id,
          event_type, payload_json, idempotency_key, occurred_at, status
        ) VALUES (?, ?, ?, ?, 'ORDER', ?, 'ORDER_CREATED', ?, ?, ?, 'PENDING')
      `).run(eventId, tenantId, storeId, deviceId, orderId, JSON.stringify(payload), eventId, occurredAt);

      return { id: orderId, orderNumber, totalAmount: subtotal, syncState: "PENDING" };
    });

    return createOrder();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: "#f4f6f8",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  openDatabase();
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  if (db) db.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
