"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
let tray = null;
let win = null;
function createWindow() {
    win = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        backgroundColor: '#F1F5F9',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
        icon: path_1.default.join(__dirname, '../assets/icon.png'),
        show: false,
    });
    win.once('ready-to-show', () => win && win.show());
    win.loadURL(electron_1.app.isPackaged
        ? `file://${path_1.default.join(__dirname, '../.next/server/pages/index.html')}`
        : 'http://localhost:3000');
}
function createTray() {
    tray = new electron_1.Tray(path_1.default.join(__dirname, '../assets/icon.png'));
    const contextMenu = electron_1.Menu.buildFromTemplate([
        { label: 'Show', click: () => win && win.show() },
        { label: 'Quit', click: () => electron_1.app.quit() },
    ]);
    tray.setToolTip('OpenConverse');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => win && win.show());
}
electron_1.app.whenReady().then(() => {
    createWindow();
    createTray();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
// IPC shell (example, replace with real use case later)
electron_1.ipcMain.handle('example-ipc', async (event, arg) => {
    // Placeholder: do something with arg
    return { result: 'pong', received: arg };
});
