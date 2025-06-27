import { contextBridge, ipcRenderer } from 'electron';
import { IPCChannels, PlatformInfo, AppSettings, ChatSession } from '@shared/types';

// Define the API that will be exposed to the renderer process
interface ElectronAPI {
  // App info
  getAppVersion(): Promise<string>;
  getPlatform(): Promise<PlatformInfo>;
  
  // Dialog methods
  showMessageBox(options: Electron.MessageBoxOptions): Promise<Electron.MessageBoxReturnValue>;
  showSaveDialog(options: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue>;
  showOpenDialog(options: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue>;
  
  // Event listeners
  onNewChat(callback: () => void): void;
  onReceiveMessage(callback: (message: any) => void): void;
  
  // Remove listeners
  removeAllListeners(channel: string): void;
}

// Expose the API to the renderer process
const electronAPI: ElectronAPI = {
  // App info
  getAppVersion: () => ipcRenderer.invoke(IPCChannels.GET_APP_VERSION),
  getPlatform: () => ipcRenderer.invoke(IPCChannels.GET_PLATFORM),
  
  // Dialog methods
  showMessageBox: (options) => ipcRenderer.invoke(IPCChannels.SHOW_MESSAGE_BOX, options),
  showSaveDialog: (options) => ipcRenderer.invoke(IPCChannels.SHOW_SAVE_DIALOG, options),
  showOpenDialog: (options) => ipcRenderer.invoke(IPCChannels.SHOW_OPEN_DIALOG, options),
  
  // Event listeners
  onNewChat: (callback) => {
    ipcRenderer.on(IPCChannels.NEW_CHAT, callback);
  },
  onReceiveMessage: (callback) => {
    ipcRenderer.on(IPCChannels.RECEIVE_MESSAGE, (_, message) => callback(message));
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

// Expose the API to the window object
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Also expose it as a type for TypeScript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
