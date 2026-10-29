const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middlewares/authMiddleware');

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'jox_avatares',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Middleware helper de seguridad para evitar pasar valores undefined a Express
const verifyAuth = typeof authMiddleware === 'function' ? authMiddleware : (authMiddleware.authMiddleware || authMiddleware.default);

// Rutas públicas de autenticación
router.post('/registro', usuarioController.registrarUsuario);
router.post('/verificar', usuarioController.verificarCodigo);
router.post('/login', usuarioController.iniciarSesion);

// Recuperación de contraseña
router.post('/solicitar-recuperacion', usuarioController.solicitarRecuperacion);
router.post('/restablecer-contrasena', usuarioController.restablecerContrasena);

// Rutas protegidas de perfil
router.get('/perfil', verifyAuth, usuarioController.obtenerPerfil);
router.put('/perfil', verifyAuth, upload.single('avatar'), usuarioController.actualizarPerfil);

// Obtener lista general de usuarios
router.get('/', usuarioController.obtenerTodos);

module.exports = router;