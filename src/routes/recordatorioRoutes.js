const express = require('express');
const router = express.Router();
const recordatorioController = require('../controllers/recordatorioController');
const authMiddleware = require('../middlewares/authMiddleware');

// Ruta para crear alerta (POST)
router.post('/crear', authMiddleware, recordatorioController.crearRecordatorio);

// Ruta para ver mis alertas (GET)
router.get('/mis-recordatorios', authMiddleware, recordatorioController.obtenerMisRecordatorios);

module.exports = router;