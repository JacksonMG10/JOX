const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 1. REGISTRAR USUARIO (Con validación y encriptación)
exports.registrarUsuario = async (req, res) => {
    try {
        // --- NUEVO: Extraemos TODOS los datos, incluyendo los del negocio ---
        const { 
            nombre, apellido, correo, contraseña,
            tipo_usuario, documento_dueno, nit_empresa, direccion_taller
        } = req.body;

        const [usuariosExistentes] = await db.query('SELECT * FROM USUARIO WHERE correo = ?', [correo]);
        
        if (usuariosExistentes.length > 0) {
            return res.status(400).json({ mensaje: 'El correo ya está registrado en JTRACK' });
        }

        const salt = await bcrypt.genSalt(10);
        const contraseñaEncriptada = await bcrypt.hash(contraseña, salt);

        // --- NUEVO: Lógica del estado ---
        // Si es taller, su estado inicia en "pendiente". Si es conductor, "aprobado".
        let estado_inicial = 'aprobado';
        if (tipo_usuario === 'taller') {
            estado_inicial = 'pendiente';
        }

        // --- NUEVO: Actualizamos el INSERT para enviar todas las columnas ---
        const [resultado] = await db.query(
            `INSERT INTO USUARIO 
            (nombre, apellido, correo, contraseña, tipo_usuario, documento_dueno, nit_empresa, direccion_taller, estado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre, 
                apellido, 
                correo, 
                contraseñaEncriptada,
                tipo_usuario || 'comun', 
                documento_dueno || null, 
                nit_empresa || null, 
                direccion_taller || null,
                estado_inicial
            ]
        );

        res.status(201).json({
            mensaje: '¡Usuario registrado exitosamente con seguridad!',
            id_usuario: resultado.insertId
        });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ mensaje: 'Hubo un error en el servidor' });
    }
};

// 2. INICIAR SESIÓN (Tu función favorita unificada)
exports.iniciarSesion = async (req, res) => {
    try {
        const { correo, contraseña } = req.body;

        const [usuarios] = await db.query('SELECT * FROM USUARIO WHERE correo = ?', [correo]);
        
        if (usuarios.length === 0) {
            return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
        }

        const usuario = usuarios[0];
        const contraseñaValida = await bcrypt.compare(contraseña, usuario.contraseña);
        
        if (!contraseñaValida) {
            return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
        }

        const token = jwt.sign(
            { id_usuario: usuario.id_usuario, nombre: usuario.nombre, tipo_usuario: usuario.tipo_usuario }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({
            mensaje: '¡Inicio de sesión exitoso!',
            token: token,
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                correo: usuario.correo,
                // --- NUEVO: Le enviamos a React el tipo y estado para el Dashboard ---
                tipo_usuario: usuario.tipo_usuario,
                estado: usuario.estado 
            }
        });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ mensaje: 'Hubo un error en el servidor' });
    }
};

// 3. OBTENER PERFIL (El que te servirá para el futuro)
exports.obtenerPerfil = async (req, res) => {
    try {
        const id_usuario = req.usuario.id_usuario; 
        // --- NUEVO: Agregamos tipo_usuario y estado a la consulta del perfil ---
        const [usuarios] = await db.query(
            'SELECT id_usuario, nombre, apellido, correo, tipo_usuario, estado, fecha_registro FROM USUARIO WHERE id_usuario = ?',
            [id_usuario]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        res.json(usuarios[0]);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener el perfil' });
    }
};

// 4. OBTENER TODOS LOS USUARIOS (Para sugerencias en el foro)
exports.obtenerTodos = async (req, res) => {
    try {
        // Solo traemos datos públicos para no exponer contraseñas
        const [usuarios] = await db.query(
            'SELECT id_usuario, nombre, apellido, correo, tipo_usuario FROM USUARIO'
        );
        res.json(usuarios);
    } catch (error) {
        console.error('Error al obtener todos los usuarios:', error);
        res.status(500).json({ mensaje: 'Hubo un error al obtener la lista de usuarios' });
    }
};