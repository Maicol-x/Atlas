# Atlas — Modelo de Amenazas y Seguridad

## 1. Actores y Límites de Confianza
- **Usuario Propietario:** Administrador de la máquina local. Posee control absoluto sobre qué proyectos inspeccionar y qué comandos ejecutar.
- **Código Inspeccionado (Untrusted):** Repositorios locales de procedencia externa o generados por IA. No se debe asumir que el código es seguro.
- **Servicios Externos (Semi-trusted):** Proveedor de IA (Gemini) utilizado únicamente para consultas técnicas abstractas, nunca para filtrar código propietario sin consentimiento.

## 2. Amenazas Identificadas y Mitigaciones

| Amenaza | Vector de Ataque | Mitigación en Atlas |
|---|---|---|
| **Ejecución Arbitraria de Código** | Repositorio malicioso con scripts `postinstall` o ejecutables ocultos | La exploración es estrictamente estática (lectura de bytes, parsing de JSON/TOML/AST). Cero invocaciones automáticas a `eval` o shells. |
| **Comandos Destructivos** | Comandos propuestos tipo `rm -rf /` o formateo de discos | `ExecutionPolicy` bloquea patrones destructivos y exige autorización explícita obligatoria con modal de confirmación y advertencias. |
| **Fuga de Secretos en Reportes** | `.env` con claves de API o tokens exportados a informes públicos | `Logger` y `Settings` sanitizan patrones de credenciales (`AIzaSy...`, `ghp_...`, Bearer tokens) sustituyéndolos por `[REDACTED_SECRET]`. |
| **Path Traversal** | Rutas relativas tipo `../../../../etc/passwd` | `ProjectScanner.readFileSafely` resuelve la ruta absoluta y valida que pertenezca al árbol raíz del proyecto. |
| **Bloqueo por Procesos Zombi** | Tests con bucles infinitos o servidores que no finalizan | `CommandRunner` impone timeout estricto (30s configurable) y envía SIGTERM seguido de SIGKILL. |
