# Atlas — Explorador Tecnológico y Auditor Verificable de Software

**Atlas** es una estación de trabajo técnico de escritorio privada para Windows y entornos locales, orientada a dos misiones esenciales:

1. **Explorador Tecnológico:** Descubrir librerías, arquitecturas, motores de almacenamiento, sistemas de colas y protocolos a partir de descripciones de problemas en lenguaje natural, fundamentado en fuentes técnicas verificables y bases de conocimiento locales (sin alucinaciones ni librerías ficticias).
2. **Auditor de Proyectos de Software:** Inspeccionar repositorios locales de manera segura en modo solo lectura, inventariar dependencias y AST, y contrastar especificaciones de requisitos clasificando cada uno en los 5 estados canónicos:
   - `VERIFICADO`: Evidencia reproducible y suficiente de cumplimiento.
   - `FALLIDO`: Comprobación reproducible demuestra que no se cumple.
   - `INCOMPLETO`: Implementación parcial o componentes pendientes.
   - `NO VERIFICABLE`: La evidencia no permite concluir (e.g. depende de infraestructura externa).
   - `NO IMPLEMENTADO`: No se halló rastro suficiente tras búsqueda y comprobación.

---

## 🛠️ Arquitectura y Tecnologías
- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite.
- **Backend & IPC:** Node.js, Express, Electron Bridge (`electron/main.ts`, `electron/preload.ts`).
- **Persistencia:** SQLite (`sql.js` WASM con persistencia en `./data/atlas.sqlite` y migraciones versionadas).
- **Análisis Sintáctico:** `@babel/parser` con plugins TypeScript/JSX y analizadores de manifiestos (`package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, etc.).
- **Ejecución Supervisada:** Sandbox de comandos con validación de rutas, límites de tiempo (timeout), buffers controlados y autorización explícita obligatoria del usuario.
- **Investigación:** Base de conocimiento local verificada (offline-first) + integración con Google Gemini Grounded.

---

## 🚀 Uso Rápido en Desarrollo
```bash
# Iniciar servidor completo (API Express + Vite)
npm run dev

# Ejecutar la suite de pruebas automatizadas
npx tsx tests/run-tests.ts

# Compilar la aplicación para producción
npm run build
```

---

## 📦 Empaquetado para Windows x64 (Desktop)
La configuración de empaquetado para Windows se encuentra definida en `electron-builder.yml`:
```bash
# Generar instalador NSIS y versión portable para Windows x64
npx electron-builder --win nsis portable --x64
```
Los artefactos resultantes se generan en la carpeta `release/`.

---

## 🔒 Principios de Privacidad y Seguridad
- Cero telemetría y cero métricas comerciales.
- Los proyectos inspeccionados no sufren modificaciones de código durante auditorías normales.
- Los secretos, contraseñas y claves de API son enmascarados como `[REDACTED_SECRET]` en informes.
- Ningún comando dinámico se ejecuta sin consentimiento explícito en la interfaz gráfica.
