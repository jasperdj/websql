// WebView2 wrapper for WebSQL Data Compare
const { app, BrowserWindow } = require('electron');
const path = require('path');

// Check if we should use WebView2
const useWebView2 = process.platform === 'win32';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      // Use WebView2 on Windows
      webviewTag: useWebView2,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (useWebView2) {
    // Load using WebView2
    mainWindow.loadFile(path.join(__dirname, 'webview2.html'));
  } else {
    // Fallback to regular Electron
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});