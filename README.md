# pc-componentes-node

Backend de PcComponentes con Node.js, Express y MongoDB.

## Iniciar

Instala las dependencias y arranca el servidor:

```bash
npm install
node server.js
```

El servidor escucha en `http://localhost:3000`. La configuración local se carga desde `.env`.

## Catálogo

- `GET /api/Tienda/Categorias?pathCat=principales` devuelve las categorías principales en `datos.categorias`. Para obtener las hijas de una categoría, pasa su `pathCat`, por ejemplo `?pathCat=2`.
- `GET /api/Tienda/Productos?pathCat=2-1` devuelve en `datos.productos` los productos cuya propiedad `pathCategoria` coincide exactamente con ese `pathCat`.
