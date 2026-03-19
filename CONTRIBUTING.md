# Guía de Contribución (CONTRIBUTING)

Gracias por considerar contribuir a esta aplicación clínica. A continuación, el flujo de trabajo esperado y los estándares del proyecto.

## 1. ¿Cómo agregar un nuevo componente de UI?
1. Crea el componente en `src/components/` o un subdirectorio lógico.
2. Mantén los componentes funcionales (`React.FC`) e interactúa con el estado global únicamente a través de los _custom hooks_ de los contextos correspondientes (ej. `useRecordContext()`).
3. Evita pasar propiedades complejas (Prop Drilling) a más de dos niveles de profundidad. Si necesitas props masivos, significa que el hijo debería consumir el Contexto directamente o la estructura necesita ser repensada.
4. **CSS:** Utiliza clases utilitarias de *Tailwind CSS* (`index.css` carga Tailwind). No escribas CSS en línea (`style={{}}`) a menos que haya renderizado dinámico matemático en el layout.

## 2. ¿Cómo agregar una nueva funcionalidad lógica compleja?
Si tu código involucra mutación de datos fuera de la renderización pura:
1. Crea las funciones lógicas puras dentro de `src/utils/` (sin estado de React). Escribe su respectivo archivo `.test.ts`.
2. Si requiere interactuar con el estado de React y ciclos de vida (`useEffect`), conéctalo mediante un hook en `src/hooks/useNuevoHook.ts`.

## 3. ¿Cómo añadir un plugin/botón a la Toolbar de Edición?
El editor visual es crítico. Si quieres agregar funcionalidad (ej. negritas, insertar firmas rápidas):
1. Asegúrate de modificar `src/hooks/useToolbarCommands.ts` (aquí reside la ejecución del `document.execCommand` y selecciones).
2. Añade el botón iterativo en `src/components/EditorToolbar.tsx`.

## 4. Pruebas Unitarias (Vitest)
Cualquier función utilitaria nueva *DEBE* tener cobertura.
- Ejecuta pruebas usando `npm run test` (o `vitest run`).
- Componentes interactivos complejos requieren una prueba en `src/tests/` utilizando `@testing-library/react`. 

## 5. Reglas de TypeScript
- El proyecto corre en `strict: true`. **No usar _any_**. Define interfaces precisas en `types.ts` si el modelo se usa en varios archivos. Fallar la tipificación no será tolerado en los `builds`.

## 6. Manejo de Errores de API
Si invocas red (ej. Drive, Gemini), el error debe encapsularse, notificarse visualmente al usuario si es fatal (mediante alertas manejadas por el ErrorUtils) y registrarse por consola. No uses `throw new Error()` desnudos si la UI no sabe atraparlos (si es fatal y afecta la re-renderización, usa Error Boundaries o el UI local).
