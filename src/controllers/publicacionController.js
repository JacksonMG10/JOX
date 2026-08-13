const db = require('../config/db');

// 1. Crear una publicación (post) con imagen opcional
exports.crearPublicacion = async (req, res) => {
    try {
        const { contenido, categoria, vehiculo_referencia } = req.body;
        const usuario_id = req.usuario.id_usuario;

        const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;
        const etiquetaFinal = categoria || 'General';

        const [resultado] = await db.query(
            'INSERT INTO publicacion (usuario_id, contenido, etiqueta, vehiculo_referencia, imagen_url) VALUES (?, ?, ?, ?, ?)',
            [usuario_id, contenido, etiquetaFinal, vehiculo_referencia || null, imagen_url]
        );

        const idNuevoPost = resultado.insertId;

        // Consultamos el post recién creado con el formato exacto que espera React
        const [[nuevoPost]] = await db.query(`
            SELECT 
                p.id, p.usuario_id, p.contenido, p.vehiculo_referencia, p.imagen_url,
                p.fecha_creacion AS fecha, p.etiqueta AS categoria,
                CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre,
                0 AS total_likes,
                0 AS like_usuario
            FROM publicacion p
            JOIN usuario u ON p.usuario_id = u.id_usuario
            WHERE p.id = ?
        `, [idNuevoPost]);

        // Aseguramos que tenga el array de comentarios vacío para el frontend
        nuevoPost.comentarios = [];
        nuevoPost.like_usuario = false;

        // EMITIR SOCKET: Nueva publicación a todos los conectados
        if (req.io) {
            req.io.emit('nueva_publicacion', nuevoPost);
        }

        res.status(201).json({
            mensaje: '¡Publicación compartida con éxito!',
            post: nuevoPost
        });

    } catch (error) {
        console.error('Error en Publicación:', error.message);
        res.status(500).json({ mensaje: 'Error al crear la publicación' });
    }
};

// 2. Ver todas las publicaciones (Muro Social) con paginación, filtros y likes
exports.obtenerMuro = async (req, res) => {
    try {
        const usuario_id = req.usuario.id_usuario;
        
        // Paginación y Filtros enviados desde React
        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        const { category, search } = req.query;

        // Construir consulta dinámica
        let queryStr = `
            SELECT 
                p.id, p.usuario_id, p.contenido, p.vehiculo_referencia, p.imagen_url, 
                p.fecha_creacion AS fecha, p.etiqueta AS categoria,
                CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre,
                (SELECT COUNT(*) FROM reaccion r WHERE r.publicacion_id = p.id AND r.tipo = 'like') AS total_likes,
                EXISTS(SELECT 1 FROM reaccion r2 WHERE r2.publicacion_id = p.id AND r2.usuario_id = ? AND r2.tipo = 'like') AS like_usuario
            FROM publicacion p 
            JOIN usuario u ON p.usuario_id = u.id_usuario 
            WHERE 1=1
        `;
        const queryParams = [usuario_id];

        if (category && category !== 'Todo') {
            queryStr += ` AND p.etiqueta = ?`;
            queryParams.push(category);
        }

        if (search) {
            queryStr += ` AND p.contenido LIKE ?`;
            queryParams.push(`%${search}%`);
        }

        queryStr += ` ORDER BY p.fecha_creacion DESC LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);

        const [publicaciones] = await db.query(queryStr, queryParams);

        // Buscar comentarios para cada publicación con los nombres de variables que React espera
        const publicacionesConComentarios = await Promise.all(
            publicaciones.map(async (pub) => {
                const [comentarios] = await db.query(
                    `SELECT c.texto, c.fecha_creacion AS fecha, CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre 
                     FROM comentario c 
                     JOIN usuario u ON c.usuario_id = u.id_usuario 
                     WHERE c.publicacion_id = ? 
                     ORDER BY c.fecha_creacion ASC`,
                    [pub.id]
                );
                
                return {
                    ...pub,
                    like_usuario: Boolean(pub.like_usuario), // Asegurar que sea booleano para React
                    comentarios: comentarios
                };
            })
        );

        res.json(publicacionesConComentarios);

    } catch (error) {
        console.error('Error al obtener muro:', error.message);
        res.status(500).json({ mensaje: 'Error al obtener el muro social' });
    }
};

// 3. Dar o Quitar Like con Sockets
exports.darLike = async (req, res) => {
    try {
        const { postId } = req.body; // React envía 'postId' en vez de 'id_publicacion'
        const usuario_id = req.usuario.id_usuario;

        try {
            await db.query(
                'INSERT INTO reaccion (usuario_id, publicacion_id, tipo) VALUES (?, ?, "like")',
                [usuario_id, postId]
            );
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                await db.query(
                    'DELETE FROM reaccion WHERE usuario_id = ? AND publicacion_id = ?',
                    [usuario_id, postId]
                );
            } else {
                throw error;
            }
        }

        // Obtener el conteo actualizado
        const [[{ total_likes }]] = await db.query(
            'SELECT COUNT(*) AS total_likes FROM reaccion WHERE publicacion_id = ? AND tipo = "like"',
            [postId]
        );

        // EMITIR SOCKET: Notificar el nuevo conteo de likes
        if (req.io) {
            req.io.emit('nuevo_like', { postId: postId, likesCount: total_likes });
        }

        res.json({ mensaje: 'Reacción procesada', total_likes });

    } catch (error) {
        console.error('Error en Like:', error.message);
        res.status(500).json({ mensaje: 'Error al procesar la reacción' });
    }
};

// 4. Agregar un comentario a una publicación con Sockets
exports.comentarPublicacion = async (req, res) => {
    try {
        const { postId, texto } = req.body; // React envía 'postId' y 'texto'
        const usuario_id = req.usuario.id_usuario;

        const [resultado] = await db.query(
            'INSERT INTO comentario (publicacion_id, usuario_id, texto) VALUES (?, ?, ?)',
            [postId, usuario_id, texto]
        );

        // Obtener nombre del usuario para enviarlo por socket
        const [[usuario]] = await db.query('SELECT CONCAT(nombre, " ", apellido) AS usuario_nombre FROM usuario WHERE id_usuario = ?', [usuario_id]);

        const nuevoComentario = {
            texto: texto,
            usuario_nombre: usuario.usuario_nombre,
            fecha: new Date()
        };

        // EMITIR SOCKET: Notificar el nuevo comentario
        if (req.io) {
            req.io.emit('nuevo_comentario', { postId: postId, comment: nuevoComentario });
        }

        res.status(201).json({
            mensaje: 'Comentario agregado',
            comentario: nuevoComentario
        });
    } catch (error) {
        console.error('Error al comentar:', error.message);
        res.status(500).json({ mensaje: 'Error al procesar el comentario' });
    }
};

// 5. Eliminar una publicación
exports.eliminarPublicacion = async (req, res) => {
    try {
        const { id_publicacion } = req.params; 
        const usuario_id = req.usuario.id_usuario; 

        const [resultado] = await db.query(
            'DELETE FROM publicacion WHERE id = ? AND usuario_id = ?',
            [id_publicacion, usuario_id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ 
                mensaje: 'No se encontró la publicación o no tienes permiso para eliminarla' 
            });
        }

        res.json({ mensaje: 'Publicación eliminada correctamente' });

    } catch (error) {
        console.error('Error al eliminar:', error.message);
        res.status(500).json({ mensaje: 'Error al intentar eliminar la publicación' });
    }
};

// 6. Editar el texto de una publicación
exports.editarPublicacion = async (req, res) => {
    try {
        const { id_publicacion } = req.params;
        const { contenido } = req.body;
        const usuario_id = req.usuario.id_usuario;

        const [resultado] = await db.query(
            'UPDATE publicacion SET contenido = ? WHERE id = ? AND usuario_id = ?',
            [contenido, id_publicacion, usuario_id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'No se pudo editar: la publicación no existe o no eres el dueño' });
        }

        res.json({ mensaje: 'Publicación actualizada correctamente' });

    } catch (error) {
        console.error('Error al editar:', error.message);
        res.status(500).json({ mensaje: 'Error al actualizar la publicación' });
    }
};