const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 1. REGISTRAR USUARIO
exports.registrarUsuario = async (req, res) => {
    try {
        const { 
            nombre, apellido, correo, contraseña,
            tipo_usuario, documento_dueno, nit_empresa, direccion_taller, avatar_url
        } = req.body;

        const [usuariosExistentes] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        
        if (usuariosExistentes.length > 0) {
            return res.status(400).json({ mensaje: 'El correo ya está registrado en JTRACK' });
        }

        const salt = await bcrypt.genSalt(10);
        const contraseñaEncriptada = await bcrypt.hash(contraseña, salt);

        let estado_inicial = 'aprobado';
        if (tipo_usuario === 'taller') {
            estado_inicial = 'pendiente';
        }

        const [resultado] = await db.query(
            `INSERT INTO usuarios 
            (nombre, apellido, correo, contraseña, tipo_usuario, documento_dueno, nit_empresa, direccion_taller, estado, avatar_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre, 
                apellido, 
                correo, 
                contraseñaEncriptada,
                tipo_usuario || 'comun', 
                documento_dueno || null, 
                nit_empresa || null, 
                direccion_taller || null,
                estado_inicial,
                avatar_url || null
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

// 2. INICIAR SESIÓN
exports.iniciarSesion = async (req, res) => {
    try {
        const { correo, contraseña } = req.body;

        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        
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
                tipo_usuario: usuario.tipo_usuario,
                estado: usuario.estado,
                avatar_url: usuario.avatar_url
            }
        });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ mensaje: 'Hubo un error en el servidor' });
    }
};

// 3. OBTENER PERFIL
exports.obtenerPerfil = async (req, res) => {
    try {
        const id_usuario = req.usuario.id_usuario; 
        const [usuarios] = await db.query(
            'SELECT id_usuario, nombre, apellido, correo, tipo_usuario, estado, avatar_url, fecha_registro FROM usuarios WHERE id_usuario = ?',
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

// 4. OBTENER TODOS LOS USUARIOS
exports.obtenerTodos = async (req, res) => {
    try {
        const [usuarios] = await db.query(
            'SELECT id_usuario, nombre, apellido, correo, tipo_usuario, avatar_url FROM usuarios'
        );
        res.json(usuarios);
    } catch (error) {
        console.error('Error al obtener todos los usuarios:', error);
        res.status(500).json({ mensaje: 'Hubo un error al obtener la lista de usuarios' });
    }
};