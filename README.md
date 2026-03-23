
# 🚀 Copilot FS MCP

[![npm version](https://badge.fury.io/js/copilot-fs-mcp.svg)](https://www.npmjs.com/package/copilot-fs-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/copilot-fs-mcp)](https://nodejs.org)

Servidor MCP (Model Context Protocol) para acceso seguro al sistema de archivos desde GitHub Copilot.

## ✨ Características

- 🔒 **Sistema de permisos granular** - Control preciso sobre qué archivos se pueden leer/escribir
- 📝 **Operaciones de archivos** - Lectura, escritura, listado y búsqueda
- 🔄 **Backups automáticos** - Sistema de respaldo antes de cada modificación ([ver documentación](BACKUPS.md))
- 🔍 **Búsqueda de archivos** - Por nombre y contenido
- 📊 **Logging de accesos** - Auditoría completa de operaciones
- ⚡ **Hot-reload de configuración** - Cambios en tiempo real sin reiniciar


## 📦 Instalación

### Instalación global (recomendada)
```bash
npm install -g copilot-fs-mcp
```

### Uso con npx (sin instalación global)
```bash
npx copilot-fs-mcp
```


## 🚀 Quick Start

1. Instala globalmente:
   ```bash
   npm install -g copilot-fs-mcp
   ```
2. Configura VSCode en settings.json:
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
3. Crea tu archivo config.json (ver ejemplo abajo)
4. ¡Listo! Usa Copilot Agent para acceder al sistema de archivos de forma segura.

## ⚙️ Configuración

El servidor requiere un archivo de configuración JSON. Ejemplo mínimo:

```json
{
  "version": "1.0",
  "permissions": {
    "allowed": [
      {
        "path": "C:/Users/Usuario/Documents/proyecto",
        "operations": ["read", "write", "list", "search"]
      }
    ],
    "denied": []
  },
  "security": {
    "maxFileSizeBytes": 5242880,
    "allowedExtensions": [".ts", ".js", ".md", ".json", ".txt"],
    "logAllAccess": true,
    "logPath": "C:/Users/Usuario/.config/copilot-fs-mcp/logs"
  },
  "backup": {
    "enabled": true,
    "maxBackups": 10,
    "backupDir": ".mcp-backups"
  }
}
```


## 🚀 Uso CLI

Iniciar el servidor:
```bash
copilot-fs-mcp --config /ruta/a/config.json
```

Ver ayuda de comandos:
```bash
copilot-fs-mcp --help
```

### Comandos principales:

- `init` — Asistente de configuración interactiva
- `add-path <ruta>` — Añade ruta permitida
- `remove-path <ruta>` — Revoca acceso a una ruta
- `list` — Muestra configuración actual
- `validate` — Verifica integridad de config.json
- `logs` — Muestra logs de auditoría


## 🛠️ Herramientas disponibles

| Herramienta         | Descripción                                      | Ejemplo CLI                        |
|---------------------|--------------------------------------------------|------------------------------------|
| `read_file`         | Lee el contenido de un archivo                   | copilot-fs-mcp read_file --path ...|
| `write_file`        | Escribe contenido en un archivo (con backup)     | copilot-fs-mcp write_file ...      |
| `list_directory`    | Lista archivos y carpetas en un directorio       | copilot-fs-mcp list_directory ...  |
| `search_files`      | Busca archivos por nombre o contenido            | copilot-fs-mcp search_files ...    |
| `get_permissions`   | Muestra la configuración de permisos actual      | copilot-fs-mcp get_permissions     |
| `list_backups`      | Lista backups disponibles para un archivo        | copilot-fs-mcp list_backups ...    |
| `restore_backup`    | Restaura un archivo desde un backup              | copilot-fs-mcp restore_backup ...  |

| Herramienta | Descripción |
|-------------|-------------|
| `read_file` | Lee el contenido de un archivo |
| `write_file` | Escribe contenido en un archivo (con backup automático) |
| `list_directory` | Lista archivos y carpetas en un directorio |
| `search_files` | Busca archivos por nombre o contenido |
| `get_permissions` | Muestra la configuración de permisos actual |
| `list_backups` | Lista backups disponibles para un archivo |
| `restore_backup` | Restaura un archivo desde un backup |


## 🔄 Sistema de Backups

El servidor **crea backups automáticos** antes de modificar archivos, mitigando el problema de pérdida del historial de deshacer (Ctrl+Z) en VS Code cuando los archivos se modifican externamente.

**[📖 Ver documentación completa de backups →](BACKUPS.md)**

Características principales:
- ✅ Backups automáticos antes de cada escritura
- ✅ Limpieza automática de backups antiguos
- ✅ Herramientas para listar y restaurar versiones
- ✅ Completamente configurable


## 🧪 Testing

```bash
npm test              # Ejecutar tests
npm run test:coverage # Ejecutar tests con coverage
```

## 🛠️ Troubleshooting

### Server not connecting
- Verifica la ruta absoluta a config.json
- Revisa la consola de desarrollador de VSCode para errores

### Permission denied errors
- Revisa que config.json permita la ruta y operación
- Verifica que las rutas usen barras correctas

### Problemas comunes
- Si el binario no responde, asegúrate de tener Node.js >= 18
- Si el paquete no aparece tras instalar, revisa tu $PATH


## 🤝 Contributing

¡Contribuciones, issues y sugerencias son bienvenidas! Por favor, abre un issue o pull request en [GitHub](https://github.com/tu-usuario/copilot-fs-mcp).

## 📄 Licencia

MIT
