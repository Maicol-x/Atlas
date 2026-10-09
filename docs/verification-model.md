# Atlas — Modelo de Verificación Técnica

Atlas define un sistema formal de 5 estados para evaluar si una especificación técnica de requisitos se cumple en un proyecto de software:

```
                          ┌──────────────────────────┐
                          │   Requisito de Entrada   │
                          └────────────┬─────────────┘
                                       │
                         [Análisis Estático y AST]
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 │                                           │
       ¿Existen Evidencias?                        ¿Hay Ejecución Dinámica?
         ├── Sí (Archivos, símbolos)                 ├── Exit 0 (Aprobado)
         └── No (Sin rastro alguno)                  └── Exit != 0 (Fallo reproducible)
```

## Definición Canónica de Estados

### 1. `VERIFICADO`
- **Criterio:** Existe evidencia concreta y reproducible de que el requisito está implementado.
- **Evidencias Requeridas:** Símbolos en el árbol de sintaxis abstracta (AST) o pruebas dinámicas exitosas (código de salida 0) o configuraciones completas de manifiesto.
- **Límite:** No garantiza la ausencia de bugs lógicos no cubiertos por la especificación.

### 2. `FALLIDO`
- **Criterio:** Una comprobación ejecutable y reproducible demuestra que el requisito o prueba falla.
- **Evidencias Requeridas:** Salida estándar o de error (`stderr`) con traza de aserción fallida o código de salida del proceso diferente de 0.

### 3. `INCOMPLETO`
- **Criterio:** Existe una implementación parcial, pero falta una parte esencial para considerarla verificada (por ejemplo, existe la interfaz o archivo pero no las pruebas de integración, o faltan validaciones).
- **Evidencias Requeridas:** Fragmentos de código donde se identifican estructuras preliminares o referencias desconectadas.

### 4. `NO_VERIFICABLE`
- **Criterio:** La evidencia disponible dentro del repositorio inspeccionado no permite llegar a una conclusión fundada (por ejemplo, requiere infraestructura en la nube o credenciales externas no suministradas).

### 5. `NO_IMPLEMENTADO`
- **Criterio:** Las comprobaciones y búsquedas sintácticas no encontraron rastro de implementación.
- **Regla Fundamental:** *No confundir ausencia de evidencia con prueba definitiva de ausencia.*
