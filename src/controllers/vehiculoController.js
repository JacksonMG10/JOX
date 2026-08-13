const db = require('../config/db');

// REGISTRAR UN NUEVO VEHÍCULO
exports.registrarVehiculo = async (req, res) => {
    try {
        // 1. Extraemos TODOS los campos que envía nuestro formulario (AÑADIMOS SOAT y Tecnomecánica)
        const { 
            tipo, placa, alias, marca, modelo, anio, color, kilometraje, 
            tipo_combustible, transmision, cilindraje, vin,
            vencimiento_soat, vencimiento_tecnomecanica // <-- NUEVOS CAMPOS
        } = req.body;
        
        // id_usuario ya no viene del frontend, viene del Token validado por nuestro middleware
        const id_usuario = req.usuario.id_usuario;

        // 2. Adaptamos el año para la base de datos
        const año = anio; // Le pasamos el valor a la variable con "ñ"

        // 3. Insertamos en la Base de Datos con todas las columnas
        const [resultado] = await db.query(
            `INSERT INTO VEHICULO 
            (id_usuario, marca, modelo, año, tipo, kilometraje, placa, alias, color, tipo_combustible, transmision, cilindraje, vin, vencimiento_soat, vencimiento_tecnomecanica) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id_usuario, 
                marca, 
                modelo, 
                año, 
                tipo, 
                kilometraje,
                placa, 
                alias || null, 
                color, 
                tipo_combustible, 
                transmision, 
                cilindraje ? parseInt(cilindraje) : null,
                vin || null,
                vencimiento_soat || null,          
                vencimiento_tecnomecanica || null  
            ]
        );

        res.status(201).json({
            mensaje: `¡${tipo} registrado exitosamente en JTRACK!`,
            id_vehiculo: resultado.insertId
        });

    } catch (error) {
        console.error('Error al registrar vehículo:', error);
        res.status(500).json({ mensaje: 'Hubo un error en el servidor al intentar guardar tu vehículo.' });
    }
};

// OBTENER LOS VEHÍCULOS DEL USUARIO LOGUEADO
exports.obtenerMisVehiculos = async (req, res) => {
    try {
        const id_usuario = req.usuario.id_usuario;

        const [vehiculos] = await db.query(
            'SELECT * FROM VEHICULO WHERE id_usuario = ?',
            [id_usuario]
        );

        res.json(vehiculos);

    } catch (error) {
        console.error('Error al obtener vehículos:', error);
        res.status(500).json({ mensaje: 'Hubo un error al cargar tu garaje.' });
    }
};
