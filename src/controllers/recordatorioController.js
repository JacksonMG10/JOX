const db = require('../config/db');

// 1. Crear un recordatorio usando los nombres de tu tabla SQL
exports.crearRecordatorio = async (req, res) => {
    try {
        // Recibimos los datos del Body de Thunder Client
        const { id_vehiculo, tipo_recordatorio, fecha_recordatorio } = req.body;

        // INSERT ajustado a tus columnas: titulo y fecha_limite
        const [resultado] = await db.query(
            'INSERT INTO RECORDATORIO (id_vehiculo, titulo, fecha_limite) VALUES (?, ?, ?)',
            [id_vehiculo, tipo_recordatorio, fecha_recordatorio]
        );

        res.status(201).json({
            mensaje: '¡Recordatorio programado con éxito!',
            id_recordatorio: resultado.insertId
        });

    } catch (error) {
        console.error('ERROR EN BASE DE DATOS:', error.message);
        res.status(500).json({ 
            mensaje: 'Hubo un error al guardar en la base de datos',
            error: error.message 
        });
    }
};

// 2. Obtener recordatorios (JOIN corregido)
exports.obtenerMisRecordatorios = async (req, res) => {
    try {
        const id_usuario = req.usuario.id_usuario;

        const [recordatorios] = await db.query(
            `SELECT r.*, v.marca, v.modelo 
            FROM RECORDATORIO r 
            JOIN VEHICULO v ON r.id_vehiculo = v.id_vehiculo 
            WHERE v.id_usuario = ? 
            ORDER BY r.fecha_limite ASC`,
            [id_usuario]
        );

        res.json(recordatorios);

    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener recordatorios' });
    }
};