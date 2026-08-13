const express = require('express');
const router = express.Router();
const tutorialController = require('../controllers/tutorialController');

// Estas rutas pueden ser públicas (sin authMiddleware) para que cualquiera aprete y aprenda
router.get('/', tutorialController.obtenerTutoriales);
router.get('/categoria/:categoria', tutorialController.obtenerPorCategoria);
router.post('/admin/crear', tutorialController.crearTutorial); // En el futuro esto solo lo haría un admin

module.exports = router;