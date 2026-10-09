/**
 * Electron Security Permissions & Navigation Guards
 * Bloquea navegación no autorizada, apertura de ventanas emergentes y permisos no autorizados.
 */

export function configureSecurityPolicies(win: any) {
  // Prevenir apertura de ventanas emergentes no autorizadas
  win.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Prevenir navegación a URLs remotas no autorizadas
  win.webContents.on('will-navigate', (event: any, navigationUrl: string) => {
    const parsed = new URL(navigationUrl);
    if (parsed.protocol !== 'file:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      event.preventDefault();
    }
  });

  // Restringir permisos de sistema (cámara, micrófono, geolocalización, etc.)
  win.webContents.session.setPermissionRequestHandler((_webContents: any, _permission: any, callback: (granted: boolean) => void) => {
    callback(false); // Atlas no requiere sensores ni permisos periféricos
  });
}
