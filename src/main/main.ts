import { app, BrowserWindow, ipcMain, Menu, shell, dialog } from 'electron';
import * as path from 'path';
import { isDev } from '@shared/utils';
import { IPCChannels } from '@shared/types';

class OpenConverseApp {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await app.whenReady();
    
    this.createWindow();
    this.setupEventHandlers();
    this.setupIPC();
    this.createMenu();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false, // Don't show until ready-to-show
    });

    // Load the renderer
    if (isDev()) {
      this.mainWindow.loadURL('file://' + path.join(__dirname, 'index.html'));
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, 'index.html'));
    }

    // Show window when ready to prevent visual flash
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupEventHandlers(): void {
    // Handle external links
    if (this.mainWindow) {
      this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
      });
    }
  }

  private setupIPC(): void {
    // App info
    ipcMain.handle(IPCChannels.GET_APP_VERSION, () => {
      return app.getVersion();
    });

    // Platform info
    ipcMain.handle(IPCChannels.GET_PLATFORM, () => {
      return {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
      };
    });

    // Show message box
    ipcMain.handle(IPCChannels.SHOW_MESSAGE_BOX, async (_, options) => {
      if (!this.mainWindow) return;
      return await dialog.showMessageBox(this.mainWindow, options);
    });

    // Show save dialog
    ipcMain.handle(IPCChannels.SHOW_SAVE_DIALOG, async (_, options) => {
      if (!this.mainWindow) return;
      return await dialog.showSaveDialog(this.mainWindow, options);
    });

    // Show open dialog
    ipcMain.handle(IPCChannels.SHOW_OPEN_DIALOG, async (_, options) => {
      if (!this.mainWindow) return;
      return await dialog.showOpenDialog(this.mainWindow, options);
    });
  }

  private createMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Chat',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.mainWindow?.webContents.send(IPCChannels.NEW_CHAT);
            },
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            },
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' },
        ],
      },
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      });

      // Window menu
      (template[4].submenu as Electron.MenuItemConstructorOptions[]).push(
        { type: 'separator' },
        { role: 'front' }
      );
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}

// Initialize the app
new OpenConverseApp();
