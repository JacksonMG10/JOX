const express = require('express');
const router = express.Router();
const vehiculoController = require('../controllers/vehiculoController');
const authMiddleware = require('../middlewares/authMiddleware');


router.post('/registrar', authMiddleware, vehiculoController.registrarVehiculo);


router.get('/', authMiddleware, vehiculoController.obtenerMisVehiculos);

module.exports = router;