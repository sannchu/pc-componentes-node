# pc-componentes-node

Backend de PcComponentes desarrollado con Node.js y Express.

## Requisitos

- Node.js
- npm

## Desarrollo

```bash
npm install
npm start
```

El servidor escucha en el puerto `3000`.

## Catálogo

- `GET /api/Tienda/Categorias` devuelve la respuesta `{ codigo, mensaje, categorias }`. `categorias` es un árbol ordenado; cada categoría conserva `pathCat`, incluye un `slug` derivado de `nombre` cuando hace falta y expone sus descendientes en `hijos`.
- `GET /api/Tienda/Productos?categoria=ordenadores/portatiles` resuelve los slugs desde el árbol completo de `categorias` y filtra `productos.pathCategoria` por el `pathCat` exacto. También admite un slug global único, por ejemplo `GET /api/Tienda/Productos?categoria=portatiles`, que resuelve la categoría aunque no sea raíz; los slugs globales duplicados requieren contexto jerárquico para evitar seleccionar una categoría arbitraria.
- Para mostrar toda una rama, pasar `descendientes=true`, por ejemplo `GET /api/Tienda/Productos?categoria=ordenadores&descendientes=true`. El filtro incluye el `pathCat` seleccionado y todos los `pathCat` de sus descendientes obtenidos del árbol de Mongo.
- Ambas variantes devuelven todos los documentos coincidentes, sin paginación ni filtro por disponibilidad; conservan los campos de tarjeta (`valoracionMedia` y `numeroOpiniones` incluidos), mantienen `disponible` solo cuando existe en el documento y proyectan solo la primera imagen. El parámetro `categoria` es obligatorio (`400`), una categoría inexistente o ambigua responde `404` y los fallos de base de datos responden `500`.

Para preparar la consulta del catálogo en un entorno configurado, se puede ejecutar `node scripts/ensureCatalogIndexes.js`. El script asegura idempotentemente el índice no único `productos.pathCategoria_1`; no se ejecuta automáticamente al iniciar el servidor.

Las pruebas unitarias del árbol, resolución de categoría, proyección y consulta sin truncamiento se ejecutan con `npm test` y no requieren conexión a MongoDB.
