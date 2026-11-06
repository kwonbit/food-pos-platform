const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("foodPos", {
  getLocalStatus: () => ipcRenderer.invoke("pos:get-local-status"),
  createLocalOrder: (order) => ipcRenderer.invoke("pos:create-local-order", order)
});
