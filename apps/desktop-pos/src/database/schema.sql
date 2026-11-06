-- SQLite schema for the first offline POS foundation.
-- The Electron main process owns this database; renderer code must use preload IPC only.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS local_store_settings (
  store_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  store_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  currency TEXT NOT NULL DEFAULT 'KRW',
  last_menu_sync_at TEXT,
  last_server_sync_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS local_menu_cache (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  category_id TEXT,
  category_name TEXT,
  name TEXT NOT NULL,
  base_price INTEGER NOT NULL CHECK (base_price >= 0),
  image_path TEXT,
  is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  options_json TEXT NOT NULL DEFAULT '[]',
  server_updated_at TEXT,
  cached_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_local_menu_store_available
  ON local_menu_cache(store_id, is_available, category_id);

CREATE TABLE IF NOT EXISTS local_orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  local_sequence INTEGER NOT NULL,
  server_order_id TEXT,
  order_number TEXT NOT NULL,
  server_order_number TEXT,
  order_type TEXT NOT NULL CHECK (order_type IN ('DINE_IN', 'TAKEOUT', 'DELIVERY', 'PHONE', 'QR')),
  table_id TEXT,
  table_name TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  delivery_address TEXT,
  request_note TEXT,
  order_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (order_status IN ('PENDING', 'CONFIRMED', 'COOKING', 'SERVED', 'CANCELLED')),
  payment_status TEXT NOT NULL DEFAULT 'UNPAID'
    CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED', 'PARTIAL_REFUNDED')),
  subtotal_amount INTEGER NOT NULL CHECK (subtotal_amount >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount INTEGER NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  sync_state TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (sync_state IN ('PENDING', 'SYNCED', 'FAILED', 'NEEDS_REVIEW')),
  client_created_at TEXT NOT NULL,
  server_created_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(device_id, local_sequence),
  UNIQUE(store_id, order_number)
);
CREATE INDEX IF NOT EXISTS idx_local_orders_store_created
  ON local_orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_local_orders_store_status
  ON local_orders(store_id, order_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_local_orders_sync
  ON local_orders(sync_state, created_at);

CREATE TABLE IF NOT EXISTS local_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES local_orders(id) ON DELETE CASCADE,
  menu_id TEXT,
  menu_name_snapshot TEXT NOT NULL,
  option_text_snapshot TEXT NOT NULL DEFAULT '',
  unit_price_snapshot INTEGER NOT NULL CHECK (unit_price_snapshot >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total_amount INTEGER NOT NULL CHECK (line_total_amount >= 0),
  item_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_local_order_items_order
  ON local_order_items(order_id);

CREATE TABLE IF NOT EXISTS local_payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  order_id TEXT NOT NULL REFERENCES local_orders(id),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'TRANSFER', 'MOBILE', 'OTHER')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  payment_status TEXT NOT NULL DEFAULT 'PAID'
    CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED')),
  device_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_local_payments_order
  ON local_payments(order_id, created_at);

CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  occurred_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'NEEDS_REVIEW')),
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  next_retry_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  processed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_ready
  ON sync_outbox(status, next_retry_at, created_at);

CREATE TABLE IF NOT EXISTS sync_inbox (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  server_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  applied_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_inbox_pending
  ON sync_inbox(applied_at, received_at);

CREATE TABLE IF NOT EXISTS device_sequence (
  device_id TEXT PRIMARY KEY,
  next_order_sequence INTEGER NOT NULL DEFAULT 1 CHECK (next_order_sequence > 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
