# Plan de Desarrollo
# Servidor MCP Local para GitHub Copilot

> Acceso seguro al sistema de archivos local desde agentes de IA

| Campo | Detalle |
|---|---|
| Versión | 1.0 |
| Tecnología | TypeScript / Node.js |
| Distribución | npm (paquete global) |
| Compatibilidad | Windows / macOS / Linux |
| Duración estimada | 5 semanas |

---

## 1. Resumen Ejecutivo

Este documento define el plan completo para construir, publicar y mantener un servidor MCP (Model Context Protocol) que se ejecuta localmente en la máquina del desarrollador, permitiendo a GitHub Copilot acceder de forma segura y controlada al sistema de archivos fuera del proyecto activo.

A diferencia de los servidores MCP en la nube, este paquete corre como un proceso local lanzado directamente por el IDE mediante stdio, sin necesidad de infraestructura externa, sin puertos expuestos a internet y con permisos definidos 100% por el usuario en un archivo de configuración personal.

> **Propuesta de valor central**
>
> - El desarrollador instala un paquete npm global una sola vez y lo configura con sus rutas personales.
> - GitHub Copilot puede leer, escribir, listar y buscar archivos en exactamente las carpetas autorizadas.
> - Ningún dato sale de la máquina local. El servidor no requiere red, cuenta ni API key.

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de flujo

El servidor actúa como intermediario entre el agente de Copilot y el sistema de archivos local. El IDE lanza el proceso mediante npx y se comunica por stdio siguiendo el protocolo MCP estándar.

```
VS Code / IntelliJ  →  GitHub Copilot Agent
          ↕  stdio (MCP Protocol)
  copilot-fs-mcp  (proceso Node.js local)
          ↕  lee  ~/.config/copilot-fs-mcp/config.json
  Motor de permisos  +  Capa de seguridad
          ↕  fs nativo de Node.js
  Sistema de archivos  (~/ Documentos, Descargas, Proyectos…)
```

### 2.2 Transporte: por qué stdio y no HTTP

Existen dos opciones de transporte en el protocolo MCP: stdio y HTTP/SSE. Para un servidor local, stdio es la elección correcta por varios motivos: el IDE lanza y mata el proceso automáticamente sin que el usuario tenga que gestionar ningún servicio, no se abre ningún puerto en el sistema, no hay riesgo de que otro proceso en la máquina se conecte al servidor, y la latencia es mínima al no pasar por red.

### 2.3 Herramientas (Tools) expuestas

| Tool MCP | Descripción | Permisos requeridos |
|---|---|---|
| `read_file` | Lee el contenido completo de un archivo | `"read"` en la ruta del archivo |
| `write_file` | Escribe o sobreescribe un archivo en disco | `"write"` en la ruta destino |
| `list_directory` | Lista archivos y carpetas de un directorio | `"list"` en la ruta del directorio |
| `search_files` | Busca archivos por nombre o contenido | `"search"` en la ruta raíz |
| `get_permissions` | Devuelve qué rutas y operaciones están permitidas | Ninguno (solo lectura de config) |

---

## 3. Sistema de Permisos y Configuración

### 3.1 Estructura del archivo de configuración

El archivo `config.json` vive en la máquina de cada desarrollador y nunca se comparte ni sube a ningún repositorio. Su ubicación por defecto es multiplataforma:

- **Windows:** `%APPDATA%\copilot-fs-mcp\config.json`
- **macOS:** `~/.config/copilot-fs-mcp/config.json`
- **Linux:** `~/.config/copilot-fs-mcp/config.json`

```json
{
  "version": "1.0",
  "permissions": {
    "allowed": [
      {
        "path": "~/Documentos/Trabajo",
        "operations": ["read", "list", "search"]
      },
      {
        "path": "~/Proyectos/frontend",
        "operations": ["read", "write", "list", "search"]
      }
    ],
    "denied": ["~/.ssh", "~/.aws", "~/.env"]
  },
  "security": {
    "maxFileSizeBytes": 5242880,
    "allowedExtensions": [".ts", ".js", ".md", ".json", ".txt"],
    "logAllAccess": true,
    "logPath": "~/.config/copilot-fs-mcp/logs"
  }
}
```

### 3.2 Reglas de evaluación de permisos

El motor de permisos evalúa cada operación en este orden estricto, sin excepciones:

1. Si la ruta solicitada coincide con alguna entrada en `denied`, la operación se deniega inmediatamente.
2. Si la ruta **no** está bajo ninguna entrada de `allowed`, la operación se deniega.
3. Si la operación solicitada (`read`, `write`, `list`, `search`) no está en el array de esa entrada, se deniega.
4. Si el archivo supera el `maxFileSizeBytes` configurado, se deniega.
5. Si la extensión del archivo no está en `allowedExtensions`, se deniega.
6. Solo si pasa todos los filtros anteriores, la operación se ejecuta.

> **⚠️ Protección contra path traversal**
>
> Todas las rutas solicitadas se resuelven a su ruta absoluta real antes de ser evaluadas.
> Esto bloquea intentos como: `/Proyectos/frontend/../../.ssh/id_rsa`
> La validación ocurre incluso si el archivo no existe todavía (para operaciones de escritura).

---

## 4. Estructura del Proyecto

```
copilot-fs-mcp/
├── src/
│   ├── index.ts              ← Punto de entrada, inicializa el servidor MCP
│   ├── server.ts             ← Registro de tools y manejo de requests
│   ├── permissions/
│   │   ├── config-loader.ts  ← Lee y valida el config.json
│   │   ├── evaluator.ts      ← Motor de evaluación de permisos
│   │   └── path-resolver.ts  ← Normalización y anti path-traversal
│   ├── tools/
│   │   ├── read-file.ts
│   │   ├── write-file.ts
│   │   ├── list-directory.ts
│   │   └── search-files.ts
│   ├── audit/
│   │   └── logger.ts         ← Log de auditoría de todas las operaciones
│   └── cli/
│       └── init.ts           ← Asistente interactivo de configuración
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

---

## 5. Plan de Desarrollo por Fases

| Fase | Nombre | Duración | Entregable principal |
|:---:|---|---|---|
| 1 | Núcleo funcional del servidor MCP | 1 semana | Servidor funcional en VSCode |
| 2 | Motor de permisos y seguridad | 1 semana | Config JSON + validaciones completas |
| 3 | CLI de configuración interactiva | 1 semana | Comando `init` funcional |
| 4 | Logs de auditoría | 3 días | Registro completo de accesos |
| 5 | Publicación en npm + documentación | 4 días | Paquete público instalable |

---

### Fase 1 — Núcleo funcional (Semana 1)

El objetivo de esta fase es tener un servidor MCP mínimo que responda correctamente al protocolo y que VSCode pueda lanzar y usar. No tiene seguridad completa todavía pero es el esqueleto sobre el que se construye todo.

- Inicializar proyecto con TypeScript strict, ESLint y Prettier
- Instalar dependencia oficial: `@modelcontextprotocol/sdk`
- Implementar las 4 herramientas básicas sin validación de permisos
- Leer `config.json` desde la ruta por defecto según el OS
- Verificar conexión exitosa desde VSCode con GitHub Copilot

> **Dependencias clave de esta fase**
>
> - `@modelcontextprotocol/sdk` → SDK oficial de Anthropic para servidores MCP
> - `zod` → Validación de esquemas del config.json
> - `glob` → Búsqueda de archivos por patrones

---

### Fase 2 — Motor de permisos y seguridad (Semana 2)

Esta fase convierte el servidor funcional en un servidor seguro. Ninguna operación puede ejecutarse sin pasar por el motor de permisos.

- Implementar el evaluador de permisos con las 6 reglas definidas en la sección 3.2
- Integrar resolución de paths absolutos antes de cualquier evaluación
- Añadir protección contra path traversal (`../` y variantes)
- Implementar límites de tamaño de archivo y filtro de extensiones
- Pruebas unitarias exhaustivas del motor de permisos con casos edge
- Manejo de errores descriptivos: el servidor informa exactamente qué regla bloqueó la operación

---

### Fase 3 — CLI interactiva (Semana 3)

El CLI convierte la configuración manual de un archivo JSON en una experiencia guiada. Es el componente que marca la diferencia en la adopción por parte de otros desarrolladores.

- Comando `init`: asistente paso a paso para crear el `config.json` inicial
- Comando `add-path`: añadir una ruta permitida sin editar el JSON
- Comando `list`: mostrar en tabla las rutas y permisos actuales
- Comando `remove-path`: revocar acceso a una ruta
- Comando `validate`: verificar que el `config.json` no tiene errores
- Output del snippet de configuración listo para pegar en VSCode o IntelliJ

**Ejemplo de sesión con el CLI:**

```bash
$ copilot-fs-mcp init

  Bienvenido al asistente de configuración
  ─────────────────────────────────────────
  ? Carpetas a permitir (separadas por coma):
  > ~/Documentos/Trabajo, ~/Proyectos

  ? Operaciones para ~/Documentos/Trabajo:
  > [x] Leer  [x] Listar  [x] Buscar  [ ] Escribir

  Config guardada en ~/.config/copilot-fs-mcp/config.json

  Pega esto en tu settings.json de VSCode:
  { "command": "copilot-fs-mcp" }
```

---

### Fase 4 — Logs de auditoría (3 días)

El log de auditoría permite al desarrollador saber exactamente qué ha accedido Copilot y cuándo. Es clave para la confianza en el sistema.

- Registro de cada operación: timestamp, tool, path solicitado, resultado (permitido/denegado)
- Rotación automática de logs para no crecer indefinidamente
- Formato JSON Lines para que sea fácil de filtrar con herramientas estándar
- Comando `copilot-fs-mcp logs` para ver el historial reciente en terminal

**Ejemplo de entrada en el log:**

```jsonl
{"ts":"2025-03-20T14:32:11Z","tool":"read_file","path":"/home/user/Proyectos/frontend/src/api.ts","result":"allowed","duration_ms":4}
{"ts":"2025-03-20T14:32:12Z","tool":"read_file","path":"/home/user/.ssh/id_rsa","result":"denied","reason":"path_in_deny_list"}
```

---

## 6. Publicación y Distribución en npm

### 6.1 Preparación del paquete

El `package.json` debe configurarse correctamente para que el binario sea ejecutable directamente con `npx` o tras instalación global:

```json
{
  "name": "copilot-fs-mcp",
  "version": "1.0.0",
  "description": "Local MCP server for GitHub Copilot filesystem access",
  "bin": {
    "copilot-fs-mcp": "./dist/index.js"
  },
  "files": ["dist/", "README.md"],
  "engines": { "node": ">=18.0.0" },
  "keywords": ["mcp", "copilot", "filesystem", "github-copilot"]
}
```

### 6.2 Flujo de publicación

Se usará GitHub Actions para automatizar el proceso de build, test y publicación en cada release:

1. El desarrollador hace push de un tag con formato `v1.0.0` a GitHub
2. GitHub Actions ejecuta los tests automáticamente
3. Si los tests pasan, compila TypeScript a JavaScript en `/dist`
4. Publica automáticamente en npm con el token configurado como secreto
5. Crea un GitHub Release con el changelog generado

### 6.3 Instalación por el usuario final

Con el paquete publicado en npm, la experiencia de instalación queda reducida a estos pasos:

```bash
# Paso 1: Instalar globalmente (una sola vez)
npm install -g copilot-fs-mcp

# Paso 2: Configurar rutas permitidas (una sola vez)
copilot-fs-mcp init

# Paso 3: Pegar el snippet en VSCode settings.json
"mcp": { "servers": { "local-fs": { "command": "copilot-fs-mcp" } } }
```

> **Alternativa sin instalación global (npx)**
>
> Los usuarios también pueden usar npx sin instalar nada de forma permanente:
> ```json
> { "command": "npx", "args": ["-y", "copilot-fs-mcp"] }
> ```
> npx descarga y ejecuta la última versión automáticamente cada vez.

---

## 7. Configuración en IDEs

### 7.1 Visual Studio Code

La configuración se añade en `.vscode/settings.json` del workspace o en el `settings.json` global del usuario:

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

### 7.2 IntelliJ IDEA / WebStorm

En IntelliJ la configuración del MCP se realiza desde `Settings > Tools > GitHub Copilot > MCP Servers`, añadiendo una entrada con el comando `copilot-fs-mcp` y dejando los argumentos vacíos.

Alternativamente, puede configurarse en el archivo `.idea/mcp.json` del proyecto con la misma estructura JSON que VSCode.

---

## 8. Stack Tecnológico

| Tecnología | Versión mínima | Propósito |
|---|---|---|
| `Node.js` | 18 LTS | Runtime del servidor |
| `TypeScript` | 5.x | Lenguaje principal |
| `@modelcontextprotocol/sdk` | latest | Protocolo MCP oficial |
| `zod` | 3.x | Validación del config.json |
| `glob` | 10.x | Búsqueda de archivos |
| `commander` | 12.x | CLI interactivo |
| `inquirer` | 9.x | Prompts del asistente init |
| `vitest` | 1.x | Testing unitario e integración |

---

## 9. Checklist de Lanzamiento

### Antes de publicar en npm

- [ ] Tests unitarios del motor de permisos con cobertura > 90%
- [ ] Tests de integración: conexión real desde VSCode con Copilot
- [ ] Verificar que path traversal es bloqueado en todos los casos
- [ ] Probar en Windows, macOS y Linux
- [ ] Revisar que el paquete no incluye archivos sensibles (`.env`, credenciales)
- [ ] README con ejemplos claros de instalación y configuración
- [ ] CHANGELOG inicial con los features de v1.0.0
- [ ] Licencia MIT añadida al repositorio

### Después de publicar

- [ ] Verificar instalación limpia con `npm install -g` en máquina nueva
- [ ] Publicar en el directorio oficial de MCP servers de Anthropic
- [ ] Crear issue template en GitHub para reportar vulnerabilidades de seguridad

---

*Plan de Desarrollo — MCP Local para GitHub Copilot | v1.0*
