# 🔄 Sistema de Backups Automáticos

## ¿Qué problema resuelve?

Cuando el servidor MCP modifica archivos directamente, VS Code pierde el historial de deshacer (Ctrl+Z). Para mitigar este problema, ahora el servidor **crea backups automáticos** antes de cada modificación.

## 🎯 Características

- ✅ **Backups automáticos** antes de cada escritura
- ✅ **Sin intervención manual** requerida
- ✅ **Limpieza automática** de backups antiguos
- ✅ **Herramientas dedicadas** para listar y restaurar backups
- ✅ **Configurable** por archivo de configuración

## 📦 ¿Dónde se guardan los backups?

Por defecto, los backups se guardan en `.mcp-backups/` en la raíz del workspace, manteniendo la estructura de directorios del archivo original:

```
.mcp-backups/
  src/
    utils/
      helper.ts.2026-03-23T10-30-45-123Z.backup
      helper.ts.2026-03-23T09-15-30-456Z.backup
  config/
    settings.json.2026-03-23T11-00-00-789Z.backup
```

## 🔧 Configuración

Añade este bloque a tu `config.json`:

```json
{
  "version": "1.0",
  "permissions": { ... },
  "security": { ... },
  "backup": {
    "enabled": true,
    "maxBackups": 10,
    "backupDir": ".mcp-backups"
  }
}
```

### Opciones de configuración

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Habilita/deshabilita backups automáticos |
| `maxBackups` | number | `10` | Cantidad máxima de backups por archivo |
| `backupDir` | string | `".mcp-backups"` | Carpeta donde guardar los backups |

## 🛠️ Nuevas Herramientas

### 1. `list_backups`

Lista todos los backups disponibles para un archivo.

**Parámetros:**
```json
{
  "path": "/ruta/absoluta/al/archivo.ts"
}
```

**Ejemplo de respuesta:**
```json
{
  "file": "C:\\proyecto\\src\\utils\\helper.ts",
  "backups": [
    {
      "index": 0,
      "path": "C:\\proyecto\\.mcp-backups\\src\\utils\\helper.ts.2026-03-23T10-30-45-123Z.backup",
      "timestamp": "2026-03-23T10:30:45.123Z",
      "size": 2048,
      "ageMinutes": 5
    },
    {
      "index": 1,
      "path": "C:\\proyecto\\.mcp-backups\\src\\utils\\helper.ts.2026-03-23T09-15-30-456Z.backup",
      "timestamp": "2026-03-23T09:15:30.456Z",
      "size": 1950,
      "ageMinutes": 80
    }
  ]
}
```

### 2. `restore_backup`

Restaura un archivo desde un backup.

**Parámetros:**
```json
{
  "path": "/ruta/absoluta/al/archivo.ts",
  "backupIndex": 0  // Opcional, default: 0 (más reciente)
}
```

**Ejemplo de respuesta:**
```json
{
  "restored": "C:\\proyecto\\src\\utils\\helper.ts",
  "from": "C:\\proyecto\\.mcp-backups\\src\\utils\\helper.ts.2026-03-23T10-30-45-123Z.backup",
  "timestamp": "2026-03-23T10:30:45.123Z"
}
```

## 💡 Casos de uso

### Restaurar la versión más reciente

Si acabas de modificar un archivo y te arrepentiste:

1. Usa `list_backups` para ver los backups disponibles
2. Usa `restore_backup` sin especificar índice (restaura el más reciente)

### Restaurar una versión específica

Si necesitas volver a una versión anterior:

1. Usa `list_backups` para ver todos los backups
2. Identifica el índice del backup que quieres
3. Usa `restore_backup` con el `backupIndex` específico

## 📝 Respuesta de `write_file`

Ahora cuando escribes un archivo, la respuesta incluye información del backup:

```json
{
  "path": "C:\\proyecto\\src\\config.ts",
  "bytes": 1024,
  "backup": "C:\\proyecto\\.mcp-backups\\src\\config.ts.2026-03-23T10-30-45-123Z.backup"
}
```

Si el archivo era nuevo (no existía backup previo), `backup` será `undefined`.

## ⚙️ Gestión de backups

- Los backups se limpian automáticamente cuando superen `maxBackups`
- Los backups más antiguos se eliminan primero
- Puedes desactivar backups con `"enabled": false`
- El directorio `.mcp-backups/` se puede añadir al `.gitignore`

## 🔒 Seguridad

El sistema de backups respeta las mismas reglas de permisos:
- Para listar backups necesitas permiso de **lectura** en el archivo
- Para restaurar backups necesitas permiso de **escritura** en el archivo

## 🎨 Mejorando el flujo de trabajo

Aunque no recuperamos el Ctrl+Z de VS Code, este sistema te da:

1. **Historial persistente**: Los backups permanecen aunque cierres VS Code
2. **Más control**: Puedes ver todos los backups y elegir cuál restaurar
3. **Tranquilidad**: Siempre puedes volver atrás, incluso días después
4. **Automatización**: Todo funciona sin intervención manual

## 🚀 Próximos pasos sugeridos

Considera añadir al `.gitignore`:

```gitignore
# MCP Backups
.mcp-backups/
```

Esto evita que los backups se suban al repositorio.
