const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/registro', usuarioController.registrarUsuario);
router.post('/verificar', usuarioController.verificarCodigo); // <-- NUEVA RUTA
router.post('/login', usuarioController.iniciarSesion);
router.get('/perfil', authMiddleware, usuarioController.obtenerPerfil);
router.get('/', usuarioController.obtenerTodos);

module.exports = router;