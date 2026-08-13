const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middlewares/authMiddleware'); // Importamos el guardián

// 1. Ruta de Registro (Pública)
router.post('/registro', usuarioController.registrarUsuario);

// 2. Ruta de Login (Pública)
router.post('/login', usuarioController.iniciarSesion);

// 3. Ruta de Perfil (PROTEGIDA)
// El usuario debe enviar su Token para entrar aquí
router.get('/perfil', authMiddleware, usuarioController.obtenerPerfil);

// 4. Ruta para obtener todos los usuarios (Pública o protegida, según prefieras)
router.get('/', usuarioController.obtenerTodos);

module.exports = router;