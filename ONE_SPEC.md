# One Spec (Root Spec)
## FASE 2 — Motor de Permisos y Seguridad

---

## Objetivo

Implementar un motor de permisos completo y robusto que garantice que **ninguna operación de sistema de archivos** llegue a ejecutarse sin haber sido validada contra un conjunto de reglas de seguridad estrictas y configurables. El motor debe:

- **Proteger contra path traversal** y otros ataques de manipulación de rutas
- **Validar permisos granulares** basados en operación (read, write, list, search) y ruta
- **Aplicar límites de seguridad** (tamaño de archivo, extensiones permitidas)
- **Proporcionar razones claras** de denegación para auditoría y debugging
- **Mantener alto rendimiento** sin bloquear el proceso principal

**Meta cuantificable**: 100% de protección contra path traversal, cobertura de tests >95% en el motor de permisos, 0 vulnerabilidades críticas detectadas por npm audit.

---

## Alcance / No alcance

### ✅ **Dentro del Alcance** (DEBE implementarse)

1. **Módulo de Resolución de Rutas** (`path-resolver.ts`)
   - Expansión de `~` al directorio home del usuario
   - Normalización de rutas absolutas con `path.resolve()`
   - Validación anti-path-traversal que impida salir de rutas base autorizadas
   - Compatibilidad multiplataforma (Windows, macOS, Linux)

2. **Validación de Esquema de Configuración**
   - Esquema Zod completo para `config.json`
   - Validación en tiempo de carga con mensajes de error descriptivos
   - Tipos TypeScript inferidos automáticamente del esquema

3. **Motor de Evaluación de Permisos** (`evaluator.ts`)
   - 6 reglas de evaluación en orden estricto (ver sección Principios)
   - Estructura de resultado tipada: `{ allowed: true } | { allowed: false; reason: string }`
   - Manejo de casos edge: archivos inexistentes, stat failures, extensiones sin punto

4. **Suite de Tests Exhaustiva**
   - Tests unitarios para cada regla del motor
   - Tests de path traversal (10+ variantes)
   - Tests de integración con configuraciones reales
   - Objetivo: >95% cobertura del código del motor

5. **Integración en Herramientas Existentes**
### ❌ **Fuera del Alcance** (NO se implementa en esta fase)

- Logs de auditoría (Fase 4)

---

## Definiciones (lenguaje de dominio)
- `read`: Lectura de contenido de archivo
- `write`: Escritura o creación de archivo

### **Entrada de Permiso (PermissionEntry)**
{ path: string, operations: Operation[] }
```
1. Expansión de `~` → directorio home
2. Expansión de variables de entorno (opcional)
La ruta raíz de una `PermissionEntry.path`. Durante evaluación, la ruta solicitada debe estar contenida dentro de la ruta base.

Ataque que utiliza secuencias como `../` o `..\` para escapar de una ruta autorizada hacia zonas protegidas del filesystem (ej: `~/projects/../.ssh/id_rsa`).

- `path_not_allowed`: La ruta no está bajo ninguna entrada de `allowed`
- `operation_not_allowed`: La operación no está en el array de operaciones permitidas
- `file_too_large`: El archivo excede `maxFileSizeBytes`
- macOS/Linux: `~/.config/copilot-fs-mcp/config.json`

Estructura:
    ],
    "denied": ["~/.ssh", "~/.aws", "~/.config/secrets"]
  },
  }
```

### **P1. Deny by Default (Denegación por Defecto)**

### **P2. Explicit Denial Trumps All (Denegación Explícita Prima)**
Si una ruta está en `denied`, DEBE ser denegada **incluso si también está en `allowed`**. La denegación tiene prioridad absoluta.
### **P3. Orden de Evaluación Estricto (6 Reglas)**
El motor DEBE evaluar en este orden, deteniendo en la primera que deniegue:

1. **Regla de Denegación Explícita**: Si `resolvedPath` empieza con alguna ruta en `denied` → `denied_path`
2. **Regla de Ruta No Autorizada**: Si `resolvedPath` no está bajo ninguna ruta en `allowed` → `path_not_allowed`
3. **Regla de Operación No Permitida**: Si `operation` no está en el array de la entrada `allowed` correspondiente → `operation_not_allowed`
4. **Regla de Tamaño de Archivo**: Si la operación es `read` o `write` Y el archivo existe Y su tamaño > `maxFileSizeBytes` → `file_too_large`
### **P4. Path Traversal = Denegación Automática**
Cualquier ruta que, tras resolución canónica, no esté contenida dentro de su ruta base DEBE ser denegada. La función `isPathSafe(requested, base)` DEBE retornar `false` si:
- `path.resolve(requested)` no comienza con `path.resolve(base) + path.sep`
- O si se detecta manipulación de `../` que intente escapar

### **P5. No Excepciones en Runtime**
El motor NO DEBE lanzar excepciones no controladas. Si ocurre un error (ej: `stat()` falla), el motor DEBE:
- Para errores de `stat()`: loggearlos y proceder (no denegar por error de sistema)
- Para errores críticos (config corrupta): devolver denegación con razón `config_error`

### **P6. Configuración Inmutable Durante Evaluación**
El objeto `Config` pasado al motor DEBE ser tratado como inmutable (readonly). El motor NO DEBE modificar la configuración.
### **P7. Zero Trust en Parámetros de Entrada**
Toda ruta recibida de una tool MCP DEBE ser tratada como **no confiable** hasta ser validada. No se asume que el cliente ha sanitizado las entradas.

### **P8. Tipo de Retorno Consistente**
El motor SIEMPRE devuelve un objeto `PermissionResult`:
  | { allowed: true }
  | { allowed: false; reason: string };
```
Nunca `undefined`, nunca `null`, nunca excepciones para flujo normal.

---

## Límites

|--------|-------|---------------|
| Tamaño máximo de archivo por defecto | 5 MB (5242880 bytes) | Evitar sobrecarga de memoria en operaciones síncronas de lectura |
| Número máximo de entradas en `allowed` | 1000 | Evitar degradación de performance en O(n) para evaluación |
| Profundidad máxima de path | 4096 caracteres | Límite del sistema operativo (Windows MAX_PATH extendido) |
| Tiempo máximo de evaluación | 50 ms | No bloquear el event loop de Node.js |
| Extensiones permitidas por defecto | 20 | Balance entre flexibilidad y seguridad |

### **Límites de Alcance**

- **NO se valida contenido**: El motor verifica permisos de acceso, NO el contenido de los archivos (sin escaneo de malware, secrets, etc.)
- **NO se controla frecuencia**: No hay rate limiting en esta fase (ver Fase 4 para auditoría)
- **NO se gestionan usuarios**: Es un servidor local MCP de un solo usuario (el que ejecuta VSCode)
- **NO se detectan symlinks maliciosos**: Los symlinks se resuelven por `path.resolve()`, pero no se valida su destino como vector de ataque

### **Límites de Compatibilidad**
- **Node.js >= 18.0.0** requerido (para `fs.promises` y `path.resolve` con soporte completo)
- **Windows**: Paths UNC (`\\server\share`) NO están soportados en esta fase
- **macOS/Linux**: Extensiones case-sensitive (`.txt` ≠ `.TXT`), pero `allowedExtensions` es case-insensitive

---

## Eventos y estados (visión raíz)
### **Estados del Motor de Permisos**

```
┌─────────────────┐
│  UNINITIALIZED  │ → Config no cargado
└────────┬────────┘
         ▼
┌─────────────────┐
│  CONFIG_LOADED  │ → Config válido en memoria
└────────┬────────┘
         │ checkPermission(path, op)
┌─────────────────┐
│   EVALUATING    │ → Aplicando 6 reglas
└────────┬────────┘
         │
         ├──► { allowed: true }  ──► PERMITIDO → Tool ejecuta operación
         │
         └──► { allowed: false } ──► DENEGADO → Tool devuelve error MCP
```

1. **ConfigLoaded** (Fase 2.2)
   - Emitido cuando `config.json` se carga exitosamente
   - Consumidores: `server.ts` para actualizar la instancia global

2. **PermissionDenied** (Fase 2.3)
   - Emitido cuando el motor deniega una operación
   - Payload: `{ path: string, operation: Operation, reason: string, timestamp: ISO8601 }`

3. **PermissionGranted** (Fase 2.3)
   - Emitido cuando el motor permite una operación

4. **PathTraversalDetected** (Fase 2.1)
   - Emitido cuando se detecta un intento de path traversal

5. **ConfigValidationError** (Fase 2.2)
   - Emitido cuando `config.json` no pasa validación Zod

### **Transiciones de Estado de Archivos**

Archivo no existe → write(permitido) → Archivo existe → read(permitido) → Contenido leído
                                                      ↘
                                                        write(denegado) → Error MCP
```

---

## Criterios de aceptación (root)

### **CA-2.1: Resolución de Rutas**

- [ ] **CA-2.1.6**: `isPathSafe("C:\Users\user\projects\file.txt", "C:\Users\user\projects")` devuelve `true` en Windows
- [ ] **CA-2.1.7**: Tests unitarios de `isPathSafe` cubren 10+ casos de path traversal
- [ ] **CA-2.1.8**: Rutas con espacios, acentos y caracteres Unicode se resuelven correctamente
- [ ] **CA-2.2.2**: `loadConfig()` con un JSON sin el campo `version` lanza `ZodError` con mensaje descriptivo
- [ ] **CA-2.2.4**: `loadConfig()` con `maxFileSizeBytes: -1` lanza error de validación (debe ser positivo)
- [ ] **CA-2.2.5**: `loadConfig()` con un archivo inexistente devuelve la configuración por defecto sin lanzar

### **CA-2.3: Motor de Evaluación**

**Regla 1: Denegación Explícita**
- [ ] **CA-2.3.1**: Una ruta en `denied` devuelve `{ allowed: false, reason: "denied_path" }`
- [ ] **CA-2.3.2**: Una ruta en `denied` Y en `allowed` devuelve denegado (denegación tiene prioridad)
- [ ] **CA-2.3.3**: Una ruta hija de una entrada en `denied` también es denegada (ej: `~/.ssh/keys/id_rsa` si `~/.ssh` está denegado)

**Regla 2: Ruta No Autorizada**
- [ ] **CA-2.3.4**: Una ruta fuera de todas las entradas `allowed` devuelve `{ allowed: false, reason: "path_not_allowed" }`
- [ ] **CA-2.3.5**: Path traversal que intente salir de una ruta `allowed` devuelve `path_not_allowed`

**Regla 3: Operación No Permitida**
- [ ] **CA-2.3.6**: Una ruta permitida con `operations: ["read"]` devuelve denegado para `operation: "write"` con `reason: "operation_not_allowed"`
- [ ] **CA-2.3.7**: Una ruta con `operations: ["read", "list"]` permite ambas operaciones correctamente

**Regla 4: Tamaño de Archivo**
- [ ] **CA-2.3.8**: Un archivo de 6 MB con `maxFileSizeBytes: 5242880` devuelve `{ allowed: false, reason: "file_too_large" }`
- [ ] **CA-2.3.9**: Un archivo de 4 MB con el mismo límite devuelve permitido
- [ ] **CA-2.3.10**: Una operación `write` en un archivo inexistente (creación) NO aplica Regla 4 (no hay archivo para medir)
- [ ] **CA-2.3.11**: Una operación `list` NO aplica Regla 4

**Regla 5: Extensión**
- [ ] **CA-2.3.12**: Un archivo `.exe` con `allowedExtensions: [".txt", ".js"]` devuelve `{ allowed: false, reason: "extension_not_allowed" }`
- [ ] **CA-2.3.13**: Un archivo `.TXT` con `allowedExtensions: [".txt"]` es permitido (case-insensitive)
- [ ] **CA-2.3.14**: Un archivo sin extensión (ej: `Makefile`) NO aplica Regla 5 (se asume permitido si no hay extensión)
- [ ] **CA-2.3.15**: Una operación `search` NO aplica Regla 5

**Regla 6: Permitir**
- [ ] **CA-2.3.16**: Una ruta válida con operación permitida, tamaño y extensión correctos devuelve `{ allowed: true }`

**Casos Edge**
- [ ] **CA-2.3.17**: Un error de `stat()` en un archivo existente no crashea el motor (loguea y procede)
- [ ] **CA-2.3.18**: Una config con `allowed: []` deniega todas las operaciones
- [ ] **CA-2.3.19**: Una ruta exactamente igual a la base (ej: `~/projects` == `~/projects`) es permitida

### **CA-2.4: Cobertura de Tests**

- [ ] **CA-2.4.1**: Suite de tests en `tests/permissions/evaluator.test.ts` existe y ejecuta
- [ ] **CA-2.4.2**: Cobertura del módulo `evaluator.ts` >= 95%
- [ ] **CA-2.4.3**: Cobertura del módulo `path-resolver.ts` >= 95%
- [ ] **CA-2.4.4**: Al menos 10 tests de path traversal con variantes: `../`, `..\`, codificación URL, double encoding
- [ ] **CA-2.4.5**: Tests parametrizados para diferentes OS (Windows, Unix)
- [ ] **CA-2.4.6**: Todos los tests pasan en CI/CD (GitHub Actions con Node 18 y 20)

### **CA-2.5: Integración en Tools**

- [ ] **CA-2.5.1**: `read-file.ts` llama a `checkPermission` ANTES de `fs.promises.readFile()`
- [ ] **CA-2.5.2**: Si `checkPermission` retorna denegado, la tool devuelve un error MCP con el `reason`
- [ ] **CA-2.5.3**: Las 5 tools (read, write, list, search, get_permissions) están integradas con el motor
- [ ] **CA-2.5.4**: `get_permissions` devuelve el objeto `Config` completo (no un objeto vacío como en Fase 1)
- [ ] **CA-2.5.5**: Los mensajes de error MCP incluyen el `reason` de denegación (ej: `"Access denied: denied_path"`)
- [ ] **CA-2.5.6**: Ninguna tool ejecuta operaciones de filesystem si el permiso es denegado

### **CA-2.6: Pruebas de Integración de Seguridad**

- [ ] **CA-2.6.1**: **Test de lectura permitida**: Leer un archivo en una ruta `allowed` con operación `read` → éxito
- [ ] **CA-2.6.2**: **Test de denied explícito**: Intentar leer `~/.ssh/id_rsa` (en `denied`) → error con `denied_path`
- [ ] **CA-2.6.3**: **Test de path traversal**: Intentar leer `~/projects/../.ssh/id_rsa` → error (no permite salir de `~/projects`)
- [ ] **CA-2.6.4**: **Test de operación no permitida**: Intentar escribir en una ruta marcada solo como `read` → error con `operation_not_allowed`
- [ ] **CA-2.6.5**: **Test de extensión prohibida**: Intentar leer un archivo `.exe` con `allowedExtensions` que no lo incluye → error con `extension_not_allowed`

---

## Trazabilidad

### **Mapeo: Tareas del Plan → Componentes → Criterios de Aceptación**

| Tarea del work-plan.md | Componente de Código | Criterios de Aceptación Relacionados |
|-------------------------|----------------------|--------------------------------------|
| 2.1 - Resolución de rutas | `src/permissions/path-resolver.ts` | CA-2.1.1 a CA-2.1.8 |
| 2.2 - Validación de Config | `src/permissions/config-loader.ts` (Zod) | CA-2.2.1 a CA-2.2.6 |
| 2.3 - Motor de evaluación | `src/permissions/evaluator.ts` | CA-2.3.1 a CA-2.3.19 |
| 2.4 - Tests exhaustivos | `tests/permissions/*.test.ts` | CA-2.4.1 a CA-2.4.6 |
| 2.5 - Integración en tools | `src/tools/*.ts` + `src/server.ts` | CA-2.5.1 a CA-2.5.6 |
| 2.6 - Prueba de integración | `tests/integration/security.test.ts` | CA-2.6.1 a CA-2.6.5 |

### **Trazabilidad Inversa: Principios → Implementación**

| Principio | Archivo de Código | Línea/Función Clave |
|-----------|-------------------|---------------------|
| P1 - Deny by Default | `evaluator.ts` | `checkPermission()` - Regla 2 |
| P2 - Explicit Denial Trumps All | `evaluator.ts` | `checkPermission()` - Regla 1 (se evalúa primero) |
| P3 - Orden Estricto de 6 Reglas | `evaluator.ts` | `checkPermission()` - estructura if/else secuencial |
| P4 - Path Traversal = Denegación | `path-resolver.ts` | `isPathSafe()` |
| P5 - No Excepciones en Runtime | `evaluator.ts` | Todos los bloques try/catch, manejo de errores de `stat()` |
| P6 - Config Inmutable | `evaluator.ts` | Parámetro `config: Readonly<Config>` |
| P7 - Zero Trust | `src/tools/*.ts` | Todas las tools llaman a `checkPermission()` antes de operar |
| P8 - Tipo de Retorno Consistente | `evaluator.ts` | Tipo `PermissionResult` |

### **Matriz de Riesgos de Seguridad**

| Riesgo | Mitigación | Componente | CA de Validación |
|--------|------------|------------|------------------|
| Path Traversal (`../`) | `isPathSafe()` valida que resolved path esté bajo base | `path-resolver.ts` | CA-2.1.5, CA-2.3.5, CA-2.6.3 |
| Bypass de denegación | `denied` se evalúa primero en el motor | `evaluator.ts` | CA-2.3.2, CA-2.6.2 |
| Escalación de privilegios | Operaciones validadas individualmente por ruta | `evaluator.ts` | CA-2.3.6, CA-2.6.4 |
| Acceso a archivos sensibles | Rutas críticas (`~/.ssh`) en `denied` por defecto | `config-loader.ts` | CA-2.6.2 |
| DoS por archivo gigante | Límite `maxFileSizeBytes` aplicado en Regla 4 | `evaluator.ts` | CA-2.3.8 |
| Inyección de código | Extensiones peligrosas (`.exe`, `.sh`) excluidas por defecto | `config-loader.ts` | CA-2.3.12, CA-2.6.5 |

### **Dependencias entre Módulos**

```
config-loader.ts (Zod schema)
       ↓ provee Config
path-resolver.ts (expandHome, isPathSafe)
       ↓ usa para resolver/validar rutas
evaluator.ts (checkPermission)
       ↓ consume Config y path-resolver
src/tools/*.ts (read, write, list, etc.)
       ↓ llaman a evaluator antes de operar
server.ts (MCP request handlers)
       ↓ orquestan tools con config cargado
```

### **Documentación de Referencia**

- **ONE_SPEC (este documento)**: Especificación raíz de Fase 2
- **work-plan.md**: Plan de tareas detallado (Fase 2 completa)
- **README.md**: Documentación pública del motor de permisos (Fase 5)
- **SECURITY.md**: Modelo de amenazas y mejores prácticas (Fase 5)

---

## Resumen Ejecutivo de Fase 2

**Duración estimada**: 1 semana (40 horas)

**Entregables clave**:
1. Motor de permisos operativo con 6 reglas de validación
2. Protección completa contra path traversal
3. 95% de cobertura de tests en componentes críticos
4. Integración en todas las tools existentes de MCP
5. Archivo de configuración validado con Zod

**Criterio de éxito final**: Ejecutar los 5 tests de CA-2.6 (integración de seguridad) y que todos pasen sin fallos.

**Próximos pasos post-Fase 2**: Fase 3 (CLI de configuración interactiva) para facilitar la gestión de permisos sin editar JSON manualmente.
