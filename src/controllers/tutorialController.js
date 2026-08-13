const db = require('../config/db');

// 1. Obtener todos los tutoriales (Para que el usuario busque qué aprender)
exports.obtenerTutoriales = async (req, res) => {
    try {
        const [tutoriales] = await db.query('SELECT * FROM TUTORIAL');
        res.json(tutoriales);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener los tutoriales' });
    }
};

// 2. Buscar tutoriales por categoría (ej: 'Frenos', 'Motor')
exports.obtenerPorCategoria = async (req, res) => {
    try {
        const { categoria } = req.params;
        const [tutoriales] = await db.query(
            'SELECT * FROM TUTORIAL WHERE categoria = ?',
            [categoria]
        );
        res.json(tutoriales);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al filtrar tutoriales' });
    }
};

// 3. Crear un tutorial (Simulando que eres el administrador)
exports.crearTutorial = async (req, res) => {
    try {
        const { categoria, titulo_guia, descripcion_falla, url_video } = req.body;
        const [resultado] = await db.query(
            'INSERT INTO TUTORIAL (categoria, titulo_guia, descripcion_falla, url_video) VALUES (?, ?, ?, ?)',
            [categoria, titulo_guia, descripcion_falla, url_video]
        );
        res.status(201).json({ mensaje: 'Tutorial cargado', id_tutorial: resultado.insertId });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al crear tutorial' });
    }
};