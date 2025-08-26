// config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Configuraciones adicionales para debugging
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
};

console.log('🔧 Configuración de BD:', {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    port: dbConfig.port,
    password: '***' // No mostrar password real
});

const pool = mysql.createPool(dbConfig);

// Test database connection con más detalles
async function testConnection() {
    try {
        console.log('🔄 Intentando conectar a la base de datos...');
        
        // Primero intentar conectar sin especificar base de datos
        const tempConfig = { ...dbConfig };
        delete tempConfig.database;
        const tempPool = mysql.createPool(tempConfig);
        
        const tempConnection = await tempPool.getConnection();
        console.log('✅ Conexión al servidor MySQL exitosa');
        
        // Verificar si la base de datos existe
        const [databases] = await tempConnection.execute('SHOW DATABASES');
        const dbExists = databases.some(db => db.Database === process.env.DB_NAME);
        
        if (!dbExists) {
            console.log('⚠️ Base de datos no existe, creándola...');
            await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
            console.log('✅ Base de datos creada');
        }
        
        tempConnection.release();
        tempPool.end();
        
        // Ahora conectar con la base de datos específica
        const connection = await pool.getConnection();
        console.log('✅ Conexión a la base de datos exitosa');
        
        // Verificar versión de MySQL
        const [version] = await connection.execute('SELECT VERSION() as version');
        console.log('📊 Versión de MySQL:', version[0].version);
        
        connection.release();
        return true;
        
    } catch (error) {
        console.error('❌ Error de conexión a la base de datos:');
        console.error('Código de error:', error.code);
        console.error('Mensaje:', error.message);
        
        // Diagnósticos específicos por tipo de error
        switch (error.code) {
            case 'ECONNREFUSED':
                console.error('🔍 Diagnóstico: MySQL no está ejecutándose o puerto incorrecto');
                console.error('💡 Solución: Iniciar MySQL o verificar el puerto');
                break;
            case 'ER_ACCESS_DENIED_ERROR':
                console.error('🔍 Diagnóstico: Credenciales incorrectas');
                console.error('💡 Solución: Verificar usuario y contraseña');
                break;
            case 'ER_BAD_DB_ERROR':
                console.error('🔍 Diagnóstico: Base de datos no existe');
                console.error('💡 Solución: Crear la base de datos manualmente');
                break;
            default:
                console.error('🔍 Error desconocido:', error);
        }
        
        return false;
    }
}

// Función para cerrar el pool correctamente
async function closePool() {
    try {
        await pool.end();
        console.log('🔒 Pool de conexiones cerrado');
    } catch (error) {
        console.error('❌ Error cerrando pool:', error);
    }
}

// Manejar cierre graceful
process.on('SIGINT', async () => {
    console.log('🛑 Cerrando aplicación...');
    await closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Cerrando aplicación...');
    await closePool();
    process.exit(0);
});

module.exports = { pool, testConnection, closePool };