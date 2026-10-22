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
- `GET /api/Tienda/Productos?categoria=ordenadores/portatiles&pagina=1&limite=24` resuelve los slugs desde la raíz y filtra `productos.pathCategoria` por el `pathCat` exacto. Devuelve campos de tarjeta, paginación y solo la primera imagen. `limite` admite valores de 1 a 100; `pagina` y `limite` deben ser enteros positivos. Parámetros inválidos responden `400`, categoría inexistente `404` y fallos de base de datos `500`.

Las pruebas unitarias del árbol, resolución de categoría, proyección y paginación se ejecutan con `npm test` y no requieren conexión a MongoDB.
