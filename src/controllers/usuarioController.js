const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const https = require('https');

// Función para enviar correo vía API HTTPS de Brevo
const enviarCorreoBrevo = (correoDestino, nombreUsuario, asunto, htmlContenido) => {
    const data = JSON.stringify({
        sender: { name: "JOX Plataforma", email: process.env.EMAIL_USER || "info.joxapp@gmail.com" },
        to: [{ email: correoDestino, name: nombreUsuario || "Usuario" }],
        subject: asunto,
        htmlContent: htmlContenido
    });

    const options = {
        hostname: 'api.brevo.com',
        port: 443,
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            if (res.statusCode === 201 || res.statusCode === 200) {
                console.log(`✉️ Correo enviado exitosamente a ${correoDestino}`);
            } else {
                console.error(`⚠️ Error Brevo (${res.statusCode}):`, body);
            }
        });
    });

    req.on('error', (e) => console.error("⚠️ Error de conexión con Brevo:", e.message));
    req.write(data);
    req.end();
};

// 1. REGISTRAR USUARIO
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

        const htmlCorreo = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #18181b; color: #ffffff; border-radius: 10px; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #fbbf24; text-align: center;">¡Bienvenido a JOX, ${nombre}!</h2>
                <p style="text-align: center; color: #d4d4d8;">Tu código de verificación de 6 dígitos es:</p>
                <div style="background: #27272a; padding: 15px; font-size: 32px; font-weight: bold; color: #fbbf24; text-align: center; letter-spacing: 6px; border-radius: 8px; margin: 20px 0; border: 1px solid #3f3f46;">
                    ${codigoVerificacion}
                </div>
            </div>
        `;

        enviarCorreoBrevo(correo, nombre, "🔑 Código de Verificación de Cuenta - JOX", htmlCorreo);

        return res.status(201).json({
            mensaje: 'Código de verificación enviado a tu correo.',
            correo: correo,
            id_usuario: resultado.insertId
        });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        return res.status(500).json({ mensaje: 'Hubo un error en el servidor al registrar el usuario' });
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

// 3. INICIAR SESIÓN
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
                username: usuario.username || usuario.nombre,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
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

// 4. SOLICITAR RECUPERACIÓN DE CONTRASEÑA (ENVÍA CÓDIGO)
exports.solicitarRecuperacion = async (req, res) => {
    try {
        const { correo } = req.body;
        if (!correo) return res.status(400).json({ mensaje: 'El correo es obligatorio' });

        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo.trim()]);
        if (usuarios.length === 0) {
            return res.status(404).json({ mensaje: 'No existe ninguna cuenta registrada con este correo' });
        }

        const usuario = usuarios[0];
        const codigoRecuperacion = Math.floor(100000 + Math.random() * 900000).toString();

        await db.query('UPDATE usuarios SET codigo_verificacion = ? WHERE id_usuario = ?', [
            codigoRecuperacion,
            usuario.id_usuario
        ]);

        const htmlCorreo = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #18181b; color: #ffffff; border-radius: 10px; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #fbbf24; text-align: center;">🔐 Recuperación de Contraseña - JOX</h2>
                <p style="text-align: center; color: #d4d4d8;">Hola ${usuario.nombre}, recibimos una solicitud para restablecer tu contraseña. Usa este código de 6 dígitos:</p>
                <div style="background: #27272a; padding: 15px; font-size: 32px; font-weight: bold; color: #fbbf24; text-align: center; letter-spacing: 6px; border-radius: 8px; margin: 20px 0; border: 1px solid #3f3f46;">
                    ${codigoRecuperacion}
                </div>
                <p style="color: #a1a1aa; font-size: 12px; text-align: center;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
            </div>
        `;

        enviarCorreoBrevo(usuario.correo, usuario.nombre, "🔐 Código de Recuperación de Contraseña - JOX", htmlCorreo);

        res.json({ mensaje: 'Código de recuperación enviado a tu correo registrado.' });

    } catch (error) {
        console.error('Error al solicitar recuperación:', error);
        res.status(500).json({ mensaje: 'Error al enviar el código de recuperación' });
    }
};

// 5. RESTABLECER CONTRASEÑA
exports.restablecerContrasena = async (req, res) => {
    try {
        const { correo, codigo, nuevaContrasena } = req.body;

        if (!correo || !codigo || !nuevaContrasena) {
            return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
        }

        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo.trim()]);
        if (usuarios.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const usuario = usuarios[0];

        if (!usuario.codigo_verificacion || usuario.codigo_verificacion !== codigo.trim()) {
            return res.status(400).json({ mensaje: 'El código de recuperación es incorrecto o ha expirado' });
        }

        const salt = await bcrypt.genSalt(10);
        const contrasenaEncriptada = await bcrypt.hash(nuevaContrasena, salt);

        await db.query(
            'UPDATE usuarios SET contraseña = ?, codigo_verificacion = NULL WHERE id_usuario = ?',
            [contrasenaEncriptada, usuario.id_usuario]
        );

        res.json({ mensaje: '¡Contraseña actualizada exitosamente! Ya puedes iniciar sesión.' });

    } catch (error) {
        console.error('Error al restablecer contraseña:', error);
        res.status(500).json({ mensaje: 'Error al actualizar la contraseña' });
    }
};

// 6. OBTENER PERFIL
exports.obtenerPerfil = async (req, res) => {
    try {
        const datosUsuario = req.usuario || req.user;
        if (!datosUsuario) return res.status(401).json({ mensaje: 'No autorizado' });

        const id_usuario = datosUsuario.id_usuario || datosUsuario.id;

        const [usuarios] = await db.query(
            'SELECT id_usuario, username, nombre, apellido, correo, tipo_usuario, estado, avatar_url FROM usuarios WHERE id_usuario = ?',
            [id_usuario]
        );

        if (usuarios.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        res.json(usuarios[0]);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener el perfil', error: error.message });
    }
};

// 7. ACTUALIZAR PERFIL
exports.actualizarPerfil = async (req, res) => {
    try {
        const datosUsuario = req.usuario || req.user;
        if (!datosUsuario) return res.status(401).json({ mensaje: 'No autorizado' });

        const id_usuario = datosUsuario.id_usuario || datosUsuario.id;
        const { username, nombre, apellido } = req.body;

        if (username) {
            const [existentes] = await db.query(
                'SELECT id_usuario FROM usuarios WHERE LOWER(username) = LOWER(?) AND id_usuario != ?',
                [username.trim(), id_usuario]
            );

            if (existentes.length > 0) {
                return res.status(400).json({ 
                    mensaje: 'El nombre de usuario ya está registrado por otra persona. Elige otro.' 
                });
            }
        }

        const [usuariosActuales] = await db.query(
            'SELECT username, nombre, apellido, avatar_url FROM usuarios WHERE id_usuario = ?',
            [id_usuario]
        );

        if (usuariosActuales.length === 0) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const usuarioActual = usuariosActuales[0];

        const nuevoUsername = username ? username.trim() : usuarioActual.username;
        const nuevoNombre = nombre ? nombre.trim() : usuarioActual.nombre;
        const nuevoApellido = apellido ? apellido.trim() : usuarioActual.apellido;
        let nuevoAvatarUrl = usuarioActual.avatar_url;

        if (req.file) {
            nuevoAvatarUrl = `uploads/${req.file.filename}`;
        }

        await db.query(
            'UPDATE usuarios SET username = ?, nombre = ?, apellido = ?, avatar_url = ? WHERE id_usuario = ?',
            [nuevoUsername, nuevoNombre, nuevoApellido, nuevoAvatarUrl, id_usuario]
        );

        const [actualizados] = await db.query(
            'SELECT id_usuario, username, nombre, apellido, correo, tipo_usuario, estado, avatar_url FROM usuarios WHERE id_usuario = ?',
            [id_usuario]
        );

        res.json({
            mensaje: 'Perfil actualizado con éxito',
            usuario: actualizados[0]
        });

    } catch (error) {
        console.error('Error al actualizar el perfil:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al actualizar perfil', error: error.message });
    }
};

// 8. OBTENER TODOS LOS USUARIOS
exports.obtenerTodos = async (req, res) => {
    try {
        const [usuarios] = await db.query('SELECT id_usuario, username, nombre, apellido, correo, tipo_usuario, avatar_url FROM usuarios');
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ mensaje: 'Hubo un error al obtener la lista de usuarios' });
    }
};