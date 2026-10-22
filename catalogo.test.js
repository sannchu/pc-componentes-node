'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { slugify, buildCategoryTree, resolveCategoryPath, productListing, findAllProducts } = require('./catalogo');

const categories = [
  { nombre: 'Portátiles', pathCat: '2-1' },
  { nombre: 'Ordenadores', pathCat: '2' },
  { nombre: 'Sobremesa', pathCat: '2-2' },
  { nombre: 'Periféricos', pathCat: '1' },
];

test('slugify genera slugs ASCII estables', () => {
  assert.equal(slugify('Ordenadores y Portátiles'), 'ordenadores-y-portatiles');
});

test('buildCategoryTree conserva pathCat y ordena raíz e hijos', () => {
  const tree = buildCategoryTree(categories);
  assert.deepEqual(tree.map((item) => item.pathCat), ['1', '2']);
  assert.deepEqual(tree[1].hijos.map((item) => item.pathCat), ['2-1', '2-2']);
  assert.equal(tree[1].hijos[0].slug, 'portatiles');
});

test('resolveCategoryPath resuelve ruta anidada y rechaza desconocida o inválida', () => {
  const tree = buildCategoryTree(categories);
  assert.equal(resolveCategoryPath(tree, 'ordenadores/portatiles').pathCat, '2-1');
  assert.equal(resolveCategoryPath(tree, 'ordenadores/moviles'), null);
  assert.equal(resolveCategoryPath(tree, 'ordenadores/../secret'), null);
});

test('productListing limita la respuesta a campos de tarjeta y una imagen principal', () => {
  const listing = productListing({
    _id: 'p1', nombre: 'Portátil', marca: 'Marca', precio: 799,
    imagenes: [{ url: '/main.jpg' }, { url: '/extra.jpg' }],
    valoracionMedia: 4.7, numeroOpiniones: 18,
    disponible: false, especificaciones: { memoria: '16GB' }, reseñas: ['larga'],
  });
  assert.deepEqual(listing, { _id: 'p1', nombre: 'Portátil', marca: 'Marca', precio: 799, imagen: '/main.jpg', valoracionMedia: 4.7, numeroOpiniones: 18, disponible: false });
  const withoutOptionalFields = productListing({ _id: 'p2', nombre: 'Otro portátil' });
  assert.equal('disponible' in withoutOptionalFields, false);
  assert.equal('valoracionMedia' in withoutOptionalFields, true);
  assert.equal(withoutOptionalFields.valoracionMedia, null);
});

test('findAllProducts no limita ni pagina y conserva todos los productos, incluidos no disponibles', async () => {
  const expectedFilter = { pathCategoria: '2-1' };
  const products = Array.from({ length: 137 }, (_, index) => ({
    _id: `p${index + 1}`,
    nombre: `Portátil ${index + 1}`,
    disponible: index % 2 === 0,
  }));
  let receivedFilter;
  let receivedOptions;
  const collection = {
    find(filter, options) {
      receivedFilter = filter;
      receivedOptions = options;
      return {
        toArray: async () => products,
        skip() { assert.fail('La consulta no debe paginar con skip'); },
        limit() { assert.fail('La consulta no debe truncar con limit'); },
      };
    },
  };

  const result = await findAllProducts(collection, expectedFilter, { projection: { nombre: 1 } });
  assert.equal(result.length, 137);
  assert.equal(result[0]._id, 'p1');
  assert.equal(result.at(-1)._id, 'p137');
  assert.equal(result.filter((product) => product.disponible === false).length, 68);
  assert.deepEqual(receivedFilter, expectedFilter);
  assert.deepEqual(receivedOptions, { projection: { nombre: 1 } });
});
