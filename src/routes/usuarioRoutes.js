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

// Helper de seguridad para middleware
const verifyAuth = typeof authMiddleware === 'function' ? authMiddleware : (authMiddleware.authMiddleware || authMiddleware.default);

// Rutas públicas de autenticación
router.post('/registro', (req, res) => usuarioController.registrarUsuario(req, res));
router.post('/verificar', (req, res) => usuarioController.verificarCodigo(req, res));
router.post('/login', (req, res) => usuarioController.iniciarSesion(req, res));

// Recuperación de contraseña
router.post('/solicitar-recuperacion', (req, res) => usuarioController.solicitarRecuperacion(req, res));
router.post('/restablecer-contrasena', (req, res) => usuarioController.restablecerContrasena(req, res));

// Rutas protegidas de perfil
router.get('/perfil', verifyAuth, (req, res) => usuarioController.obtenerPerfil(req, res));
router.put('/perfil', verifyAuth, upload.single('avatar'), (req, res) => usuarioController.actualizarPerfil(req, res));

// Obtener lista general de usuarios
router.get('/', (req, res) => usuarioController.obtenerTodos(req, res));

module.exports = router;