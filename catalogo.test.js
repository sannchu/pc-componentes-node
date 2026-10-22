'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { slugify, buildCategoryTree, resolveCategoryPath, productListing, parsePagination } = require('./catalogo');

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
  assert.deepEqual(listing, { _id: 'p1', nombre: 'Portátil', marca: 'Marca', precio: 799, imagen: '/main.jpg', valoraciones: 4.7, numeroOpiniones: 18 });
  assert.equal('disponible' in listing, false);
});

test('parsePagination aplica defaults y valida enteros positivos con máximo de límite', () => {
  assert.deepEqual(parsePagination({}), { pagina: 1, limite: 24 });
  assert.deepEqual(parsePagination({ pagina: '2', limite: '100' }), { pagina: 2, limite: 100 });
  assert.equal(parsePagination({ pagina: '0' }), null);
  assert.equal(parsePagination({ limite: '101' }), null);
  assert.equal(parsePagination({ pagina: '1.5' }), null);
});
