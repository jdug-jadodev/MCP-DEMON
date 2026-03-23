# One Spec (Root Spec)

## Objetivo

Objetivo: Definir de forma práctica y reproducible la implementación completa de la Fase 1 "Núcleo funcional del servidor MCP" del proyecto `copilot-fs-mcp`.

Esta especificación sirve como manual operativo para que un desarrollador pueda implementar, compilar y verificar el servicio MCP mínimo que se ejecuta por stdio y expone las herramientas básicas (`read_file`, `write_file`, `list_directory`, `search_files`, `get_permissions`).

Resultado esperado al finalizar la Fase 1:
- Proyecto TypeScript que compila sin errores.
- Binario ejecutable `copilot-fs-mcp` que arranca un servidor MCP por stdio.
- Las 5 herramientas básicas implementadas y verificadas con un cliente MCP de prueba.

## Alcance / No alcance

Incluye (alcance):
- Inicializar el repositorio y configuración TypeScript (`tsconfig.json`).
- Instalar dependencias de desarrollo y runtime listadas en el plan.
- Implementar `src/index.ts` como punto de entrada que crea el servidor y transporte stdio.
- Implementar `src/server.ts` que registra las tools y enruta llamadas a `src/tools/*`.
- Implementar `src/tools/read-file.ts`, `write-file.ts`, `list-directory.ts`, `search-files.ts` y `get-permissions` (versión básica).
- Crear `src/permissions/config-loader.ts` que lee (si existe) `config.json` desde la ruta por defecto.
- Scripts NPM para `build`, `start`, `dev`, `lint`.
- Comprobar arranque y operación básica desde VSCode usando `npm link` y la configuración `mcp` mostrada en el plan.

No incluye (fuera de alcance para Fase 1):
- Motor de permisos completo (evaluador de reglas) — se añadirá en Fase 2.
- Auditoría y logs rotados (Fase 4).
- CLI interactiva avanzada (Fase 3).
- Publicación en npm y CI/CD (Fase 5).

## Definiciones (lenguaje de dominio)

- MCP: Model Context Protocol — protocolo para que el agente de Copilot llame herramientas externas.
- Tool / herramienta: función expuesta por el servidor MCP (ej. `read_file`).
- Transporte stdio: comunicación por entrada/salida estándar entre IDE y proceso local.
- Config: archivo `config.json` del usuario con permisos y seguridad (solo lectura en Fase 1).

## Principios / Reglas no negociables

- Local-first: el servidor corre 100% local, sin comunicación de red externa en Fase 1.
- Menor superficie de ataque: en Fase 1 no se exponen puertos ni credenciales.
- Fail-safe: ante error, el servidor debe devolver un error descriptivo al cliente MCP, no colapsar.
- Reproducible: todos los pasos para levantar el servicio deben ser explícitos y ejecutables.
- Tipado estricto: TypeScript con `strict` habilitado y esquemas para entradas/outputs.

## Límites

- Fase 1 no implementa validaciones de permisos (solo lectura de config); las herramientas acceden directamente al FS.
- No se maneja rotación de logs ni auditoría.
- No se publica el paquete en npm ni se configura CI/CD en esta fase.

## Eventos y estados (visión raíz)

Eventos clave que el servidor debe exponer y/o manejar:
- `startup` — proceso lanzado, servidor inicializando.
- `ready` — servidor conectado al transporte stdio y listo para recibir requests.
- `tool.call` — llegada de una llamada a una tool (contiene tool name y payload).
- `tool.response` — respuesta de ejecución o error devuelto al cliente MCP.
- `error.unhandled` — excepción global capturada; el proceso debe emitir un error y seguir vivo si es posible.
- `shutdown` — cierre ordenado del proceso (e.g., SIGINT).

Estados del servidor:
- `initializing` → `ready` → `running` → `shutting_down` → `stopped`.

## Criterios de aceptación (root)

Lista de criterios concretos para considerar completada la Fase 1:

1) Compilación TypeScript
- Ejecutar:  
	```bash
	npm install
	npm run build
	npx tsc --noEmit
	```
- Criterio: `npx tsc --noEmit` finaliza sin errores.

2) Punto de entrada y transporte
- `src/index.ts` crea una instancia del servidor MCP y usa transporte stdio.
- Ejecutar en modo desarrollo (sin vincular aún):
	```bash
	npm run build
	node dist/index.js
	```
- Criterio: el proceso arranca y permanece en espera (escucha stdin). Logs console indican `ready`.

3) Registro de herramientas
- `src/server.ts` registra 5 tools con schemas mínimos.
- Criterio: un cliente MCP de prueba puede solicitar la lista de herramientas y recibe los 5 nombres.

4) Implementación funcional de tools
- `read_file`: lee archivo y devuelve contenido (utf-8).
- `write_file`: escribe archivo creando directorios intermedios si es necesario.
- `list_directory`: lista entradas con tipo, tamaño y mtime.
- `search_files`: busca por patrón (usa `glob`) y opcionalmente filtra por contenido.
- `get_permissions`: devuelve `{ allowed: [], denied: [] }` en Fase 1.
- Criterio: invocar cada tool desde un cliente de pruebas (o cliente MCPE del SDK) devuelve resultado válido o error manejado.

5) Integración con VSCode (verificación manual)
- `npm link` para exponer el binario `copilot-fs-mcp`.
- Añadir configuración `mcp.servers.local-filesystem.command = "copilot-fs-mcp"` en `settings.json`.
- Criterio: GitHub Copilot Agent dentro de VSCode puede listar herramientas y ejecutar `list_directory` con éxito.

6) Calidad mínima de proyecto
- ESLint y Prettier configurados; `npm run lint` ejecutable.
- `package.json` contiene scripts `build`, `dev`, `start`, `lint`.
- Criterio: `npm run lint` no produce errores bloqueantes en archivos modificados.

Aceptación final: Todos los criterios 1..6 verificados manualmente o con tests básicos.

Plan de verificación (pasos concretos):
1. Clonar o estar en el directorio del proyecto.
2. Ejecutar `npm ci` o `npm install`.
3. Ejecutar `npm run build`.
4. Ejecutar `node dist/index.js` y verificar log `ready`.
5. Desde un cliente MCP de prueba (puede ser un script Node usando `@modelcontextprotocol/sdk`) solicitar `tools/list` y probar `read_file` con un archivo de prueba.

## Trazabilidad
**Mapeo de artefactos y tareas (Fase 1) con referencias al `work-plan.md`:**

- `src/index.ts`  ← (Work-plan 1.3)
- `src/server.ts` ← (Work-plan 1.4)
- `src/tools/read-file.ts` ← (Work-plan 1.5.1)
- `src/tools/write-file.ts` ← (Work-plan 1.5.2)
- `src/tools/list-directory.ts` ← (Work-plan 1.5.3)
- `src/tools/search-files.ts` ← (Work-plan 1.5.4)
- `src/tools/get-permissions.ts` ← (Work-plan 1.5.5)
- `src/permissions/config-loader.ts` ← (Work-plan 1.6)
- `package.json` scripts ← (Work-plan 1.2, 1.7)

Cada artefacto tiene criterios de aceptación ya definidos en `work-plan.md` (ver las tareas 1.1..1.7). Use esos criterios para validar la entrega.

Notas operativas y recomendaciones:
- Mantener `strict` en `tsconfig.json` desde el inicio para evitar deuda técnica.
- Priorizar tests unitarios mínimos para `read_file` y `list_directory` (leer archivos temporales creados en `tests/fixtures`).
- Evitar cambiar la API de las tools entre Fase 1 y Fase 2; la seguridad debe implementarse como una capa previa al acceso al FS, no en cada tool por separado.

Responsables sugeridos:
- Implementación inicial: desarrollador backend con conocimiento de Node.js y TypeScript.
- Revisión y pruebas: compañero con experiencia en seguridad de archivos (para la siguiente fase).

Riesgos y mitigaciones:
- Riesgo: Exposición accidental de rutas sensibles si se conecta a un cliente no confiable — Mitigación: restringir transporte a stdio (no iniciar HTTP) y añadir logs de acceso en próximas fases.
- Riesgo: errores de serialización/protocolo MCP — Mitigación: usar el SDK oficial `@modelcontextprotocol/sdk` para conexión y pruebas.

***
Especificación Fase 1 completada: seguir los pasos listados en "Criterios de aceptación" y aplicar la Fase 2 para añadir seguridad y auditoría.

