const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const publicacionController = require('../controllers/publicacionController');
const authMiddleware = require('../middlewares/authMiddleware');

// --- CONFIGURACIÓN DE MULTER (Para recibir imágenes) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Asegúrate de que la carpeta 'uploads' exista en tu backend
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
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

// Dar Like o Quitar Like (Protegido - ¡NUEVA RUTA!)
router.post('/like', authMiddleware, publicacionController.darLike);

// Comentar (Protegido)
router.post('/comentar', authMiddleware, publicacionController.comentarPublicacion);

// Eliminar post (Protegido)
router.delete('/eliminar/:id_publicacion', authMiddleware, publicacionController.eliminarPublicacion);

// Editar post (Protegido)
router.put('/editar/:id_publicacion', authMiddleware, publicacionController.editarPublicacion);

module.exports = router;