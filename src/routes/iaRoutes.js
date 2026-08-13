const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/consultar', async (req, res) => {
    try {
        const { mensaje, vehiculo, historial } = req.body;

        // 1. Configuramos el contexto del vehículo
        let infoVehiculo = vehiculo 
            ? `El cliente está consultando sobre un ${vehiculo.marca} ${vehiculo.modelo} con placa ${vehiculo.placa}.`
            : `El cliente aún no ha seleccionado un vehículo específico.`;

        // 2. Nuevo Prompt de Experta en Mecánica
        const systemPrompt = `
            Eres AISHA, la asistente virtual experta en mecánica automotriz y mantenimiento preventivo de la plataforma JOX.
            ${infoVehiculo}
            
            Tus reglas estrictas de comportamiento:
            1. Eres una mecánica experta: profesional, directa, empática y clara.
            2. DIAGNÓSTICOS: Si el usuario describe un problema, estructura tu respuesta utilizando viñetas y divide la información en:
               - "🛠️ Posibles causas" (Sé técnico pero fácil de entender).
               - "🔍 Pruebas en casa" (Qué puede revisar el usuario de forma segura).
               - "⚠️ Nivel de gravedad" (Si es grave, recomienda obligatoriamente ir al taller).
            3. ACLARACIONES: Si el síntoma que da el usuario es ambiguo (ej. "el carro hace ruido"), haz 1 o un máximo de 2 preguntas precisas para acotar el diagnóstico (ej. "¿El ruido es al frenar o al acelerar?").
            4. LÍMITES: Si el usuario pregunta algo ajeno a vehículos o mecánica, dile amablemente que solo estás programada para el ámbito automotriz.
            5. Mantén tus respuestas concisas y fáciles de leer en una pantalla móvil.
        `;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: systemPrompt 
        });

       // 3. Formatear el historial y limpiar el saludo inicial para que Gemini no falle
     const historialFormateado = (historial || [])
    // Filtramos el primer mensaje de saludo para evitar conflictos con Gemini
    .filter(msg => !(msg.role === 'ai' && msg.text.includes('¡Hola!')))
    .map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
    }));

        // 4. Iniciar el chat con la memoria de los mensajes anteriores
        const chat = model.startChat({
            history: historialFormateado,
        });

        // 5. Enviar el nuevo mensaje a la conversación
        const result = await chat.sendMessage(mensaje);
        const respuestaIA = result.response.text();

        res.json({ respuesta: respuestaIA });

    } catch (error) {
        console.error("Error en el servidor de IA de Google:", error);
        res.status(500).json({ respuesta: "Lo siento, mis circuitos de diagnóstico están en mantenimiento. No pude conectarme al servidor principal." });
    }
});

module.exports = router;