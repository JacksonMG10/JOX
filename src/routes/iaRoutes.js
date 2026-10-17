const express = require('express');
const router = express.Router();
const { procesarConsultaTaller } = require('../services/tallerIaService');

router.post('/consultar', async (req, res) => {
    try {
        const { mensaje, vehiculo } = req.body;

        // Procesamiento 100% interno sin APIs externas
        const respuestaNativa = procesarConsultaTaller(mensaje, vehiculo);

        res.json({ respuesta: respuestaNativa });

    } catch (error) {
        console.error("Error en el motor nativo de IA:", error);
        res.status(500).json({ 
            respuesta: "Error al procesar la consulta técnica en el motor local." 
        });
    }
});

module.exports = router;