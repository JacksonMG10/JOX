const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Configuración optimizada del servicio de correo para producción (Render)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Usa SSL obligatorio para puerto 465
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false // Permite conexiones seguras desde servidores en la nube
    }
});

// 1. REGISTRAR USUARIO Y ENVIAR CÓDIGO POR CORREO
exports.registrarUsuario = async (req, res) => {
    try {
        const { 
            nombre, apellido, correo, contraseña,
            tipo_usuario, documento_dueno, nit_empresa, direccion_taller, avatar_url
        } = req.body;

        const [usuariosExistentes] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        
        if (usuariosExistentes.length > 0) {
            return res.status(400).json({ mensaje: 'El correo ya está registrado en JOX' });
        }

        const salt = await bcrypt.genSalt(10);
        const contraseñaEncriptada = await bcrypt.hash(contraseña, salt);

        // Generar código único de 6 dígitos
        const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();

        let estado_inicial = 'sin_verificar';

        const [resultado] = await db.query(
            `INSERT INTO usuarios 
            (nombre, apellido, correo, contraseña, tipo_usuario, documento_dueno, nit_empresa, direccion_taller, estado, avatar_url, codigo_verificacion, verificado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
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
                avatar_url || null,
                codigoVerificacion
            ]
        );

        // Opciones y plantilla HTML del correo
        const mailOptions = {
            from: `"JOX Plataforma" <${process.env.EMAIL_USER}>`,
            to: correo,
            subject: '🔑 Código de Verificación de Cuenta - JOX',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #18181b; color: #ffffff; border-radius: 10px; max-width: 500px; margin: 0 auto;">
                    <h2 style="color: #fbbf24; text-align: center;">¡Bienvenido a JOX, ${nombre}!</h2>
                    <p style="text-align: center; color: #d4d4d8;">Tu código de verificación de 6 dígitos para activar tu cuenta es:</p>
                    <div style="background: #27272a; padding: 15px; font-size: 32px; font-weight: bold; color: #fbbf24; text-align: center; letter-spacing: 6px; border-radius: 8px; margin: 20px 0; border: 1px solid #3f3f46;">
                        ${codigoVerificacion}
                    </div>
                    <p style="color: #a1a1aa; font-size: 12px; text-align: center;">Si no solicitaste este registro, puedes ignorar este mensaje.</p>
                </div>
            `
        };

        // Enviar el mensaje mediante Nodemailer
        await transporter.sendMail(mailOptions);

        res.status(201).json({
            mensaje: 'Código de verificación enviado a tu correo.',
            correo: correo,
            id_usuario: resultado.insertId
        });

    } catch (error) {
        console.error('Error al registrar usuario o enviar correo:', error);
        res.status(500).json({ mensaje: 'Hubo un error en el servidor o en el envío del correo' });
    }
};

// 2. VERIFICAR CÓDIGO DE CORREO
exports.verificarCodigo = async (req, res) => {
    try {
        const { correo, codigo } = req.body;

        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);

        if (usuarios.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        const usuario = usuarios[0];

        if (usuario.codigo_verificacion !== codigo) {
            return res.status(400).json({ mensaje: 'El código ingresado es incorrecto' });
        }

        let nuevoEstado = usuario.tipo_usuario === 'dueno_taller' ? 'pendiente' : 'aprobado';

        await db.query(
            'UPDATE usuarios SET verificado = 1, estado = ?, codigo_verificacion = NULL WHERE id_usuario = ?',
            [nuevoEstado, usuario.id_usuario]
        );

        res.json({ mensaje: '¡Cuenta verificada exitosamente! Ya puedes iniciar sesión.' });

    } catch (error) {
        console.error('Error al verificar código:', error);
        res.status(500).json({ mensaje: 'Error al procesar la verificación' });
    }
};

// 3. INICIAR SESIÓN (Bloquea acceso si verificado === 0)
exports.iniciarSesion = async (req, res) => {
    try {
        const { correo, contraseña } = req.body;

        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        
        if (usuarios.length === 0) {
            return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
        }

        const usuario = usuarios[0];

        if (usuario.verificado === 0) {
            return res.status(403).json({ 
                mensaje: 'Debes verificar tu correo antes de iniciar sesión.',
                requiereVerificacion: true,
                correo: usuario.correo
            });
        }

        const contraseñaValida = await bcrypt.compare(contraseña, usuario.contraseña);
        
        if (!contraseñaValida) {
            return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
        }

        const secretKey = process.env.JWT_SECRET || 'centenrio_seguro_jtrack_2026';

        const token = jwt.sign(
            { id_usuario: usuario.id_usuario, nombre: usuario.nombre, tipo_usuario: usuario.tipo_usuario }, 
            secretKey, 
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

// 4. OBTENER PERFIL
exports.obtenerPerfil = async (req, res) => {
    try {
        const datosUsuario = req.usuario || req.user;
        if (!datosUsuario) return res.status(401).json({ mensaje: 'No autorizado' });

        const id_usuario = datosUsuario.id_usuario || datosUsuario.id;

        const [usuarios] = await db.query(
            'SELECT id_usuario, nombre, apellido, correo, tipo_usuario, estado, avatar_url FROM usuarios WHERE id_usuario = ?',
            [id_usuario]
        );

        if (usuarios.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        res.json(usuarios[0]);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener el perfil', error: error.message });
    }
};

// 5. OBTENER TODOS LOS USUARIOS
exports.obtenerTodos = async (req, res) => {
    try {
        const [usuarios] = await db.query('SELECT id_usuario, nombre, apellido, correo, tipo_usuario, avatar_url FROM usuarios');
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ mensaje: 'Hubo un error al obtener la lista de usuarios' });
    }
};