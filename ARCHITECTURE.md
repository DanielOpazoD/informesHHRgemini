# Arquitectura del Sistema: Clinical Records App

Este documento detalla la estructura y el flujo de datos de la aplicación "Cartola de Medicamentos e Informes Médicos".

## 1. Patrón General: Separación de Responsabilidades
La aplicación está construida sobre React (con TypeScript y Vite) y sigue una arquitectura orientada a **Contextos (Global State)**, **Hooks (Lógica de Negocio)** y **Utilidades Puras**.

### Capas del Proyecto (`src/`)
- **/components:** Contiene la interfaz de usuario (React Components). Aquí NO reside la lógica pesada de lectura de base de datos ni llamadas complejas; solo la lógica de presentación y visual. Excepción: Componentes interactivos complejos como `AIAssistant` que usan hooks propios.
- **/contexts:** Proveedores de estado global (`RecordContext`, `AuthContext`, `DriveContext`).
- **/hooks:** Abstracciones reutilizables de lógica React (`useDriveModals`, `useToolbarCommands`). Sirven de puente visual-lógico.
- **/utils:** Funciones puras (sin React) orientadas al procesamiento sincrónico o promesas simples estáticas (ej: `geminiClient`, `pdfGenerator`, `dateUtils`).

## 2. Flujo de Datos Principal (RecordContext)
El estado de la "Ficha Clínica Actual" (el paciente que se está editando) reside centralmente en `RecordContext`.
1. La UI (ej. `ClinicalRecordEditor`) lee los datos mediante `useRecordContext()`.
2. Las mutaciones al texto clínico o parámetros (ej. edad, sexo) llaman a las funciones que provee el hook de este contexto (`updateField`, `saveRecord`).
3. El Contexto se encarga de guardar automáticamente en `localStorage` o disparar subscripciones útiles en forma debounced.

## 3. Manejo de Almacenamiento y Archivos Remotos
1. **Google Drive:** Su autenticación y cliente yacen en `AuthContext` y `DriveContext`.
2. **Selector de Archivos:** Las interacciones con *Google Picker* para abrir o guardar JSONs se gestionan a través del hook encapsulado `useDriveModals()`.
3. **Persistencia Local:** `RecordContext` utiliza `localStorage` para un borrador offline, recuperable si la sesión del navegador se cierra.

## 4. IA Asistida (Gemini API)
La capa de Inteligencia Artificial actúa independientemente:
- **`geminiClient.ts`:** Se encarga de formatear _prompts_ y manejar la latencia/errores de red contra la API de Google Gemini (maneja Rate Limits 429 y _Fallbacks_).
- El usuario proporciona la _API Key_ en la interfaz, la cual se persiste de forma segura (sólo local) vía `settingsStorage.ts`.

## 5. Decisiones de Renderizado y Rutas
Se usa `react-router-dom` para separar vistas pesadas:
- `/` (Home): El editor de clínica principal (AppShell).
- `/cartola`: La visualización histórica de prescripciones (CartolaMedicamentosView).
