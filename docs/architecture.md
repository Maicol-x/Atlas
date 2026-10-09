# Atlas — Arquitectura Técnica del Sistema

## 1. Visión General
Atlas es una aplicación de estación de trabajo técnico para Windows y entornos de desarrollo locales diseñada con dos propósitos primarios:
1. **Explorador Tecnológico:** Descubrir tecnologías, librerías, arquitecturas y protocolos a partir de descripciones de problemas en lenguaje natural sin alucinaciones ni invención de dependencias.
2. **Auditor Verificable de Software:** Inspeccionar repositorios de código locales de forma estática, extraer inventario verificable, contrastar especificaciones de requisitos y realizar comprobaciones dinámicas bajo autorización explícita.

## 2. Diagrama de Capas
```
┌────────────────────────────────────────────────────────┐
│                   Capa de Presentación                 │
│         React 19 + TypeScript + Vite + Tailwind CSS    │
│  (Dashboard, Proyectos, Explorador, Auditorías, etc.)   │
└───────────────────────────┬────────────────────────────┘
                            │
              puente AtlasClient (IPC / REST)
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Capa de Backend                     │
│  - server.ts (Express en Dev / Web)                    │
│  - electron/main.ts + preload.ts (Electron Desktop)   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   Servicios Nucleares                  │
│  ├─ ProjectScanner & ProjectClassifier                │
│  ├─ ManifestAnalyzer & ASTAnalyzer                    │
│  ├─ ResearchService & TechnologyComparator            │
│  ├─ SpecificationParser & FindingClassifier           │
│  ├─ CommandRunner & ExecutionPolicy                   │
│  └─ Database Migrations & Repositories                │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                  Persistencia Local                    │
│           SQLite (sql.js WASM + ./data/atlas.sqlite)   │
└────────────────────────────────────────────────────────┘
```

## 3. Principios de Diseño
- **Sin Ejecución Inadvertida:** Ningún archivo es ejecutado durante la inspección de carpetas.
- **Autorización Explícita:** Los comandos de prueba y construcción requieren confirmación activa del usuario en UI con modal de riesgos y directorio delimitado.
- **Aislamiento de Secretos:** Variables sensibles como tokens de API y contraseñas son enmascaradas en logs y reportes.
- **Persistencia Transaccional:** Todos los datos sobreviven al reinicio de la aplicación en `./data/atlas.sqlite`.
