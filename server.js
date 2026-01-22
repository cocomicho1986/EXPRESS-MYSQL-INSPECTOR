// server.js
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 4001;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: 'congreso22'
};

async function getRawConnection() {
  return await mysql.createConnection(DB_CONFIG);
}

// Crear base de ejemplo si no existe
async function initializeExampleDB() {
  console.log('🔄 Inicializando base de práctica...');
  let conn;
  try {
    conn = await getRawConnection();
    const [dbs] = await conn.query("SHOW DATABASES LIKE 'practica_joins'");
    if (dbs.length > 0) {
      console.log('✅ practica_joins ya existe');
      return;
    }

    await conn.query('CREATE DATABASE practica_joins CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await conn.query('USE practica_joins');

    // Crear tabla categorias
    await conn.query(`
      CREATE TABLE categorias (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL
      )
    `);

    // Insertar en categorias
    await conn.query(`
      INSERT INTO categorias (nombre) VALUES 
        ('Electrónica'),
        ('Accesorios'),
        ('Hogar')
    `);

    // Crear tabla productos
    await conn.query(`
      CREATE TABLE productos (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL,
        precio DECIMAL(10,2),
        categoria_id INT,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id)
      )
    `);

    // Insertar en productos
    await conn.query(`
      INSERT INTO productos (nombre, precio, categoria_id) VALUES 
        ('Laptop', 1200.00, 1),
        ('Mouse', 25.50, 2),
        ('Teclado', 45.00, 2),
        ('Licuadora', 80.00, 3),
        ('Auriculares', 60.00, 1)
    `);

    console.log('✅ Base de práctica creada con productos y categorías');
  } catch (err) {
    console.error('⚠️ Error al crear base de práctica:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

// Obtener bases de datos accesibles
async function getAccessibleDatabases() {
  const hidden = new Set(['information_schema', 'mysql', 'performance_schema', 'sys']);
  const conn = await getRawConnection();
  try {
    const [rows] = await conn.query("SHOW DATABASES");
    const allDbs = rows.map(r => r.Database).filter(db => !hidden.has(db));
    
    const accessible = [];
    for (const db of allDbs) {
      try {
        await conn.query(`USE ??`, [db]);
        accessible.push(db);
      } catch (err) {
        console.warn(`⚠️ Saltando base inaccesible: ${db}`);
      }
    }
    return accessible;
  } finally {
    await conn.end();
  }
}

// Ruta principal
app.get('/', async (req, res) => {
  const databases = await getAccessibleDatabases();
  res.render('index', { databases, selectedDb: '', query: '', results: null, error: null });
});

// Ejecutar consulta
app.post('/', async (req, res) => {
  const { database, query } = req.body;
  let databases = [], results = null, error = null;

  try {
    databases = await getAccessibleDatabases();
    if (!database || !databases.includes(database)) {
      throw new Error('Base de datos no válida');
    }
    if (!query?.trim()) throw new Error('Escribe una consulta');
    if (!/^\s*SELECT\s+/i.test(query)) throw new Error('Solo se permiten SELECT');

    let safeQuery = query.trim().replace(/;+$/, '');
    if (!/LIMIT\s+\d+/i.test(safeQuery)) safeQuery += ' LIMIT 1000';

    const conn = await getRawConnection();
    await conn.query(`USE ??`, [database]);
    const [data, fields] = await conn.query(safeQuery);
    await conn.end();

    const safeData = data.map(row => {
      const safeRow = {};
      for (const key in row) {
        const val = row[key];
        if (val === null || val === undefined) {
          safeRow[key] = null;
        } else if (Buffer.isBuffer(val)) {
          safeRow[key] = '[BLOB]';
        } else if (typeof val === 'object') {
          safeRow[key] = JSON.stringify(val);
        } else {
          safeRow[key] = val;
        }
      }
      return safeRow;
    });

    results = {
      columns: fields.map(f => f.name),
      results: safeData,
      rowCount: data.length
    };
  } catch (err) {
    error = err.message || 'Error en la consulta';
  }

  res.render('index', { databases, selectedDb: database, query, results, error });
});

// Iniciar servidor
async function startServer() {
  await initializeExampleDB();
  app.listen(PORT, 'localhost', () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  });
}

// Ejecutar si se llama directamente
if (require.main === module) {
  startServer();
}