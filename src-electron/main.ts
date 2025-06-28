import { app, BrowserWindow, Tray, Menu, ipcMain } from 'electron';
import path from 'path';

let tray: Tray | null = null;
let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#F1F5F9',
    frame: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,
  });

  win.once('ready-to-show', () => win && win.show());
  win.loadURL(
    app.isPackaged
      ? `file://${path.join(__dirname, '../.next/server/pages/index.html')}`
      : 'http://localhost:3000'
  );
}

function createTray() {
  tray = new Tray(path.join(__dirname, '../assets/icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => win && win.show() },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setToolTip('OpenConverse');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => win && win.show());
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC shell (example, replace with real use case later)
ipcMain.handle('example-ipc', async (event, arg) => {
  // Placeholder: do something with arg
  return { result: 'pong', received: arg };
});
