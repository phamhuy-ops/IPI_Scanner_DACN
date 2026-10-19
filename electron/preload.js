const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('owaspWorkbench', {
  scanIpiDoc: (filePaths, scanProfile) => ipcRenderer.invoke('ipi:scanDoc', { filePaths, scanProfile }),
  scanIpiDocFolder: (folderPath, scanProfile) => ipcRenderer.invoke('ipi:scanDocFolder', { folderPath, scanProfile }),
  pickFolder: () => ipcRenderer.invoke('dialog:pickFolder'),
  pickFiles: () => ipcRenderer.invoke('dialog:pickFiles'),
  stopScan: () => ipcRenderer.invoke('scan:stop'),
  checkOllama: () => ipcRenderer.invoke('ai:ollama:check'),
  aiFetch: (payload) => ipcRenderer.invoke('ai:fetch', payload),
  saveCleanFile: (payload) => ipcRenderer.invoke('file:saveClean', payload),
  onScanProgress: (callback) => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('scan:progress', listener);
    return listener;
  },
  offScanProgress: (listener) => {
    if (listener) ipcRenderer.removeListener('scan:progress', listener);
  },
});
