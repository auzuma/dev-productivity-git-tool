const { contextBridge, ipcRenderer } = require('electron');

// Expose APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Directory selection
  selectDirectory: (title) => ipcRenderer.invoke('select-directory', title),
  
  // Template processing and Git operations
  processTemplates: (config) => ipcRenderer.invoke('process-templates', config),
  
  // Log listener
  onLogMessage: (callback) => {
    ipcRenderer.on('log-message', (event, message) => callback(message));
    return () => {
      ipcRenderer.removeAllListeners('log-message');
    };
  }
});
