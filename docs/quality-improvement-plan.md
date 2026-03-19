# Plan de mejora incremental de calidad técnica

## Objetivo
Evolucionar el sistema de forma segura y gradual hacia una arquitectura más modular, robusta, mantenible y escalable, sin introducir cambios de alto riesgo en un solo ciclo.

## Principios de ejecución
- **Incrementalidad:** cambios pequeños, reversibles y fáciles de revisar.
- **Seguridad operativa:** cada paso con validaciones automatizadas mínimas.
- **Bajo acoplamiento:** mover reglas de negocio y efectos secundarios fuera de componentes grandes.
- **Estandarización:** utilidades compartidas para evitar duplicación.
- **Observabilidad:** errores con mensajes claros y puntos únicos de manejo.

## Línea base (actual)
- `App.tsx` concentra múltiples responsabilidades (estado UI, persistencia, integración IA, operaciones de archivo).
- Falta una hoja de ruta explícita para refactors por etapas.
- La compilación de tests puede romperse por dependencias de entorno (ej. `import.meta.env`) si no se abstraen correctamente.

## Roadmap por fases

### Fase 1 — Estabilización de base (1-2 PRs)
1. Asegurar que `npm run build` y `npm run test:build` sean verdes.
2. Eliminar accesos directos frágiles a `import.meta.env` en módulos transversales.
3. Consolidar constantes y llaves de configuración compartidas.

**Criterio de salida:** pipeline local estable en build + typecheck de tests.

### Fase 2 — Modularización de dominio (2-4 PRs)
1. Extraer casos de uso de `App.tsx` a hooks/servicios:
   - gestión de settings,
   - flujo de guardado/exportación,
   - coordinación de IA.
2. Definir interfaces de entrada/salida para cada módulo.
3. Reducir lógica inline en componentes presentacionales.

**Criterio de salida:** `App.tsx` actúa principalmente como orquestador.

### Fase 3 — Robustez funcional (2-3 PRs)
1. Añadir validaciones defensivas en fronteras (Drive/IA/Storage).
2. Normalizar manejo de errores con utilitario común.
3. Crear pruebas unitarias para utilidades críticas y regresiones conocidas.

**Criterio de salida:** fallos esperables con mensajes explícitos y cobertura focalizada.

### Fase 4 — Escalabilidad y performance (2+ PRs)
1. Analizar bundle y aplicar code-splitting donde aporte valor.
2. Evaluar memoización selectiva y reducción de renders.
3. Formalizar límites de tamaño y complejidad por módulo.

**Criterio de salida:** menor costo de carga y crecimiento más predecible.

## Convenciones de implementación por PR
- 1 objetivo técnico principal por PR.
- Incluir “riesgos y rollback” en la descripción.
- Agregar o ajustar pruebas del área tocada.
- Evitar refactors masivos sin red de seguridad.

## Métricas sugeridas
- Tiempo de build.
- % de PRs con tests verdes al primer intento.
- Tamaño promedio de `App.tsx` y módulos críticos.
- Número de utilidades compartidas vs lógica duplicada.

## Estado actual (marzo 2026)
- ✅ **Fase 1 completada**: build y typecheck de tests estables; accesos frágiles a entorno reducidos.
- ✅ **Fase 2 completada**: casos de uso de settings e IA extraídos a hooks/utilidades.
- ✅ **Fase 3 completada**: manejo de errores unificado para flujos de Drive + cobertura unitaria para estrategia de errores.
- 🚧 **Fase 4 iniciada**: primera partición de bundle con carga diferida de `CartolaMedicamentosView`.
