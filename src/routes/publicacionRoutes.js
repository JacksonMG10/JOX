const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

const publicacionController = require('../controllers/publicacionController');
const authMiddleware = require('../middlewares/authMiddleware');

// --- CONFIGURACIÓN DE CLOUDINARY ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'jox_publicaciones', // Nombre de la carpeta en tu panel de Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
    }
});

const upload = multer({ storage: storage });

// ==========================================
// RUTAS DEL FORO
// ==========================================

// Crear post (Protegido + Recibe 1 imagen llamada 'imagen')
router.post('/crear', authMiddleware, upload.single('imagen'), publicacionController.crearPublicacion);

// Ver muro (Protegido: solo usuarios logueados pueden ver el foro)
router.get('/muro', authMiddleware, publicacionController.obtenerMuro);

// Dar Like o Quitar Like (Protegido)
router.post('/like', authMiddleware, publicacionController.darLike);

// Comentar (Protegido)
router.post('/comentar', authMiddleware, publicacionController.comentarPublicacion);

// Eliminar post (Protegido)
router.delete('/eliminar/:id_publicacion', authMiddleware, publicacionController.eliminarPublicacion);

// Editar post (Protegido)
router.put('/editar/:id_publicacion', authMiddleware, publicacionController.editarPublicacion);

router.get(
    '/estadisticas',
    authMiddleware,
    publicacionController.obtenerEstadisticasUsuario
);

module.exports = router;