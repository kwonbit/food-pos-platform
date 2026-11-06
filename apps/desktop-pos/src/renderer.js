const $ = (id) => document.getElementById(id);

async function refreshStatus() {
  const status = await window.foodPos.getLocalStatus();
  $("order-count").textContent = status.localOrderCount;
  $("pending-count").textContent = status.pendingSyncCount;
  $("last-sync").textContent = status.lastSyncedAt || "없음";
  $("device-id").textContent = status.deviceId;
  $("db-path").textContent = status.databasePath;
}

$("save").addEventListener("click", async () => {
  const button = $("save");
  const result = $("result");
  button.disabled = true;
  result.textContent = "저장 중...";
  try {
    const order = await window.foodPos.createLocalOrder({
      tenantId: $("tenant").value.trim(),
      storeId: $("store").value.trim(),
      orderType: $("type").value,
      tableName: $("table").value.trim() || null,
      requestNote: $("note").value.trim() || null,
      items: [{
        menuName: $("menu").value.trim(),
        unitPrice: Number($("price").value),
        quantity: Number($("quantity").value)
      }]
    });
    result.textContent = `저장 완료: ${order.orderNumber} / ${order.totalAmount.toLocaleString("ko-KR")}원 (동기화 대기)`;
    await refreshStatus();
  } catch (error) {
    result.textContent = error.message || "주문 저장에 실패했습니다.";
  } finally {
    button.disabled = false;
  }
});

refreshStatus().catch((error) => {
  $("result").textContent = error.message || "로컬 DB 상태를 불러오지 못했습니다.";
});
