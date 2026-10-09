# Atlas — Proyectos y Ecosistemas Soportados

Atlas soporta la detección e inspección estática de proyectos en múltiples ecosistemas:

## 1. Ecosistemas con Soporte Completo
- **TypeScript y JavaScript:**
  - Manifiestos: `package.json` (npm, yarn, pnpm, bun)
  - Parsers: TypeScript Compiler API (`typescript`) para análisis AST de funciones, clases, interfaces, imports y exports.
  - Frameworks: React, Next.js, Vue, Angular, Svelte, Express, Fastify, NestJS, Vite, TailwindCSS, Electron.
  - Test Runners: Vitest, Jest, Mocha, Playwright, Cypress.

- **Python:**
  - Manifiestos: `requirements.txt`, `pyproject.toml`, `Pipfile`
  - Heurísticas AST: Definición de funciones (`def `, `async def `), importaciones (`import `, `from ... import`).
  - Frameworks: FastAPI, Django, Flask.
  - Test Runners: Pytest.

- **Rust:**
  - Manifiestos: `Cargo.toml`
  - Heurísticas AST: Funciones (`fn `), módulos y dependencias de Tokio, Actix, Axum.
  - Test Runners: `cargo test`.

- **Go:**
  - Manifiestos: `go.mod`
  - Heurísticas AST: Funciones (`func `), paquetes Gin, Fiber.
  - Test Runners: `go test`.

- **Contenedores e Infraestructura:**
  - Manifiestos: `Dockerfile`, `docker-compose.yml`, `docker-compose.yaml` (con parser YAML).
