declare module 'electron' {
  export const contextBridge: {
    exposeInMainWorld(apiKey: string, api: any): void;
  };
  export const ipcRenderer: {
    invoke(channel: string, ...args: any[]): Promise<any>;
    on(channel: string, listener: (event: any, ...args: any[]) => void): void;
  };
  export const app: any;
  export const BrowserWindow: any;
}
