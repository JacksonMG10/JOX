const db = require('../config/db');

// 1. CREAR PUBLICACIÓN

exports.crearPublicacion = async (req, res) => {

    try {

        const { contenido, categoria, vehiculo_referencia } = req.body;

        const usuario_id = req.usuario.id_usuario;

 

        if (!usuario_id) {

            return res.status(401).json({

                mensaje: 'Usuario no autenticado'

            });

        }

 

        if (!contenido || !String(contenido).trim()) {

            return res.status(400).json({

                mensaje: 'El contenido de la publicación es obligatorio'

            });

        }

 

        const imagen_url = req.file

            ? `/uploads/${req.file.filename}`

            : null;

 

        const etiquetaFinal =

            categoria && String(categoria).trim()

                ? String(categoria).trim()

                : 'General';

 

        const [resultado] = await db.query(

            `INSERT INTO publicacion

                (usuario_id, contenido, etiqueta, vehiculo_referencia, imagen_url)

             VALUES (?, ?, ?, ?, ?)`,

            [

                usuario_id,

                String(contenido).trim(),

                etiquetaFinal,

                vehiculo_referencia || null,

                imagen_url

            ]

        );

 

        const idNuevoPost = resultado.insertId;

 

        const [[nuevoPost]] = await db.query(

            `SELECT

                p.id,

                p.usuario_id,

                p.contenido,

                p.vehiculo_referencia,

                p.imagen_url,

                p.fecha_creacion AS fecha,

                p.etiqueta AS categoria,

                CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre,

                0 AS total_likes,

                0 AS like_usuario

             FROM publicacion p

             JOIN usuarios u ON p.usuario_id = u.id_usuario

             WHERE p.id = ?`,

            [idNuevoPost]

        );

 

        if (!nuevoPost) {

            return res.status(500).json({

                mensaje: 'La publicación fue creada pero no pudo recuperarse'

            });

        }

 

        nuevoPost.comentarios = [];

        nuevoPost.like_usuario = false;

 

        if (req.io) {

            req.io.emit('nueva_publicacion', nuevoPost);

        }

 

        return res.status(201).json({

            mensaje: '¡Publicación compartida con éxito!',

            post: nuevoPost

        });

 

    } catch (error) {

        console.error('Error en crearPublicacion:', error);

        return res.status(500).json({

            mensaje: 'Error al crear la publicación'

        });

    }

};


// 2. OBTENER MURO SOCIAL

exports.obtenerMuro = async (req, res) => {

    try {

        const usuario_id = req.usuario.id_usuario;

 

        if (!usuario_id) {

            return res.status(401).json({

                mensaje: 'Usuario no autenticado'

            });

        }

 

        let limit = parseInt(req.query.limit, 10) || 10;

        let page = parseInt(req.query.page, 10) || 1;

 

        // Evita valores inválidos o consultas demasiado grandes.

        limit = Math.min(Math.max(limit, 1), 100);

        page = Math.max(page, 1);

 

        const offset = (page - 1) * limit;

        const { category, search } = req.query;

 

        let queryStr = `

            SELECT

                p.id,

                p.usuario_id,

                p.contenido,

                p.vehiculo_referencia,

                p.imagen_url,

                p.fecha_creacion AS fecha,

                p.etiqueta AS categoria,

                CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre,

 

                (

                    SELECT COUNT(*)

                    FROM reaccion r

                    WHERE r.publicacion_id = p.id

                      AND r.tipo = 'like'

                ) AS total_likes,

 

                EXISTS(

                    SELECT 1

                    FROM reaccion r2

                    WHERE r2.publicacion_id = p.id

                      AND r2.usuario_id = ?

                      AND r2.tipo = 'like'

                ) AS like_usuario

 

            FROM publicacion p

            JOIN usuarios u

                ON p.usuario_id = u.id_usuario

 

            WHERE 1 = 1

        `;

 

        const queryParams = [usuario_id];

 

        if (category && category !== 'Todo') {

            queryStr += ` AND p.etiqueta = ?`;

            queryParams.push(category);

        }

 

        if (search && String(search).trim()) {

            queryStr += ` AND p.contenido LIKE ?`;

            queryParams.push(`%${String(search).trim()}%`);

        }

 

        queryStr += `

            ORDER BY p.fecha_creacion DESC

            LIMIT ? OFFSET ?

        `;

 

        queryParams.push(limit, offset);

 

        const [publicaciones] = await db.query(

            queryStr,

            queryParams

        );

 

        const publicacionesConComentarios = await Promise.all(

            publicaciones.map(async (pub) => {

                const [comentarios] = await db.query(

                    `SELECT

                        c.id,

                        c.texto,

                        c.fecha_creacion AS fecha,

                        c.usuario_id,

                        CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre

                     FROM comentario c

                     JOIN usuarios u

                        ON c.usuario_id = u.id_usuario

                     WHERE c.publicacion_id = ?

                     ORDER BY c.fecha_creacion ASC`,

                    [pub.id]

                );

 

                return {

                    ...pub,

                    total_likes: Number(pub.total_likes || 0),

                    like_usuario: Boolean(pub.like_usuario),

                    comentarios

                };

            })

        );

 

        return res.json(publicacionesConComentarios);

 

    } catch (error) {

        console.error('Error al obtener muro:', error);

        return res.status(500).json({

            mensaje: 'Error al obtener el muro social'

        });

    }

};

// 3. ESTADÍSTICAS REALES DEL USUARIO AUTENTICADO

exports.obtenerEstadisticasUsuario = async (req, res) => {

    try {

        const usuario_id = req.usuario.id_usuario;

 

        if (!usuario_id) {

            return res.status(401).json({

                mensaje: 'Usuario no autenticado'

            });

        }

 

        const [[estadisticas]] = await db.query(

            `SELECT

                (

                    SELECT COUNT(*)

                    FROM publicacion p

                    WHERE p.usuario_id = ?

                ) AS publicaciones,

 

                (

                    SELECT COUNT(*)

                    FROM reaccion r

                    INNER JOIN publicacion p

                        ON p.id = r.publicacion_id

                    WHERE p.usuario_id = ?

                      AND r.tipo = 'like'

                ) AS likes,

 

                (

                    SELECT COUNT(*)

                    FROM comentario c

                    INNER JOIN publicacion p

                        ON p.id = c.publicacion_id

                    WHERE p.usuario_id = ?

                ) AS comentarios`,

            [usuario_id, usuario_id, usuario_id]

        );

 

        const publicaciones = Number(

            estadisticas?.publicaciones || 0

        );

 

        const likes = Number(

            estadisticas?.likes || 0

        );

 

        const comentarios = Number(

            estadisticas?.comentarios || 0

        );

 

        return res.json({

            publicaciones,

            likes,

            comentarios,

            interacciones: likes + comentarios

        });

 

    } catch (error) {

        console.error(

            'Error al obtener estadísticas del usuario:',

            error

        );

 

        return res.status(500).json({

            mensaje: 'Error al obtener las estadísticas del usuario'

        });

    }

};

// 4. DAR O QUITAR LIKE
exports.darLike = async (req, res) => {

    try {

        const { postId } = req.body;

        const usuario_id = req.usuario.id_usuario;

 

        if (!usuario_id) {

            return res.status(401).json({

                mensaje: 'Usuario no autenticado'

            });

        }

 

        const idPost = Number(postId);

 

        if (!Number.isInteger(idPost) || idPost <= 0) {

            return res.status(400).json({

                mensaje: 'ID de publicación inválido'

            });

        }

 

        // Primero comprobamos que la publicación exista.

        const [[publicacion]] = await db.query(

            `SELECT id

             FROM publicacion

             WHERE id = ?`,

            [idPost]

        );

 

        if (!publicacion) {

            return res.status(404).json({

                mensaje: 'La publicación no existe'

            });

        }

 

        let accion;

 

        try {

            await db.query(

                `INSERT INTO reaccion

                    (usuario_id, publicacion_id, tipo)

                 VALUES (?, ?, 'like')`,

                [usuario_id, idPost]

            );

 

            accion = 'agregado';

 

        } catch (error) {

            if (error.code === 'ER_DUP_ENTRY') {

                await db.query(

                    `DELETE FROM reaccion

                     WHERE usuario_id = ?

                       AND publicacion_id = ?

                       AND tipo = 'like'`,

                    [usuario_id, idPost]

                );

 

                accion = 'quitado';

 

            } else {

                throw error;

            }

        }

 

        const [[conteo]] = await db.query(

            `SELECT COUNT(*) AS total_likes

             FROM reaccion

             WHERE publicacion_id = ?

               AND tipo = 'like'`,

            [idPost]

        );

 

        const total_likes = Number(

            conteo?.total_likes || 0

        );

 

        if (req.io) {

            req.io.emit('nuevo_like', {

                postId: idPost,

                likesCount: total_likes

            });

        }

 

        return res.json({

            mensaje:

                accion === 'agregado'

                    ? 'Like agregado'

                    : 'Like eliminado',

            total_likes

        });

 

    } catch (error) {

        console.error('Error en Like:', error);

 

        return res.status(500).json({

            mensaje: 'Error al procesar la reacción'

        });

    }

};

// 5. AGREGAR COMENTARIO

exports.comentarPublicacion = async (req, res) => {

    try {

        const { postId, texto } = req.body;

        const usuario_id = req.usuario.id_usuario;

 

        if (!usuario_id) {

            return res.status(401).json({

                mensaje: 'Usuario no autenticado'

            });

        }

 

        const idPost = Number(postId);

 

        if (!Number.isInteger(idPost) || idPost <= 0) {

            return res.status(400).json({

                mensaje: 'ID de publicación inválido'

            });

        }

 

        if (!texto || !String(texto).trim()) {

            return res.status(400).json({

                mensaje: 'El comentario no puede estar vacío'

            });

        }

 

        const [[publicacion]] = await db.query(

            `SELECT id

             FROM publicacion

             WHERE id = ?`,

            [idPost]

        );

 

        if (!publicacion) {

            return res.status(404).json({

                mensaje: 'La publicación no existe'

            });

        }

 

        const textoFinal = String(texto).trim();

 

        await db.query(

            `INSERT INTO comentario

                (publicacion_id, usuario_id, texto)

             VALUES (?, ?, ?)`,

            [idPost, usuario_id, textoFinal]

        );

 

        const [[usuario]] = await db.query(

            `SELECT

                CONCAT(nombre, ' ', apellido) AS usuario_nombre

             FROM usuarios

             WHERE id_usuario = ?`,

            [usuario_id]

        );

 

        const nuevoComentario = {

            texto: textoFinal,

            usuario_nombre:

                usuario?.usuario_nombre || 'Usuario',

            usuario_id,

            fecha: new Date()

        };

 

        if (req.io) {

            req.io.emit('nuevo_comentario', {

                postId: idPost,

                comment: nuevoComentario

            });

        }

 

        return res.status(201).json({

            mensaje: 'Comentario agregado',

            comentario: nuevoComentario

        });

 

    } catch (error) {

        console.error('Error al comentar:', error);

 

        return res.status(500).json({

            mensaje: 'Error al procesar el comentario'

        });

    }

};

// 6. ELIMINAR PUBLICACIÓN

exports.eliminarPublicacion = async (req, res) => {

    let connection;

 

    try {

        const { id_publicacion } = req.params;

        const usuario_id = req.usuario.id_usuario;

 

        if (!usuario_id) {

            return res.status(401).json({

                mensaje: 'Usuario no autenticado'

            });

        }

 

        const idPost = Number(id_publicacion);

 

        if (!Number.isInteger(idPost) || idPost <= 0) {

            return res.status(400).json({

                mensaje: 'ID de publicación inválido'

            });

        }

 

        // Verificamos primero quién es el propietario.

        const [[publicacion]] = await db.query(

            `SELECT

                id,

                usuario_id

             FROM publicacion

             WHERE id = ?`,

            [idPost]

        );

 

        if (!publicacion) {

            return res.status(404).json({

                mensaje: 'La publicación no existe'

            });

        }

 

        if (String(publicacion.usuario_id) !== String(usuario_id)) {

            return res.status(403).json({

                mensaje: 'No tienes permiso para eliminar esta publicación'

            });

        }


        connection = await db.getConnection();

 

        try {

            await connection.beginTransaction();

 

            // Eliminar reacciones de la publicación.

            await connection.query(

                `DELETE FROM reaccion

                 WHERE publicacion_id = ?`,

                [idPost]

            );

 

            // Eliminar comentarios de la publicación.

            await connection.query(

                `DELETE FROM comentario

                 WHERE publicacion_id = ?`,

                [idPost]

            );

 

            // Eliminar la publicación SOLO si sigue perteneciendo

            // al usuario autenticado.

            const [resultado] = await connection.query(

                `DELETE FROM publicacion

                 WHERE id = ?

                   AND usuario_id = ?`,

                [idPost, usuario_id]

            );

 

            if (resultado.affectedRows === 0) {

                await connection.rollback();

 

                return res.status(403).json({

                    mensaje:

                        'No tienes permiso para eliminar esta publicación'

                });

            }

 

            await connection.commit();

 

        } catch (transactionError) {

            try {

                await connection.rollback();

            } catch (_) {}

 

            throw transactionError;

 

        } finally {

            connection.release();

            connection = null;

        }

 

        // Avisar a los clientes conectados para actualizar el muro.

        if (req.io) {

            req.io.emit('publicacion_eliminada', {

                postId: idPost

            });

        }

 

        return res.json({

            mensaje: 'Publicación eliminada correctamente',

            id: idPost

        });

 

    } catch (error) {

        if (connection) {

            try {

                await connection.rollback();

            } catch (_) {}

 

            try {

                connection.release();

            } catch (_) {}

        }

 

        console.error('Error al eliminar:', error);

 

        return res.status(500).json({

            mensaje: 'Error al intentar eliminar la publicación'

        });

    }

};

// 7. EDITAR PUBLICACIÓN

exports.editarPublicacion = async (req, res) => {

    try {

        const { id_publicacion } = req.params;

        const { contenido } = req.body;

        const usuario_id = req.usuario.id_usuario;

 

        if (!usuario_id) {

            return res.status(401).json({

                mensaje: 'Usuario no autenticado'

            });

        }

 

        const idPost = Number(id_publicacion);

 

        if (!Number.isInteger(idPost) || idPost <= 0) {

            return res.status(400).json({

                mensaje: 'ID de publicación inválido'

            });

        }

 

        if (!contenido || !String(contenido).trim()) {

            return res.status(400).json({

                mensaje: 'El contenido no puede estar vacío'

            });

        }

 

        const [resultado] = await db.query(

            `UPDATE publicacion

             SET contenido = ?

             WHERE id = ?

               AND usuario_id = ?`,

            [

                String(contenido).trim(),

                idPost,

                usuario_id

            ]

        );

 

        if (resultado.affectedRows === 0) {

            return res.status(404).json({

                mensaje:

                    'No se pudo editar: la publicación no existe o no eres el dueño'

            });

        }

 

        if (req.io) {

            req.io.emit('publicacion_editada', {

                postId: idPost,

                contenido: String(contenido).trim()

            });

        }

 

        return res.json({

            mensaje: 'Publicación actualizada correctamente'

        });

 

    } catch (error) {

        console.error('Error al editar:', error);

 

        return res.status(500).json({

            mensaje: 'Error al actualizar la publicación'

        });

    }

};