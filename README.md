# Menu-Michelitas

Borrador de menú digital moderno con:

- Fondo visual y layout responsivo por secciones.
- Panel oculto para administrar menú con **Ctrl + R**.
- CRUD básico de secciones y productos.
- Integración con Firebase Firestore (si hay configuración).
- Modo fallback con `localStorage` cuando Firebase no está activo.

## Archivos principales

- `index.html`: estructura visual + panel oculto.
- `styles.css`: estilo moderno inspirado en la marca.
- `app.js`: render del menú + lógica CRUD + integración Firestore.
- `firebase-config.example.js`: plantilla de configuración pública de Firebase.

## Conectar Firebase

1. Copia el archivo de ejemplo:

```bash
cp firebase-config.example.js firebase-config.js
```

2. Reemplaza los campos con **configuración pública web** de Firebase.

3. Agrega este script antes de `app.js` en `index.html`:

```html
<script src="firebase-config.js"></script>
```

> ⚠️ Nunca subas a frontend una clave de `service_account` (private key). Esa credencial debe quedarse en backend seguro o Cloud Functions.

## Estructura sugerida en Firestore

- `sections/{sectionId}`
  - `name: string`
  - `order: number`
  - `createdAt: timestamp`

- `products/{productId}`
  - `sectionId: string`
  - `name: string`
  - `description: string`
  - `price: string`
  - `order: number`
  - `createdAt: timestamp`
