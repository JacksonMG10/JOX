const db = require('../config/db');

// REGISTRAR UN NUEVO MANTENIMIENTO
exports.registrarMantenimiento = async (req, res) => {
    try {
        const { id_vehiculo, tipo_mantenimiento, descripcion, fecha, costo, kilometraje_momento, notas } = req.body;
        
        // --- NUEVA PROTECCIÓN AQUÍ ---
        // Buscamos el usuario en req.usuario o req.user (dependiendo de cómo lo llame tu middleware)
        const usuario = req.usuario || req.user;

        if (!usuario) {
            return res.status(401).json({ 
                mensaje: 'Error: El servidor no está recibiendo los datos del usuario. Revisa tu archivo de rutas.' 
            });
        }

        const id_usuario = usuario.id_usuario || usuario.id;
        // -----------------------------

        // 1. Validar que el vehículo pertenece al usuario logueado
        const [vehiculos] = await db.query(
            'SELECT * FROM VEHICULO WHERE id_vehiculo = ? AND id_usuario = ?',
            [id_vehiculo, id_usuario]
        );

        // ... (el resto del código sigue exactamente igual hacia abajo)

        if (vehiculos.length === 0) {
            return res.status(403).json({ mensaje: 'No autorizado para este vehículo' });
        }

        // 2. Preparar la consulta SQL (Nombres de columna exactos según tu DB)
        const query = `
            INSERT INTO MANTENIMIENTO 
            (id_vehiculo, tipo_mantenimiento, descripcion, fecha, costo, kilometraje_momento, notas) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        // 3. Ejecutar la inserción (Usamos valores por defecto para evitar campos undefined)
        const [resultado] = await db.query(query, [
            id_vehiculo,
            tipo_mantenimiento || 'General',
            descripcion || 'Sin descripción',
            fecha || new Date(),
            parseFloat(costo) || 0,
            parseInt(kilometraje_momento) || 0,
            notas || ''
        ]);

        // 4. Enviar respuesta de éxito (IMPORTANTE: Solo una respuesta)
        return res.status(201).json({ 
            mensaje: 'Guardado con éxito', 
            id_mantenimiento: resultado.insertId 
        });

    } catch (error) {
        // Log para que veas el error real en tu terminal de VS Code
        console.error('--- ERROR EN BASE DE DATOS ---');
        console.error(error.message);
        
        return res.status(500).json({ 
            mensaje: 'Error interno del servidor', 
            detalle: error.message 
        });
    }
};

// OBTENER HISTORIAL DE MANTENIMIENTOS
exports.obtenerHistorial = async (req, res) => {
    try {
        const { id_vehiculo } = req.params;
        
        // --- LA MISMA PROTECCIÓN AQUÍ ---
        const usuario = req.usuario || req.user;
        if (!usuario) {
            return res.status(401).json({ mensaje: 'No autorizado o token inválido' });
        }
        const id_usuario = usuario.id_usuario || usuario.id;
        // --------------------------------

        // Validar propiedad antes de mostrar datos
        const [vehiculos] = await db.query(
            'SELECT * FROM VEHICULO WHERE id_vehiculo = ? AND id_usuario = ?',
            [id_vehiculo, id_usuario]
        );

        if (vehiculos.length === 0) {
            return res.status(403).json({ mensaje: 'Acceso denegado al historial' });
        }

        const [historial] = await db.query(
            'SELECT * FROM MANTENIMIENTO WHERE id_vehiculo = ? ORDER BY fecha DESC',
            [id_vehiculo]
        );

        return res.json(historial);

    } catch (error) {
        console.error('Error al cargar historial:', error.message);
        return res.status(500).json({ mensaje: 'Error al cargar el historial' });
    }
};
// ter