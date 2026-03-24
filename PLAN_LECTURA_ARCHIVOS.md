# 📋 Plan de Desarrollo: Extracción Universal de Contenido

> **Proyecto:** `copilot-fs-mcp`  
> **Fecha:** Marzo 2026  
> **Objetivo:** Permitir que Copilot lea y extraiga contenido de cualquier tipo de archivo (PDF, Word, Excel, imágenes, ZIP, etc.)

---

## 🔴 Problema Raíz

En `src/tools/read-file.ts`, cuando un archivo está listado en `binaryExtensions`, el servidor devuelve el contenido como `base64` puro.  
Copilot **no puede leer** un PDF o DOCX en base64 — necesita **texto extraído y estructurado**.

La config de producción ya tiene `allowedExtensions: ["*"]` (correcto), pero `binaryExtensions` impide la extracción real del contenido.

---

## 🗂️ Arquitectura Propuesta

```
src/tools/
  read-file.ts              ← Modificar: agregar enrutador de parsers
  parsers/
    index.ts                ← Enrutador: extensión → parser correspondiente
    pdf-parser.ts           ← NUEVA
    docx-parser.ts          ← NUEVA
    excel-parser.ts         ← NUEVA
    pptx-parser.ts          ← NUEVA
    image-parser.ts         ← NUEVA
    zip-parser.ts           ← NUEVA
    csv-parser.ts           ← NUEVA
```

---

## 📦 FASE 1 — Dependencias npm

### Comando de instalación

```bash
npm install pdf-parse mammoth xlsx papaparse adm-zip sharp
npm install --save-dev @types/pdf-parse @types/mammoth @types/adm-zip
```

### Tabla de dependencias

| Paquete | Formatos soportados | Función |
|---|---|---|
| `pdf-parse` | `.pdf` | Extrae texto por página |
| `mammoth` | `.docx`, `.doc` | Convierte a texto/markdown limpio |
| `xlsx` (SheetJS) | `.xlsx`, `.xls`, `.csv` | Lee hojas como JSON estructurado |
| `papaparse` | `.csv` | Parsea CSV con headers automáticos |
| `adm-zip` | `.zip` | Lista archivos y extrae contenido de texto interno |
| `sharp` | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.tiff`, `.bmp` | Metadata + base64 optimizado |

> **Nota:** OCR con `tesseract.js` es opcional — se agrega en una fase posterior por su peso (~150MB).

---

## 🛠️ FASE 2 — Parsers Individuales

### `pdf-parser.ts`
```json
{
  "pages": 12,
  "text": "contenido completo del documento...",
  "metadata": { "title": "Informe Q1", "author": "Juan" }
}
```

### `docx-parser.ts`
```json
{
  "text": "# Título\n\nContenido en markdown...",
  "messages": []
}
```

### `excel-parser.ts`
```json
{
  "sheets": [
    { "name": "Hoja1", "rows": [["Col1", "Col2"], ["val1", "val2"]] }
  ]
}
```

### `pptx-parser.ts`
```json
{
  "slideCount": 10,
  "slides": [
    { "index": 1, "text": "Título de slide\nCuerpo del contenido..." }
  ]
}
```

### `image-parser.ts`
```json
{
  "mimeType": "image/png",
  "width": 1920,
  "height": 1080,
  "base64": "iVBORw0KGgo...",
  "sizeKB": 450
}
```
> Copilot con soporte de visión puede leer el `base64` si el modelo lo soporta.

### `zip-parser.ts`
```json
{
  "files": ["src/index.ts", "README.md", "package.json"],
  "textFiles": {
    "README.md": "# Mi Proyecto\n...",
    "package.json": "{ \"name\": \"...\" }"
  }
}
```

### `csv-parser.ts`
```json
{
  "headers": ["nombre", "edad", "ciudad"],
  "rows": [["Ana", "30", "Madrid"]],
  "totalRows": 1500
}
```

---

## ⚙️ FASE 3 — Modificar `src/tools/read-file.ts`

### Nuevo flujo de decisión

```
readFileTool(path)
  │
  ├─ checkPermission()           ← igual que hoy
  ├─ getParser(ext)              ← NUEVO: busca parser por extensión
  │     ├─ Si hay parser      → parser.extract(buf) → { text, metadata... }
  │     ├─ Si es texto puro   → utf8 como hoy
  │     └─ Si es binario sin parser → base64 + advertencia clara
  └─ return resultado estructurado
```

### Cambio semántico en `binaryExtensions`

`binaryExtensions` **deja de significar** "devolver base64 sin procesar" y pasa a ser una lista de formatos sin parser conocido que deben tratarse como datos opacos (`.exe`, `.dll`, `.bin`).

---

## 🔧 FASE 4 — Nuevo Tool: `extract_text`

Tool dedicado con más opciones de control para archivos grandes o complejos.

### Parámetros
```typescript
{
  path: string;              // Ruta al archivo
  options?: {
    maxPages?: number;       // Limitar páginas en PDFs largos
    sheetNames?: string[];   // Solo ciertas hojas en Excel
    chunkSize?: number;      // Fragmentar texto largo (evita saturar contexto)
    includeMetadata?: boolean;
    ocrEnabled?: boolean;    // Activar OCR en imágenes (requiere tesseract.js)
  }
}
```

### Registro en `src/index.ts`
```typescript
server.registerTool('extract_text', async (input) => {
  if (!currentConfig) throw new Error('Configuration not loaded');
  return extractTextTool(input, currentConfig);
}, 
  'Extract readable text content from any file type (PDF, Word, Excel, images, ZIP, etc.)',
  { 
    type: 'object', 
    properties: { 
      path: { type: 'string' }, 
      options: { type: 'object' } 
    }, 
    required: ['path'] 
  }
);
```

---

## ⚙️ FASE 5 — Actualizar Configuración

### `config.json` (producción)

```json
"security": {
  "maxFileSizeBytes": 20971520,
  "binaryExtensions": [".exe", ".dll", ".bin", ".so", ".dylib", ".class"],
  "parseable": {
    "maxPdfPages": 50,
    "maxExcelRows": 5000,
    "maxZipFiles": 100,
    "imageBase64": true,
    "ocrEnabled": false,
    "ocrTimeoutMs": 30000
  }
}
```

### `src/permissions/config-loader.ts` — Extender schema Zod

```typescript
const SecurityConfigSchema = z.object({
  maxFileSizeBytes: z.number().positive(),
  allowedExtensions: z.array(z.string()),
  binaryExtensions: z.array(z.string()).optional(),
  logAllAccess: z.boolean(),
  logPath: z.string().min(1),
  // NUEVO:
  parseable: z.object({
    maxPdfPages: z.number().positive().default(50),
    maxExcelRows: z.number().positive().default(5000),
    maxZipFiles: z.number().positive().default(100),
    imageBase64: z.boolean().default(true),
    ocrEnabled: z.boolean().default(false),
    ocrTimeoutMs: z.number().positive().default(30000),
  }).optional(),
});
```

---

## 🧪 FASE 6 — Tests

### Fixtures necesarios en `tests/fixtures/`
- `sample.pdf`
- `sample.docx`
- `sample.xlsx`
- `sample.csv`
- `sample.png`
- `sample.zip`

### Tests a crear
| Archivo | Qué verifica |
|---|---|
| `tests/pdf-parser.test.ts` | Extracción de texto, número de páginas, metadata |
| `tests/docx-parser.test.ts` | Conversión a markdown, tablas, estilos |
| `tests/excel-parser.test.ts` | Hojas múltiples, tipos de datos, límite de filas |
| `tests/image-parser.test.ts` | Dimensiones, mime type, base64 |
| `tests/csv-parser.test.ts` | Headers, filas, encoding |
| `tests/zip-parser.test.ts` | Lista de archivos, extracción de texto interno |

---

## 🗓️ Orden de Implementación

| Prioridad | Fase | Impacto estimado |
|---|---|---|
| **1** | FASE 1 (npm install) + parsers PDF y DOCX | Alto — formatos más usados |
| **2** | FASE 2 parsers Excel y CSV | Alto — datos estructurados |
| **3** | FASE 3 — enrutador en `read-file.ts` | Crítico — une todo |
| **4** | FASE 2 parsers Imagen y ZIP | Medio — casos frecuentes |
| **5** | FASE 4 — nuevo tool `extract_text` | Alto — casos avanzados |
| **6** | FASE 5 (config Zod) + FASE 6 (tests) | Estabilidad en producción |

---

## 📌 Estado de Implementación

- [x] FASE 1 — Instalar dependencias npm
- [x] FASE 2 — Parser PDF (`pdf-parser.ts`)
- [x] FASE 2 — Parser DOCX (`docx-parser.ts`)
- [x] FASE 2 — Parser Excel/CSV (`excel-parser.ts`, `csv-parser.ts`)
- [x] FASE 2 — Parser PowerPoint (`pptx-parser.ts`)
- [x] FASE 2 — Parser Imagen (`image-parser.ts`)
- [x] FASE 2 — Parser ZIP (`zip-parser.ts`)
- [x] FASE 3 — Enrutador en `read-file.ts`
- [x] FASE 4 — Nuevo tool `extract_text`
- [x] FASE 5 — Actualizar schema Zod en `config-loader.ts`
- [x] FASE 6 — Tests y fixtures (84 tests ✅, 0 fallos)
