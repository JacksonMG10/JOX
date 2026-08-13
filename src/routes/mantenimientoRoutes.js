const express = require('express');
const router = express.Router();
const mantenimientoController = require('../controllers/mantenimientoController');
const authMiddleware = require('../middlewares/authMiddleware'); // Este es tu portero real

// Ruta POST para registrar un nuevo mantenimiento (Ruta que usa tu React)
router.post('/registrar', authMiddleware, mantenimientoController.registrarMantenimiento);

// Ruta GET para obtener el historial
router.get('/historial/:id_vehiculo', authMiddleware, mantenimientoController.obtenerHistorial);

module.exports = router;