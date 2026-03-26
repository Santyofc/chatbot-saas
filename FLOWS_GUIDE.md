# Bot Zona Sur Tech - Guia de Flujos

## Estructura Actual

```
src/
├── app.ts
├── flows/
│   ├── entry.flow.ts
│   ├── fallback.flow.ts
│   └── main-conversation.flow.ts
└── utils/
    └── intent-router.ts
```

## Base de Datos

- El proyecto usa `@builderbot/database-json` para desarrollo y pruebas locales.
- El archivo de estado local `db.json` esta ignorado en git y no debe subirse al repositorio.

## Flujos Principales

### `entry.flow.ts`
- Redirige cualquier mensaje entrante al flujo conversacional principal.

### `main-conversation.flow.ts`
- Detecta intenciones como saludo, web, automatizacion, facturacion, soporte, media e informacion.
- Maneja menus contextuales y pasos guiados para tramites e identificacion.
- Conserva estado conversacional entre mensajes.

### `fallback.flow.ts`
- Da respuestas de recuperacion cuando no hay coincidencia clara.
- Reenvia la conversacion al flujo principal para continuar el contexto.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run test:conversation
```

## Endpoints HTTP

```text
POST /v1/messages
POST /v1/blacklist
GET  /v1/blacklist/list
```

## Notas

- El build usa `esbuild` para empaquetar `src/app.ts` en `dist/app.js`.
- Si cambias la version de WhatsApp Web, actualizala en `src/app.ts`.
- Los flows legacy `welcome`, `info`, `support`, `billing` y `media` siguen en el repo como referencia, pero la app activa usa el flujo conversacional principal.
