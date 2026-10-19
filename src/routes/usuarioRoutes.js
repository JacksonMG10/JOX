const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middlewares/authMiddleware');

// Asegurar que la carpeta 'uploads' exista en el servidor (Render / Local)
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de multer para almacenar fotos de perfil
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'avatar-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Límite de 10MB por imagen
});

// Rutas públicas de autenticación
router.post('/registro', usuarioController.registrarUsuario);
router.post('/verificar', usuarioController.verificarCodigo);
router.post('/login', usuarioController.iniciarSesion);

// Recuperación de contraseña
router.post('/solicitar-recuperacion', usuarioController.solicitarRecuperacion);
router.post('/restablecer-contrasena', usuarioController.restablecerContrasena);

// Rutas protegidas de perfil (requieren token JWT)
router.get('/perfil', authMiddleware, usuarioController.obtenerPerfil);
router.put('/perfil', authMiddleware, upload.single('avatar'), usuarioController.actualizarPerfil);

// Obtener lista general de usuarios
router.get('/', usuarioController.obtenerTodos);

module.exports = router;