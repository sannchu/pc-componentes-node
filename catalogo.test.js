'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { slugify, buildCategoryTree, resolveCategoryPath, categoryProductFilter, productListing, findAllProducts } = require('./catalogo');

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
  assert.equal(resolveCategoryPath(tree, 'portatiles').pathCat, '2-1');
  assert.equal(resolveCategoryPath(tree, 'ordenadores/moviles'), null);
  assert.equal(resolveCategoryPath(tree, 'ordenadores/../secret'), null);
});

test('resolveCategoryPath solo resuelve slugs globales cuando son únicos', () => {
  const tree = buildCategoryTree([
    ...categories,
    { nombre: 'Portátiles', pathCat: '3-1' },
    { nombre: 'Accesorios', pathCat: '4' },
    { nombre: 'Portátiles', pathCat: '4-1' },
  ]);
  assert.equal(resolveCategoryPath(tree, 'portatiles'), null);
  assert.equal(resolveCategoryPath(tree, 'ordenadores/portatiles').pathCat, '2-1');
  assert.equal(resolveCategoryPath(tree, 'accesorios/portatiles').pathCat, '4-1');
});

test('categoryProductFilter includes category and every descendant only when requested', () => {
  const tree = buildCategoryTree([
    { nombre: 'Ordenadores', pathCat: '2' },
    { nombre: 'Portátiles', pathCat: '2-1' },
    { nombre: 'Por tipo', pathCat: '2-1-1' },
    { nombre: 'Gaming', pathCat: '2-1-1-1' },
    { nombre: 'Sobremesa', pathCat: '2-2' },
  ]);
  const computers = tree.find((item) => item.pathCat === '2');
  assert.deepEqual(categoryProductFilter(computers), { pathCategoria: '2' });
  assert.deepEqual(categoryProductFilter(computers, true), { pathCategoria: { $in: ['2', '2-1', '2-1-1', '2-1-1-1', '2-2'] } });
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

test('findAllProducts utiliza el filtro de descendientes y devuelve todo sin disponibilidad como condición', async () => {
  const expectedFilter = { pathCategoria: { $in: ['2', '2-1', '2-1-1'] } };
  const products = Array.from({ length: 137 }, (_, index) => ({ _id: `d${index + 1}`, disponible: index % 2 === 0 }));
  let receivedFilter;
  const collection = {
    find(filter) {
      receivedFilter = filter;
      return { toArray: async () => products };
    },
  };
  const result = await findAllProducts(collection, expectedFilter);
  assert.equal(result.length, 137);
  assert.equal(result.filter((product) => product.disponible === false).length, 68);
  assert.deepEqual(receivedFilter, expectedFilter);
});
