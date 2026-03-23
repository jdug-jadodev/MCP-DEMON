# 📘 Guía de Instalación Completa - Copilot FS MCP

## 🎯 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

1. **Node.js** versión 18 o superior
   - Verifica tu versión: `node --version`
   - Descarga desde: https://nodejs.org

2. **Visual Studio Code** con GitHub Copilot habilitado

3. **Acceso de administrador** (para instalación global)

---

## 📦 Paso 1: Instalación del Paquete

### Opción A: Instalación Global (Recomendada)
```bash
npm install -g copilot-fs-mcp
```

Verifica la instalación:
```bash
copilot-fs-mcp --help
```

### Opción B: Uso con npx (Sin instalación)
```bash
npx copilot-fs-mcp --help
```

---

## ⚙️ Paso 2: Crear Archivo de Configuración

1. **Crea un directorio para la configuración:**
   ```bash
   mkdir -p C:\Users\Usuario\.config\copilot-fs-mcp
   ```

2. **Crea el archivo `config.json`:**
   
   Guarda este contenido en `C:\Users\Usuario\.config\copilot-fs-mcp\config.json`:

   ```json
   {
     "version": "1.0",
     "permissions": {
       "allowed": [
         {
           "path": "C:/Users/Usuario/Documents/mis-proyectos",
           "operations": ["read", "write", "list", "search"]
         },
         {
           "path": "C:/Users/Usuario/Desktop",
           "operations": ["read", "list"]
         }
       ],
       "denied": [
         "~/.ssh",
         "~/.aws",
         "~/.config/secrets",
         "C:/Windows/System32"
       ]
     },
     "security": {
       "maxFileSizeBytes": 5242880,
       "allowedExtensions": [
         ".ts", ".js", ".jsx", ".tsx",
         ".md", ".json", ".txt",
         ".css", ".html", ".scss",
         ".yml", ".yaml", ".xml",
         ".py", ".java", ".c", ".cpp"
       ],
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

   **⚠️ IMPORTANTE:** Ajusta las rutas según tus necesidades:
   - `permissions.allowed[].path`: Rutas que Copilot podrá acceder
   - `permissions.denied`: Rutas siempre bloqueadas (seguridad)
   - `security.logPath`: Dónde guardar logs de auditoría

---

## 🔧 Paso 3: Configurar VS Code

1. **Abre la configuración de usuario de VS Code:**
   - Presiona `Ctrl + Shift + P`
   - Escribe "Preferences: Open User Settings (JSON)"
   - Selecciona el archivo `settings.json`

2. **Agrega la configuración MCP:**

   Busca la sección `"mcp"` o créala si no existe:

   ```json
   {
     "mcp": {
       "servers": {
         "local-filesystem": {
           "command": "copilot-fs-mcp",
           "args": ["--config", "C:/Users/Usuario/.config/copilot-fs-mcp/config.json"]
         }
       }
     }
   }
   ```

   **Si instalaste con npm global**, usa solo el comando:
   ```json
   "command": "copilot-fs-mcp"
   ```

   **Si usas npx**, usa:
   ```json
   "command": "npx",
   "args": ["copilot-fs-mcp", "--config", "C:/Users/Usuario/.config/copilot-fs-mcp/config.json"]
   ```

3. **Guarda el archivo** y reinicia VS Code

---

## ✅ Paso 4: Verificar la Instalación

1. **Abre la consola de desarrollador en VS Code:**
   - Presiona `Ctrl + Shift + I` (o `Help > Toggle Developer Tools`)
   - Ve a la pestaña "Console"

2. **Busca mensajes del servidor MCP:**
   - Deberías ver algo como: `MCP server 'local-filesystem' connected`
   - Si hay errores, verifica las rutas en tu configuración

3. **Prueba con Copilot Chat:**
   - Abre Copilot Chat (`Ctrl + Shift + I` o el ícono de chat)
   - Escribe: `@workspace list files in C:/Users/Usuario/Documents`
   - Si funciona, verás la lista de archivos

---

## 🛠️ Paso 5: Usar las Herramientas

Una vez configurado, puedes usar estas herramientas desde **GitHub Copilot Chat**:

### 📖 **read_file** - Leer archivos
```
@workspace lee el archivo C:/Users/Usuario/Documents/proyecto/index.js
```

### ✍️ **write_file** - Escribir archivos (con backup automático)
```
@workspace crea un archivo README.md en C:/Users/Usuario/Documents/proyecto con el siguiente contenido: ...
```

### 📁 **list_directory** - Listar directorios
```
@workspace lista los archivos en C:/Users/Usuario/Documents/proyecto
```

### 🔍 **search_files** - Buscar archivos
```
@workspace busca archivos que contengan "function getData" en C:/Users/Usuario/Documents/proyecto
```

### 🔐 **get_permissions** - Ver permisos configurados
```
@workspace muestra los permisos actuales del servidor MCP
```

### 💾 **list_backups** - Ver backups disponibles
```
@workspace lista los backups de C:/Users/Usuario/Documents/proyecto/index.js
```

### ⏮️ **restore_backup** - Restaurar desde backup
```
@workspace restaura el backup más reciente de index.js
```

---

## 🔄 Sistema de Backups

El servidor crea **backups automáticos** antes de cada modificación:

- **Ubicación:** `.mcp-backups/` en el mismo directorio del archivo
- **Formato:** `archivo.ext.backup-YYYYMMDD-HHMMSS`
- **Límite:** Configurable (default: 10 backups por archivo)
- **Limpieza:** Automática de backups antiguos

**Ejemplo:**
```
proyecto/
├── index.js
└── .mcp-backups/
    ├── index.js.backup-20260323-143022
    ├── index.js.backup-20260323-145130
    └── index.js.backup-20260323-151045
```

---

## 🐛 Solución de Problemas

### ❌ "Server not found" o no se conecta

**Causa:** VS Code no encuentra el ejecutable

**Solución:**
1. Verifica que npm instaló globalmente: `npm list -g copilot-fs-mcp`
2. Encuentra la ruta del binario: `where copilot-fs-mcp` (Windows) o `which copilot-fs-mcp` (Mac/Linux)
3. Usa la ruta absoluta en `settings.json`:
   ```json
   "command": "C:/Users/Usuario/AppData/Roaming/npm/copilot-fs-mcp.cmd"
   ```

### ❌ "Permission denied" al acceder archivos

**Causa:** La ruta no está en `permissions.allowed` o está en `denied`

**Solución:**
1. Edita `config.json`
2. Agrega la ruta a `permissions.allowed`:
   ```json
   {
     "path": "C:/ruta/al/directorio",
     "operations": ["read", "write", "list", "search"]
   }
   ```
3. Guarda y reinicia VS Code

### ❌ "File too large" al leer archivos

**Causa:** El archivo excede `maxFileSizeBytes`

**Solución:**
- Aumenta el límite en `config.json`:
  ```json
  "security": {
    "maxFileSizeBytes": 10485760  // 10 MB
  }
  ```

### ❌ "Extension not allowed"

**Causa:** La extensión del archivo no está en `allowedExtensions`

**Solución:**
- Agrega la extensión en `config.json`:
  ```json
  "allowedExtensions": [".ts", ".js", ".py", ".java"]
  ```

---

## 📊 Ver Logs de Auditoría

Todos los accesos se registran en el `logPath` configurado:

```bash
# Ver logs recientes
type C:\Users\Usuario\.config\copilot-fs-mcp\logs\access.log

# Monitorear en tiempo real
Get-Content C:\Users\Usuario\.config\copilot-fs-mcp\logs\access.log -Wait
```

---

## 🔒 Mejores Prácticas de Seguridad

1. **Solo permite rutas necesarias:** No uses rutas amplias como `C:/`
2. **Usa operaciones específicas:** Si solo necesitas leer, no agregues `write`
3. **Bloquea directorios sensibles:** Agrega a `denied`: `~/.ssh`, `~/.aws`, etc.
4. **Revisa logs regularmente:** Verifica accesos inusuales
5. **Limita extensiones:** Solo permite tipos de archivo que necesites
6. **Establece límites de tamaño:** Evita que archivos enormes consuman recursos

---

## 🗑️ Desinstalación

Para desinstalar el paquete completamente:

```bash
# Desinstalar el paquete global
npm uninstall -g copilot-fs-mcp

# Verificar que se desinstaló
npm list -g copilot-fs-mcp
```

También puedes eliminar:
- La configuración de VS Code en `settings.json` (sección MCP)
- El directorio de configuración: `C:\Users\Usuario\.config\copilot-fs-mcp`
- Los backups en los directorios `.mcp-backups`

---

## 🎉 ¡Listo!

Ahora tienes **Copilot FS MCP** completamente configurado. Puedes:

✅ Leer y escribir archivos de forma segura  
✅ Buscar contenido en tu sistema de archivos  
✅ Tener backups automáticos de todas las modificaciones  
✅ Auditoría completa de todos los accesos  
✅ Control granular de permisos  

**¿Necesitas ayuda?** Consulta:
- [README.md](README.md) - Documentación completa
- [BACKUPS.md](BACKUPS.md) - Sistema de backups
- [SECURITY.md](SECURITY.md) - Guía de seguridad

---

## 📝 Notas Adicionales

### Sobre el warning de glob

Si ves este mensaje al instalar:
```
npm warn deprecated glob@10.5.0: Old versions of glob are not supported...
```

Es solo una advertencia sobre una dependencia transitiva antigua. No afecta la funcionalidad del paquete. El autor del paquete debería actualizar esa dependencia en futuras versiones.

### Uso en diferentes sistemas operativos

**Windows:**
- Usa rutas con `/` o `\\`: `C:/Users/Usuario/...` o `C:\\Users\\Usuario\\...`
- El comando es: `copilot-fs-mcp.cmd` (se puede abreviar a `copilot-fs-mcp`)

**Mac/Linux:**
- Usa rutas Unix: `/home/usuario/...`
- El comando es: `copilot-fs-mcp`
- Puedes usar `~` para el directorio home

### Configuración avanzada

**Múltiples entornos:**
Puedes crear diferentes archivos de configuración para diferentes proyectos:

```json
// config-proyecto-a.json
{
  "permissions": {
    "allowed": [{"path": "C:/Proyectos/ProyectoA", "operations": ["read", "write", "list", "search"]}]
  }
}

// config-proyecto-b.json
{
  "permissions": {
    "allowed": [{"path": "C:/Proyectos/ProyectoB", "operations": ["read", "list"]}]
  }
}
```

Y cambiar el argumento `--config` en VS Code según el proyecto activo.
