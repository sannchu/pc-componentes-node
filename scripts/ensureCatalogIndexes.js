'use strict';

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function ensureCatalogIndexes() {
  const { MONGODB_URL, MONGODB_DBNAME } = process.env;
  if (!MONGODB_URL || !MONGODB_DBNAME) {
    throw new Error('MONGODB_URL y MONGODB_DBNAME deben estar configurados');
  }

  const client = new MongoClient(MONGODB_URL);
  try {
    await client.connect();
    await client.db(MONGODB_DBNAME)
      .collection('productos')
      .createIndex({ pathCategoria: 1 }, { name: 'pathCategoria_1' });
    console.log('Índice productos.pathCategoria_1 comprobado/creado');
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  ensureCatalogIndexes().catch((error) => {
    console.error(`No se pudo asegurar el índice del catálogo: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { ensureCatalogIndexes };
