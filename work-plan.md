# Plan de Trabajo — copilot-fs-mcp
> Servidor MCP Local para GitHub Copilot · v1.0

---

## Índice de Fases

| # | Fase | Duración | Estado |
|:---:|---|---|:---:|
| 1 | Núcleo funcional del servidor MCP | 1 semana | ⬜ Pendiente |
| 2 | Motor de permisos y seguridad | 1 semana | ⬜ Pendiente |
| 3 | CLI de configuración interactiva | 1 semana | ⬜ Pendiente |
| 4 | Logs de auditoría | 3 días | ⬜ Pendiente |
| 5 | Publicación en npm + documentación | 4 días | ⬜ Pendiente |

---

## Leyenda de estado

- ⬜ Pendiente
- 🔄 En progreso
- ✅ Completado
- ❌ Bloqueado

---

---

# FASE 1 — Núcleo funcional del servidor MCP
> Objetivo: Servidor MCP mínimo y operativo que VSCode puede lanzar y usar via stdio.

---

## 1.1 Inicialización del proyecto

### Tareas

- [ ] **1.1.1** Crear el directorio raíz `copilot-fs-mcp/`
- [ ] **1.1.2** Ejecutar `npm init -y` para generar `package.json` base
- [ ] **1.1.3** Instalar TypeScript y configurar `tsconfig.json` con modo `strict`
  ```bash
  npm install -D typescript @types/node
  npx tsc --init
  ```
- [ ] **1.1.4** Configurar `tsconfig.json`:
  - `"target": "ES2022"`
  - `"module": "Node16"`
  - `"outDir": "./dist"`
  - `"rootDir": "./src"`
  - `"strict": true`
  - `"esModuleInterop": true`
- [ ] **1.1.5** Instalar ESLint y Prettier
  ```bash
  npm install -D eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin
  ```
- [ ] **1.1.6** Crear `.eslintrc.json` con reglas TypeScript strict
- [ ] **1.1.7** Crear `.prettierrc` con configuración base (singleQuote, semi, tabWidth: 2)
- [ ] **1.1.8** Crear `.gitignore` incluyendo `node_modules/`, `dist/`, `*.env`
- [ ] **1.1.9** Crear estructura de carpetas vacías según el plan:
  ```
  src/
  ├── index.ts
  ├── server.ts
  ├── permissions/
  ├── tools/
  ├── audit/
  └── cli/
  tests/
  ```

### Criterio de aceptación
> El proyecto compila sin errores con `npx tsc --noEmit`.

---

## 1.2 Instalación de dependencias principales

### Tareas

- [ ] **1.2.1** Instalar el SDK oficial de MCP:
  ```bash
  npm install @modelcontextprotocol/sdk
  ```
- [ ] **1.2.2** Instalar `zod` para validación de esquemas:
  ```bash
  npm install zod
  ```
- [ ] **1.2.3** Instalar `glob` para búsqueda de archivos:
  ```bash
  npm install glob
  npm install -D @types/glob
  ```
- [ ] **1.2.4** Verificar que todas las dependencias están en `package.json` con versiones fijas
- [ ] **1.2.5** Añadir scripts en `package.json`:
  - `"build": "tsc"`
  - `"dev": "tsc --watch"`
  - `"start": "node dist/index.js"`
  - `"lint": "eslint src/**/*.ts"`

### Criterio de aceptación
> `npm install` finaliza sin warnings de vulnerabilidades críticas.

---

## 1.3 Punto de entrada del servidor (`src/index.ts`)

### Tareas

- [ ] **1.3.1** Crear `src/index.ts` como punto de entrada del proceso Node.js
- [ ] **1.3.2** Importar y crear instancia del servidor MCP con el SDK:
  ```typescript
  import { Server } from '@modelcontextprotocol/sdk/server/index.js';
  import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
  ```
- [ ] **1.3.3** Instanciar el servidor con nombre `"copilot-fs-mcp"` y versión `"1.0.0"`
- [ ] **1.3.4** Inicializar el transporte stdio: `new StdioServerTransport()`
- [ ] **1.3.5** Conectar servidor y transporte: `await server.connect(transport)`
- [ ] **1.3.6** Añadir manejo de errores globals (`process.on('uncaughtException', ...)`)
- [ ] **1.3.7** Importar `server.ts` y ejecutar el setup de tools antes de conectar

### Criterio de aceptación
> `node dist/index.js` arranca sin errores y queda en espera en stdin.

---

## 1.4 Registro de herramientas MCP (`src/server.ts`)

### Tareas

- [ ] **1.4.1** Crear `src/server.ts` que exporta la función `setupServer(server: Server)`
- [ ] **1.4.2** Registrar el handler `ListToolsRequestSchema` que devuelve las 5 herramientas:
  - `read_file`
  - `write_file`
  - `list_directory`
  - `search_files`
  - `get_permissions`
- [ ] **1.4.3** Para cada herramienta, definir su `inputSchema` en JSON Schema con los campos requeridos
- [ ] **1.4.4** Registrar el handler `CallToolRequestSchema` con un switch por nombre de tool
- [ ] **1.4.5** Cada case del switch llama a la función exportada del módulo correspondiente en `src/tools/`
- [ ] **1.4.6** Manejar el caso `default` del switch devolviendo error `"Tool not found"`

### Criterio de aceptación
> El servidor responde correctamente a la solicitud `tools/list` desde un cliente MCP de prueba.

---

## 1.5 Implementación de las herramientas básicas (sin validación de permisos)

> En esta sub-fase las tools funcionan directamente sobre el sistema de archivos, sin restricciones. La seguridad se añade en la Fase 2.

### 1.5.1 Tool `read_file` (`src/tools/read-file.ts`)

- [ ] Aceptar parámetro `path: string`
- [ ] Leer el archivo con `fs.promises.readFile(path, 'utf-8')`
- [ ] Devolver el contenido como texto en el formato MCP de respuesta
- [ ] Manejar errores: archivo no encontrado, sin permisos de lectura del OS

### 1.5.2 Tool `write_file` (`src/tools/write-file.ts`)

- [ ] Aceptar parámetros `path: string` y `content: string`
- [ ] Crear directorios intermedios si no existen con `fs.promises.mkdir(..., { recursive: true })`
- [ ] Escribir el archivo con `fs.promises.writeFile(path, content, 'utf-8')`
- [ ] Devolver confirmación con bytes escritos
- [ ] Manejar errores: disco lleno, sin permisos del OS

### 1.5.3 Tool `list_directory` (`src/tools/list-directory.ts`)

- [ ] Aceptar parámetro `path: string`
- [ ] Leer el directorio con `fs.promises.readdir(path, { withFileTypes: true })`
- [ ] Para cada entrada, incluir: nombre, tipo (file/directory), tamaño, fecha de modificación
- [ ] Devolver el listado como array JSON serializado
- [ ] Manejar errores: ruta no es directorio, no existe

### 1.5.4 Tool `search_files` (`src/tools/search-files.ts`)

- [ ] Aceptar parámetros `rootPath: string`, `pattern: string`, `searchContent?: string`
- [ ] Usar `glob` para búsqueda por nombre de archivo
- [ ] Si `searchContent` está presente, filtrar los archivos cuyo contenido incluya la cadena
- [ ] Limitar resultados a 100 para evitar respuestas excesivamente grandes
- [ ] Devolver array de rutas absolutas encontradas

### 1.5.5 Tool `get_permissions`

- [ ] En esta fase, devolver un objeto vacío `{ allowed: [], denied: [] }`
- [ ] Se completará en Fase 2 para devolver la configuración real

### Criterio de aceptación de 1.5
> Cada tool puede invocarse manualmente desde un cliente MCP de prueba y devuelve datos reales del sistema de archivos.

---

## 1.6 Lector básico de `config.json` (`src/permissions/config-loader.ts`)

### Tareas

- [ ] **1.6.1** Crear `src/permissions/config-loader.ts`
- [ ] **1.6.2** Implementar función `getConfigPath(): string` que resuelve la ruta según OS:
  - Windows: `%APPDATA%\copilot-fs-mcp\config.json`
  - macOS/Linux: `~/.config/copilot-fs-mcp/config.json`
- [ ] **1.6.3** Implementar función `loadConfig()` que lee el JSON del disco
- [ ] **1.6.4** Si el archivo no existe, devolver una configuración por defecto con listas vacías
- [ ] **1.6.5** Definir el tipo TypeScript `Config` que refleja la estructura del JSON

### Criterio de aceptación
> `loadConfig()` retorna el objeto de configuración sin lanzar si el archivo no existe.

---

## 1.7 Verificación de conexión desde VSCode

### Tareas

- [ ] **1.7.1** Compilar el proyecto con `npm run build`
- [ ] **1.7.2** Configurar el campo `"bin"` en `package.json`:
  ```json
  { "bin": { "copilot-fs-mcp": "./dist/index.js" } }
  ```
- [ ] **1.7.3** Añadir shebang `#!/usr/bin/env node` como primera línea de `src/index.ts`
- [ ] **1.7.4** Ejecutar `npm link` en el directorio del proyecto para crear el binario global local
- [ ] **1.7.5** Añadir al `settings.json` de VSCode (usuario o workspace):
  ```json
  {
    "mcp": {
      "servers": {
        "local-filesystem": {
          "command": "copilot-fs-mcp",
          "args": []
        }
      }
    }
  }
  ```
- [ ] **1.7.6** Verificar en VSCode que el servidor MCP aparece como activo
- [ ] **1.7.7** Ejecutar una consulta simple a través de GitHub Copilot Agent que invoque `list_directory`
- [ ] **1.7.8** Confirmar que la respuesta llega correctamente sin errores de protocolo

### Criterio de aceptación
> GitHub Copilot Agent puede llamar a `list_directory` y recibir una respuesta válida en VSCode.

---

---

# FASE 2 — Motor de permisos y seguridad
> Objetivo: Ninguna operación llega al sistema de archivos sin haber pasado el motor de permisos completo.

---

## 2.1 Resolución y normalización de rutas (`src/permissions/path-resolver.ts`)

### Tareas

- [ ] **2.1.1** Crear `src/permissions/path-resolver.ts`
- [ ] **2.1.2** Implementar `expandHome(p: string): string`:
  - Reemplaza `~` por el directorio home real del usuario (`os.homedir()`)
  - Compatible con Windows (`%USERPROFILE%`) y Unix
- [ ] **2.1.3** Implementar `resolvePath(p: string): string`:
  - Llama a `expandHome` primero
  - Luego aplica `path.resolve()` para obtener ruta absoluta canónica
- [ ] **2.1.4** Implementar `isPathSafe(requestedPath: string, allowedBase: string): boolean`:
  - Resuelve ambas rutas con `resolvePath`
  - Verifica que `requestedPath` comience con `allowedBase + path.sep`
  - Devuelve `false` si el resultado resuelto no está bajo la base (bloquea `../`)
- [ ] **2.1.5** Escribir tests unitarios para `isPathSafe`:
  - Caso: ruta normal válida → `true`
  - Caso: `../` dentro de ruta permitida → `false`
  - Caso: ruta completamente fuera → `false`
  - Caso: ruta es exactamente la base → `true`
  - Caso: path traversal codificado → `false`

### Criterio de aceptación
> Los 5 casos de test unitario pasan. No hay forma de salir de una ruta base con `../`.

---

## 2.2 Validación del esquema de `config.json` con Zod

### Tareas

- [ ] **2.2.1** En `src/permissions/config-loader.ts`, definir el esquema Zod:
  ```typescript
  const PermissionEntrySchema = z.object({
    path: z.string().min(1),
    operations: z.array(z.enum(['read', 'write', 'list', 'search'])).min(1),
  });
  const ConfigSchema = z.object({
    version: z.string(),
    permissions: z.object({
      allowed: z.array(PermissionEntrySchema),
      denied: z.array(z.string()),
    }),
    security: z.object({
      maxFileSizeBytes: z.number().positive(),
      allowedExtensions: z.array(z.string()),
      logAllAccess: z.boolean(),
      logPath: z.string(),
    }),
  });
  ```
- [ ] **2.2.2** Aplicar `ConfigSchema.parse(rawJson)` en `loadConfig()` y lanzar error descriptivo si el JSON es inválido
- [ ] **2.2.3** Exportar el tipo `Config` inferido de Zod: `type Config = z.infer<typeof ConfigSchema>`
- [ ] **2.2.4** Testear con un `config.json` malformado para verificar que el error es claro y no crashea el proceso

### Criterio de aceptación
> Un `config.json` con campos faltantes lanza un error con el nombre del campo faltante, no un stack trace críptico.

---

## 2.3 Motor de evaluación de permisos (`src/permissions/evaluator.ts`)

### Tareas

- [ ] **2.3.1** Crear `src/permissions/evaluator.ts`
- [ ] **2.3.2** Definir tipo `Operation = 'read' | 'write' | 'list' | 'search'`
- [ ] **2.3.3** Definir tipo de resultado:
  ```typescript
  type PermissionResult =
    | { allowed: true }
    | { allowed: false; reason: string };
  ```
- [ ] **2.3.4** Implementar la función central `checkPermission(config, requestedPath, operation): PermissionResult` aplicando las 6 reglas en orden estricto:
  - **Regla 1**: Si la ruta resolvida coincide con alguna entrada en `denied` → `denied_path`
  - **Regla 2**: Si la ruta no está bajo ninguna entrada de `allowed` → `path_not_allowed`
  - **Regla 3**: Si la operación no está en el array de esa entrada → `operation_not_allowed`
  - **Regla 4**: Si `stat` del archivo supera `maxFileSizeBytes` → `file_too_large`
  - **Regla 5**: Si la extensión no está en `allowedExtensions` → `extension_not_allowed`
  - **Regla 6**: Devolver `{ allowed: true }`
- [ ] **2.3.5** La Regla 4 debe hacerse con `fs.promises.stat()` y manejar el caso de que el archivo no exista aún (para writes)
- [ ] **2.3.6** Para operaciones distintas a `read`/`write`, omitir la Regla 4 y 5 donde no apliquen (e.g., `list` no tiene extensión)

### Criterio de aceptación
> Se puede llamar a `checkPermission` directamente en tests y las 6 reglas se evalúan en el orden correcto.

---

## 2.4 Tests exhaustivos del motor de permisos

### Tareas

- [ ] **2.4.1** Crear `tests/permissions/evaluator.test.ts`
- [ ] **2.4.2** Test: ruta en `denied` → denegado aunque también esté en `allowed`
- [ ] **2.4.3** Test: ruta no en `allowed` → denegado
- [ ] **2.4.4** Test: ruta en `allowed` pero operación no permitida → denegado
- [ ] **2.4.5** Test: ruta y operación válidas, archivo dentro del límite de tamaño → permitido
- [ ] **2.4.6** Test: archivo supera `maxFileSizeBytes` → denegado con razón `file_too_large`
- [ ] **2.4.7** Test: extensión no permitida → denegado con razón `extension_not_allowed`
- [ ] **2.4.8** Test: path traversal `../../.ssh` desde ruta permitida → denegado
- [ ] **2.4.9** Test: ruta con `~` en config → se resuelve correctamente y permite
- [ ] **2.4.10** Test: múltiples entradas en `allowed` — se usa la más específica

### Criterio de aceptación
> Todos los tests pasan. Cobertura del motor de permisos > 95%.

---

## 2.5 Integración del motor en todas las tools

### Tareas

- [ ] **2.5.1** En `src/server.ts`, cargar la config con `loadConfig()` al iniciar y pasar el objeto a cada handler
- [ ] **2.5.2** En `src/tools/read-file.ts`: llamar `checkPermission(config, path, 'read')` antes de leer; si `!result.allowed` devolver error MCP con `result.reason`
- [ ] **2.5.3** En `src/tools/write-file.ts`: llamar `checkPermission(config, path, 'write')` antes de escribir
- [ ] **2.5.4** En `src/tools/list-directory.ts`: llamar `checkPermission(config, path, 'list')` antes de listar
- [ ] **2.5.5** En `src/tools/search-files.ts`: llamar `checkPermission(config, rootPath, 'search')` antes de buscar
- [ ] **2.5.6** Actualizar `get_permissions` para devolver la config real cargada (rutas y operaciones)
- [ ] **2.5.7** Verificar que las tools devuelven mensajes de error claros y no stack traces al ser denegadas

### Criterio de aceptación
> Intentar leer `~/.ssh/id_rsa` devuelve error `"denied_path"` y no el contenido del archivo.

---

## 2.6 Prueba de integración de seguridad

### Tareas

- [ ] **2.6.1** Crear `config.json` de prueba con una carpeta permitida y `~/.ssh` en `denied`
- [ ] **2.6.2** Desde un cliente MCP, intentar leer un archivo permitido → debe funcionar
- [ ] **2.6.3** Intentar leer `~/.ssh/id_rsa` → debe devolver error
- [ ] **2.6.4** Intentar path traversal `<ruta_permitida>/../../.ssh/id_rsa` → debe devolver error
- [ ] **2.6.5** Intentar escribir en una ruta marcada solo como `read` → debe devolver error

### Criterio de aceptación
> Los 5 intentos producen el resultado esperado (los 3 últimos denegados, el 1ro permitido).

---

---

# FASE 3 — CLI de configuración interactiva
> Objetivo: Un desarrollador puede configurar el servidor completamente desde terminal sin editar JSON a mano.

---

## 3.1 Instalación de dependencias de CLI

### Tareas

- [ ] **3.1.1** Instalar `commander` para parseado de comandos:
  ```bash
  npm install commander
  ```
- [ ] **3.1.2** Instalar `inquirer` para prompts interactivos:
  ```bash
  npm install inquirer
  npm install -D @types/inquirer
  ```
- [ ] **3.1.3** Crear `src/cli/index.ts` como punto de entrada del CLI
- [ ] **3.1.4** Configurar el programa principal con `commander`:
  ```typescript
  const program = new Command('copilot-fs-mcp');
  program.version('1.0.0').description('Local MCP server for GitHub Copilot filesystem access');
  ```
- [ ] **3.1.5** Modificar `src/index.ts` para que si hay argumentos en `process.argv`, delegue al CLI; si no, arranque el servidor MCP

### Criterio de aceptación
> `copilot-fs-mcp --help` muestra la lista de comandos disponibles.

---

## 3.2 Comando `init` — asistente de configuración inicial

### Tareas

- [ ] **3.2.1** Crear `src/cli/commands/init.ts`
- [ ] **3.2.2** Verificar si ya existe un `config.json` y preguntar si se desea sobreescribir
- [ ] **3.2.3** Prompt 1: solicitar lista de carpetas a permitir (separadas por coma)
- [ ] **3.2.4** Prompt 2: para cada carpeta, checkbox de operaciones permitidas (read, write, list, search)
- [ ] **3.2.5** Prompt 3: carpetas a denegar explícitamente (por defecto: `~/.ssh`, `~/.aws`)
- [ ] **3.2.6** Prompt 4: tamaño máximo de archivo en MB (por defecto: 5)
- [ ] **3.2.7** Prompt 5: extensiones permitidas (por defecto lista del plan)
- [ ] **3.2.8** Crear el directorio de configuración si no existe
- [ ] **3.2.9** Escribir `config.json` con los valores recogidos
- [ ] **3.2.10** Imprimir el snippet listo para pegar en `settings.json` de VSCode:
  ```
  Pega esto en settings.json:
  { "mcp": { "servers": { "local-filesystem": { "command": "copilot-fs-mcp" } } } }
  ```

### Criterio de aceptación
> Ejecutar `copilot-fs-mcp init` genera un `config.json` válido que pasa `ConfigSchema.parse()`.

---

## 3.3 Comando `add-path` — añadir ruta sin editar JSON

### Tareas

- [ ] **3.3.1** Crear `src/cli/commands/add-path.ts`
- [ ] **3.3.2** Aceptar argumento posicional `<path>` y opción `--ops` para operaciones
- [ ] **3.3.3** Si no se pasan `--ops`, mostrar checkbox interactivo de operaciones
- [ ] **3.3.4** Cargar `config.json` existente
- [ ] **3.3.5** Verificar que la ruta no esté ya en `allowed` (evitar duplicados)
- [ ] **3.3.6** Añadir la nueva entrada y guardar el JSON actualizado
- [ ] **3.3.7** Confirmar con output: `✓ Ruta añadida: ~/Proyectos/nuevo [read, list]`

### Criterio de aceptación
> `copilot-fs-mcp add-path ~/Proyectos/nuevo --ops read,list` actualiza el JSON sin corromperlo.

---

## 3.4 Comando `list` — mostrar configuración actual

### Tareas

- [ ] **3.4.1** Crear `src/cli/commands/list.ts`
- [ ] **3.4.2** Cargar y parsear `config.json`
- [ ] **3.4.3** Mostrar tabla de rutas permitidas con sus operaciones
- [ ] **3.4.4** Mostrar lista de rutas denegadas
- [ ] **3.4.5** Mostrar configuración de seguridad (tamaño máximo, extensiones)
- [ ] **3.4.6** Si no existe `config.json`, mostrar mensaje de ayuda: `"Ejecuta copilot-fs-mcp init para comenzar"`

### Criterio de aceptación
> `copilot-fs-mcp list` muestra la configuración actual en formato legible.

---

## 3.5 Comando `remove-path` — revocar acceso a una ruta

### Tareas

- [ ] **3.5.1** Crear `src/cli/commands/remove-path.ts`
- [ ] **3.5.2** Aceptar argumento posicional `<path>`
- [ ] **3.5.3** Cargar `config.json` y buscar la entrada exacta
- [ ] **3.5.4** Si no existe, mostrar error claro: `"Ruta no encontrada en la configuración"`
- [ ] **3.5.5** Pedir confirmación antes de eliminar: `? ¿Eliminar acceso a ~/Proyectos/viejo? (y/N)`
- [ ] **3.5.6** Guardar el JSON actualizado sin la entrada eliminada

### Criterio de aceptación
> Tras ejecutar `remove-path`, la ruta ya no aparece en `copilot-fs-mcp list`.

---

## 3.6 Comando `validate` — verificar integridad del `config.json`

### Tareas

- [ ] **3.6.1** Crear `src/cli/commands/validate.ts`
- [ ] **3.6.2** Cargar el JSON sin parsear con Zod
- [ ] **3.6.3** Aplicar `ConfigSchema.safeParse()` y mostrar errores detallados si los hay
- [ ] **3.6.4** Si es válido, mostrar: `✓ config.json es válido`
- [ ] **3.6.5** Verificar adicionalmente que las rutas en `allowed` existen en el sistema de archivos (warning, no error)

### Criterio de aceptación
> Un `config.json` con un campo faltante muestra el nombre exacto del campo que falta.

---

---

# FASE 4 — Logs de auditoría
> Objetivo: Registro completo y rotado de cada operación realizada por el servidor.

---

## 4.1 Módulo de logger (`src/audit/logger.ts`)

### Tareas

- [ ] **4.1.1** Crear `src/audit/logger.ts`
- [ ] **4.1.2** Definir la interfaz `AuditEntry`:
  ```typescript
  interface AuditEntry {
    ts: string;          // ISO 8601
    tool: string;        // nombre de la tool MCP
    path: string;        // ruta solicitada
    result: 'allowed' | 'denied';
    reason?: string;     // solo si denegado
    duration_ms: number;
  }
  ```
- [ ] **4.1.3** Implementar `getLogPath(): string` que lee `logPath` de la config (expandiendo `~`)
- [ ] **4.1.4** Implementar `writeAuditEntry(entry: AuditEntry): Promise<void>`:
  - Serializar a JSON Lines: `JSON.stringify(entry) + '\n'`
  - Añadir al archivo del día actual: `access-2026-03-23.jsonl`
  - Crear el directorio de logs si no existe
- [ ] **4.1.5** Usar `fs.promises.appendFile` para escritura no bloqueante

### Criterio de aceptación
> Tras una llamada a cualquier tool, se crea una línea en el archivo `.jsonl` del log.

---

## 4.2 Rotación automática de logs

### Tareas

- [ ] **4.2.1** Definir en config el campo `logRetentionDays` (por defecto: 30)
- [ ] **4.2.2** Implementar `rotateLogs(logDir: string, retentionDays: number): Promise<void>`:
  - Listar todos los `.jsonl` en el directorio de logs
  - Calcular la fecha límite: `hoy - retentionDays`
  - Eliminar los archivos cuya fecha en el nombre sea anterior al límite
- [ ] **4.2.3** Llamar a `rotateLogs` al arrancar el servidor (en `src/index.ts`)
- [ ] **4.2.4** Manejar errores en la rotación sin que interrumpan el arranque del servidor

### Criterio de aceptación
> Los archivos de log con más de `retentionDays` días se eliminan automáticamente al arrancar.

---

## 4.3 Integración del logger en las tools

### Tareas

- [ ] **4.3.1** En `src/server.ts`, inyectar el logger en todos los handlers de tools
- [ ] **4.3.2** Medir `duration_ms` con `Date.now()` antes y después de cada operación
- [ ] **4.3.3** Llamar a `writeAuditEntry` tanto cuando la operación es permitida como cuando es denegada
- [ ] **4.3.4** Si `logAllAccess` es `false` en la config, registrar solo los accesos denegados
- [ ] **4.3.5** Verificar que un fallo al escribir el log no interrumpe la operación principal (try/catch independiente)

### Criterio de aceptación
> Una operación denegada aparece en el log con `result: "denied"` y el `reason` correcto.

---

## 4.4 Comando `logs` de CLI

### Tareas

- [ ] **4.4.1** Crear `src/cli/commands/logs.ts`
- [ ] **4.4.2** Por defecto, mostrar las últimas 50 entradas del log del día actual
- [ ] **4.4.3** Opción `--date YYYY-MM-DD` para ver logs de un día específico
- [ ] **4.4.4** Opción `--denied` para filtrar solo operaciones denegadas
- [ ] **4.4.5** Opción `--tail N` para mostrar las últimas N entradas
- [ ] **4.4.6** Formatear la salida en tabla legible (no JSON crudo)

### Criterio de aceptación
> `copilot-fs-mcp logs --denied` muestra solo las operaciones bloqueadas del día.

---

---

# FASE 5 — Publicación en npm + documentación
> Objetivo: Paquete instalable públicamente con documentación completa y pipeline CI/CD.
> **Estado actual:** Proyecto funcional con permisos, backups y tests. Faltan archivos de publicación.

---

## 5.1 Archivos de licencia y seguridad (CRÍTICO)

### Tareas

- [ ] **5.1.1** Crear archivo `LICENSE` con texto MIT:
  ```text
  MIT License
  
  Copyright (c) 2026 [Tu Nombre]
  
  Permission is hereby granted, free of charge, to any person obtaining a copy...
  ```
- [ ] **5.1.2** Crear `SECURITY.md` con política de seguridad:
  ```markdown
  # Security Policy
  
  ## Supported Versions
  | Version | Supported          |
  | ------- | ------------------ |
  | 1.x     | :white_check_mark: |
  
  ## Reporting a Vulnerability
  Please report security vulnerabilities to [email] or create a private security advisory.
  ```
- [ ] **5.1.3** Crear `CHANGELOG.md` con la primera release:
  ```markdown
  # Changelog
  
  ## [1.0.0] - 2026-03-23
  
  ### Added
  - Sistema de permisos granular con reglas allow/deny
  - Backup automático antes de modificaciones
  - 7 herramientas MCP (read, write, list, search, get_permissions, list_backups, restore_backup)
  - Validación de path traversal
  - Tests de seguridad e integración
  - Logging configurable
  - Hot-reload de configuración
  ```
- [ ] **5.1.4** Verificar que `LICENSE` está en encoding UTF-8 sin BOM

### Criterio de aceptación
> Los tres archivos existen y son válidos. `npm pack` no muestra warnings sobre licencia.

---

## 5.2 Configuración de `.npmignore` para limpieza del paquete

### Tareas

- [ ] **5.2.1** Crear `.npmignore` excluyendo archivos de desarrollo:
  ```
  # Código fuente (ya está compilado en dist/)
  src/
  tests/
  
  # Configuración de desarrollo
  .eslintrc.json
  .prettierrc
  tsconfig.json
  
  # Archivos de proyecto internos
  cambios-registro.md
  monitor.cjs
  mcp-development-plan.md
  ONE_SPEC.md
  work-plan.md
  
  # Outputs de herramientas
  coverage/
  .mcp-backups/
  *.test.ts
  
  # CI/CD
  .github/
  
  # Git
  .git/
  .gitignore
  ```
- [ ] **5.2.2** Ejecutar `npm pack --dry-run` y verificar el output:
  ```bash
  npm pack --dry-run
  ```
- [ ] **5.2.3** Confirmar que SOLO se incluyen:
  - `dist/` (código compilado)
  - `README.md`
  - `LICENSE`
  - `BACKUPS.md` (documentación de feature)
  - `config.example.json` (referencia para usuarios)
  - `package.json`
- [ ] **5.2.4** Verificar que el tamaño total sea < 500KB (sin node_modules)

### Criterio de aceptación
> `npm pack --dry-run` muestra exactamente 6 items: dist/, README.md, LICENSE, BACKUPS.md, config.example.json, package.json

---

## 5.3 Actualización completa de `package.json`

### Tareas

- [ ] **5.3.1** Actualizar versión a `1.0.0` (actualmente es `0.1.0`)
- [ ] **5.3.2** Actualizar description a versión final:
  ```json
  "description": "Secure MCP server for controlled filesystem access from GitHub Copilot with automatic backups"
  ```
- [ ] **5.3.3** Añadir campos de repositorio (ajustar con tu info real):
  ```json
  "author": "Tu Nombre <tu@email.com>",
  "homepage": "https://github.com/tu-usuario/copilot-fs-mcp#readme",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/tu-usuario/copilot-fs-mcp.git"
  },
  "bugs": {
    "url": "https://github.com/tu-usuario/copilot-fs-mcp/issues"
  }
  ```
- [ ] **5.3.4** Expandir keywords para mejor descubrimiento:
  ```json
  "keywords": [
    "mcp",
    "copilot",
    "filesystem",
    "github-copilot",
    "ai-tools",
    "model-context-protocol",
    "vscode",
    "backup",
    "security",
    "permissions"
  ]
  ```
- [ ] **5.3.5** Actualizar campo `files` para incluir LICENSE:
  ```json
  "files": [
    "dist/",
    "README.md",
    "LICENSE",
    "BACKUPS.md",
    "config.example.json"
  ]
  ```
- [ ] **5.3.6** Añadir script `prepublishOnly` para validación pre-publicación:
  ```json
  "scripts": {
    "prepublishOnly": "npm run build && npm test && npm run lint"
  }
  ```
- [ ] **5.3.7** Verificar que `engines.node` está correcto: `">=18.0.0"` (ya está)
- [ ] **5.3.8** Validar con `npm pkg fix` para corregir problemas automáticamente

### Criterio de aceptación
> `npm pkg validate` no muestra errores. Todos los campos obligatorios están presentes.

---

## 5.4 Mejoras finales del `README.md`

### Tareas

- [ ] **5.4.1** Añadir badges al inicio del README:
  ```markdown
  # 🚀 Copilot FS MCP
  
  [![npm version](https://badge.fury.io/js/copilot-fs-mcp.svg)](https://www.npmjs.com/package/copilot-fs-mcp)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js Version](https://img.shields.io/node/v/copilot-fs-mcp)](https://nodejs.org)
  ```
- [ ] **5.4.2** Añadir sección de instalación global:
  ```markdown
  ## 📦 Installation
  
  ### Global installation (recommended)
  ```bash
  npm install -g copilot-fs-mcp
  ```
  
  ### npx (no installation)
  ```bash
  npx copilot-fs-mcp
  ```
  ```
- [ ] **5.4.3** Añadir sección de Quick Start con pasos numerados:
  ```markdown
  ## 🚀 Quick Start
  
  1. Install globally:
     ```bash
     npm install -g copilot-fs-mcp
     ```
  
  2. Configure VSCode `settings.json`:
     ```json
     {
       "mcp": {
         "servers": {
           "local-filesystem": {
             "command": "copilot-fs-mcp",
             "args": ["--config", "ruta/a/config.json"]
           }
         }
       }
     }
     ```
  
  3. Create your config file (see Configuration section below)
  ```
- [ ] **5.4.4** Añadir ejemplos de configuración completos con comentarios
- [ ] **5.4.5** Añadir sección de troubleshooting común:
  ```markdown
  ## 🔧 Troubleshooting
  
  ### Server not connecting
  - Verify the path to config.json is absolute
  - Check VSCode Developer Tools Console for errors
  
  ### Permission denied errors
  - Check your config.json allows the path and operation
  - Verify paths use forward slashes or escaped backslashes
  ```
- [ ] **5.4.6** Añadir tabla comparativa de herramientas con ejemplos de uso
- [ ] **5.4.7** Documentar todas las opciones de línea de comandos disponibles
- [ ] **5.4.8** Añadir sección "Contributing" con enlace a issues

### Criterio de aceptación
> Un usuario nuevo puede instalar y configurar el servidor en menos de 5 minutos siguiendo solo el README.

---

## 5.5 Tests de validación pre-publicación

### Tareas

- [ ] **5.5.1** Ejecutar suite completa de validaciones:
  ```bash
  npm run lint        # Sin errores de linting
  npm test            # Todos los tests pasan
  npm run build       # Compilación sin errores
  npm audit           # Sin vulnerabilidades High/Critical
  ```
- [ ] **5.5.2** Verificar que el paquete compila correctamente:
  ```bash
  npm run build
  ls dist/  # Debe mostrar index.js y todas las carpetas
  ```
- [ ] **5.5.3** Verificar que el shebang está presente en dist/index.js:
  ```bash
  head -n 1 dist/index.js  # Debe mostrar: #!/usr/bin/env node
  ```
- [ ] **5.5.4** Simular instalación local:
  ```bash
  npm pack
  # Genera copilot-fs-mcp-1.0.0.tgz
  npm install -g ./copilot-fs-mcp-1.0.0.tgz
  which copilot-fs-mcp  # Debe mostrar la ruta instalada
  ```
- [ ] **5.5.5** Probar ejecución del binario instalado:
  ```bash
  copilot-fs-mcp --help  # Debe mostrar ayuda
  copilot-fs-mcp --version  # Debe mostrar 1.0.0
  ```
- [ ] **5.5.6** Verificar tamaño del paquete:
  ```bash
  du -sh copilot-fs-mcp-1.0.0.tgz  # Debe ser < 100KB
  ```
- [ ] **5.5.7** Desinstalar después de las pruebas:
  ```bash
  npm uninstall -g copilot-fs-mcp
  ```

### Criterio de aceptación
> Todas las validaciones pasan. El paquete se instala, ejecuta y desinstala sin errores.

---

## 5.6 Pipeline CI/CD con GitHub Actions (OPCIONAL)

### Tareas

- [ ] **5.6.1** Crear directorio `.github/workflows/`
- [ ] **5.6.2** Crear `.github/workflows/ci.yml`:
  ```yaml
  name: CI
  
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
  
  jobs:
    test:
      runs-on: ${{ matrix.os }}
      strategy:
        matrix:
          node-version: [18, 20, 22]
          os: [ubuntu-latest, windows-latest, macos-latest]
      
      steps:
        - uses: actions/checkout@v4
        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: ${{ matrix.node-version }}
        - run: npm ci
        - run: npm run lint
        - run: npm test
        - run: npm run build
        - run: npm audit --production
  ```
- [ ] **5.6.3** Crear `.github/workflows/publish.yml`:
  ```yaml
  name: Publish to npm
  
  on:
    push:
      tags:
        - 'v*'
  
  jobs:
    publish:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            registry-url: 'https://registry.npmjs.org'
        - run: npm ci
        - run: npm test
        - run: npm run build
        - run: npm publish --access public
          env:
            NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
  ```
- [ ] **5.6.4** Configurar secreto `NPM_TOKEN` en GitHub:
  - Ir a npmjs.com → Account → Access Tokens
  - Crear token de tipo "Automation"
  - Añadirlo a GitHub Secrets del repositorio
- [ ] **5.6.5** Hacer commit y push de los workflows
- [ ] **5.6.6** Verificar que el workflow CI se ejecuta automáticamente

### Criterio de aceptación
> El workflow CI se ejecuta en push y todos los jobs pasan. (Este paso es opcional pero recomendado)

---

## 5.7 Publicación en npm

### Tareas

- [ ] **5.7.1** Asegurarse de tener cuenta en npmjs.com
- [ ] **5.7.2** Login en npm desde la terminal:
  ```bash
  npm login
  # Ingresar username, password, email
  ```
- [ ] **5.7.3** Verificar identidad:
  ```bash
  npm whoami  # Debe mostrar tu username
  ```
- [ ] **5.7.4** Validar que el nombre del paquete está disponible:
  ```bash
  npm view copilot-fs-mcp  # Si no existe, está disponible
  ```
- [ ] **5.7.5** Hacer dry-run de publicación:
  ```bash
  npm publish --dry-run
  # Verificar los archivos que se publicarán
  ```
- [ ] **5.7.6** Publicar el paquete (ESTE ES EL PASO REAL):
  ```bash
  npm publish --access public
  ```
- [ ] **5.7.7** Verificar en npmjs.com que el paquete está publicado
- [ ] **5.7.8** Crear git tag con la versión:
  ```bash
  git tag v1.0.0
  git push origin v1.0.0
  ```
- [ ] **5.7.9** Crear GitHub Release con las notas del CHANGELOG

### Criterio de aceptación
> El paquete aparece en https://www.npmjs.com/package/copilot-fs-mcp y se puede instalar con `npm install -g copilot-fs-mcp`

---

## 5.8 Pruebas post-publicación

### Tareas

- [ ] **5.8.1** En una máquina limpia (o usar una VM/contenedor), instalar desde npm:
  ```bash
  npm install -g copilot-fs-mcp
  ```
- [ ] **5.8.2** Verificar que el binario está disponible:
  ```bash
  copilot-fs-mcp --version
  copilot-fs-mcp --help
  ```
- [ ] **5.8.3** Crear un config.json de prueba
- [ ] **5.8.4** Configurar VSCode con el servidor instalado globalmente
- [ ] **5.8.5** Probar las 7 herramientas desde GitHub Copilot Agent
- [ ] **5.8.6** Verificar que los backups funcionan correctamente
- [ ] **5.8.7** Probar en diferentes sistemas operativos:
  - Windows (PowerShell y CMD)
  - macOS (si disponible)
  - Linux (si disponible)
- [ ] **5.8.8** Documentar cualquier problema encontrado en GitHub Issues

### Criterio de aceptación
> La instalación desde npm funciona en todos los sistemas probados. Las 7 herramientas responden correctamente.

---

---

## 5.9 Checklist final de publicación

### Antes de `npm publish`:

- [ ] ✅ `npm audit` sin vulnerabilidades High/Critical
- [ ] ✅ `npm test` - todos los tests pasan
- [ ] ✅ `npm run lint` - sin errores de linting
- [ ] ✅ `npm run build` - compilación exitosa
- [ ] ✅ `npm pack --dry-run` - verifica archivos incluidos
- [ ] ✅ Archivo `LICENSE` existe
- [ ] ✅ Archivo `SECURITY.md` existe
- [ ] ✅ Archivo `CHANGELOG.md` existe con v1.0.0
- [ ] ✅ Archivo `.npmignore` configurado
- [ ] ✅ `package.json` tiene todos los campos (author, repository, bugs, homepage)
- [ ] ✅ README.md tiene badges y documentación completa
- [ ] ✅ Shebang presente en `dist/index.js`
- [ ] ✅ Version en package.json es `1.0.0`
- [ ] ✅ Estás logueado en npm (`npm whoami`)

### Después de `npm publish`:

- [ ] ✅ Verificar en https://www.npmjs.com/package/copilot-fs-mcp
- [ ] ✅ Probar instalación: `npm install -g copilot-fs-mcp`
- [ ] ✅ Crear git tag: `git tag v1.0.0 && git push origin v1.0.0`
- [ ] ✅ Crear GitHub Release con notas del CHANGELOG
- [ ] ✅ Probar en máquina limpia o VM
- [ ] ✅ Anunciar en redes sociales / comunidades relevantes

---

---

## Resumen de criterios de calidad global

| Criterio | Meta | Estado Actual |
|---|---|---|
| Cobertura de tests (motor de permisos) | > 95% | ✅ Implementado |
| Cobertura de tests (general) | > 80% | ✅ Implementado |
| Vulnerabilidades npm audit | 0 High/Critical | ✅ 0 vulnerabilidades |
| Path traversal bloqueado | 100% de casos | ✅ Implementado |
| Tiempo de instalación en limpio | < 5 min | ⏳ Por probar |
| Tamaño del paquete npm | < 500 KB | ⏳ Por probar |
| Shebang en ejecutable | Obligatorio | ✅ Presente |
| Node.js version | >= 18.0.0 | ✅ Configurado |

---

## Archivos faltantes para publicación

| Archivo | Estado | Prioridad | Bloqueante |
|---------|--------|-----------|------------|
| `LICENSE` | ❌ Falta | 🔴 Alta | ✅ Sí |
| `SECURITY.md` | ❌ Falta | 🟡 Media | ❌ No |
| `CHANGELOG.md` | ❌ Falta | 🟡 Media | ❌ No |
| `.npmignore` | ❌ Falta | 🔴 Alta | ✅ Sí |
| CI/CD workflows | ❌ Falta | 🟢 Baja | ❌ No |

---

*Plan de Trabajo — copilot-fs-mcp v1.0 | Actualizado el 23/03/2026*
*Basado en análisis detallado del proyecto actual*
