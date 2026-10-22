'use strict';

const CATEGORY_FIELDS = ['nombre', 'name', 'nombreCat', 'nameCat'];

function slugify(value) {
  return String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function categoryName(category) {
  for (const field of CATEGORY_FIELDS) if (typeof category?.[field] === 'string' && category[field].trim()) return category[field].trim();
  return '';
}

function pathParts(pathCat) {
  return String(pathCat ?? '').split('-').filter(Boolean);
}

function comparePath(a, b) {
  const aa = pathParts(a.pathCat).map(Number);
  const bb = pathParts(b.pathCat).map(Number);
  for (let i = 0; i < Math.min(aa.length, bb.length); i++) if (aa[i] !== bb[i]) return aa[i] - bb[i];
  return aa.length - bb.length;
}

function buildCategoryTree(categories) {
  const nodes = categories.map((category) => ({
    ...category,
    slug: category.slug || slugify(categoryName(category)),
    hijos: [],
  }));
  const byPath = new Map(nodes.map((node) => [String(node.pathCat), node]));
  const roots = [];
  for (const node of nodes) {
    const parts = pathParts(node.pathCat);
    const parent = parts.length > 1 ? byPath.get(parts.slice(0, -1).join('-')) : null;
    if (parent) parent.hijos.push(node);
    else roots.push(node);
  }
  const sort = (items) => {
    items.sort(comparePath);
    for (const item of items) sort(item.hijos);
  };
  sort(roots);
  return roots;
}

function resolveCategoryPath(tree, slugPath) {
  const requested = String(slugPath ?? '').split('/').filter(Boolean);
  if (!requested.length || requested.some((part) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part))) return null;
  if (requested.length === 1 && /^\d+(?:-\d+)*$/.test(requested[0])) {
    const exactPathMatches = flattenCategoryTree(tree).filter((category) => String(category.pathCat) === requested[0]);
    return exactPathMatches.length === 1 ? exactPathMatches[0] : null;
  }
  if (requested.length === 1) {
    const allCategories = flattenCategoryTree(tree);
    const globalMatches = allCategories.filter((category) => category.slug === requested[0] || slugify(categoryName(category)) === requested[0]);
    return globalMatches.length === 1 ? globalMatches[0] : null;
  }
  let siblings = tree;
  let selected = null;
  for (const slug of requested) {
    const matches = siblings.filter((category) => category.slug === slug || slugify(categoryName(category)) === slug);
    if (matches.length > 1) return null;
    selected = matches[0] || null;
    if (!selected) {
      return null;
    }
    siblings = selected.hijos || [];
  }
  return selected;
}

function flattenCategoryTree(tree) {
  return tree.flatMap((category) => [category, ...flattenCategoryTree(category.hijos || [])]);
}

function categoryProductFilter(category, includeDescendants = false) {
  if (!includeDescendants) return { pathCategoria: category.pathCat };
  const paths = flattenCategoryTree([category]).map((item) => item.pathCat);
  return { pathCategoria: { $in: paths } };
}

function productListing(product) {
  const rawImages = product.imagenes ?? product.images ?? product.galeria;
  const mainImage = product.imagenPrincipal ?? product.imagen ?? product.image ?? (Array.isArray(rawImages) ? rawImages[0] : rawImages);
  return {
    _id: product._id,
    nombre: product.nombre ?? product.name ?? product.nombreProd ?? '',
    marca: product.marca ?? product.brand ?? '',
    precio: product.precio ?? product.price ?? null,
    imagen: typeof mainImage === 'object' && mainImage !== null ? (mainImage.url ?? mainImage.src ?? '') : (mainImage ?? ''),
    valoracionMedia: product.valoracionMedia ?? null,
    numeroOpiniones: product.numeroOpiniones ?? null,
    ...(Object.prototype.hasOwnProperty.call(product, 'disponible') ? { disponible: product.disponible } : {}),
  };
}

async function findAllProducts(collection, filter, options) {
  return collection.find(filter, options).toArray();
}

module.exports = { slugify, categoryName, buildCategoryTree, resolveCategoryPath, flattenCategoryTree, categoryProductFilter, productListing, findAllProducts };
