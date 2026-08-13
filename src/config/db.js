const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

// Probamos la conexión
promisePool.getConnection()
    .then(connection => {
        console.log('¡Conexión exitosa a la base de datos MySQL de JTRACK!');
        connection.release();
    })
    .catch(err => {
        console.error('Error al conectar con la base de datos:', err.message);
    });

module.exports = promisePool;