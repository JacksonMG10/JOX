// tallerIaService.js - Motor de Inteligencia Automotriz Nativo de JOX

const BASE_DATOS_OBD = {
    'P0300': {
        falla: 'Fallo de encendido en múltiples cilindros (Misfire)',
        causas: ['Bujías o cables en mal estado', 'Bobina de encendido defectuosa', 'Presión de combustible baja', 'Inyectores sucios o con fuga'],
        pruebas: [
            'Medir resistencia de bobinas (Rango típico: 0.5 a 2.0 Ohmios en primario).',
            'Verificar presión de riel de inyectores con manómetro.',
            'Comprobar pulso de inyectores con luz Noid.'
        ],
        solucion: 'Reemplazar kit de bujías/bobinas y realizar prueba de balance de cilindros.'
    },
    'P0420': {
        falla: 'Eficiencia del sistema catalizador por debajo del umbral (Banco 1)',
        causas: ['Catalizador desgastado o dañado', 'Sensor de oxígeno posterior (O2) defectuoso', 'Fuga en el sistema de escape'],
        pruebas: [
            'Monitorear voltaje del Sensor O2 B1S2 (Debe mantenerse estable entre 0.6V y 0.8V).',
            'Verificar contrapresión de escape con manómetro en orificio de sensor O2.'
        ],
        solucion: 'Inspeccionar fugas de escape. Si el voltaje oscila igual al sensor 1, reemplazar catalizador.'
    },
    'P0171': {
        falla: 'Mezcla demasiado pobre (Banco 1)',
        causas: ['Entrada de aire no medida (fuga de vacío)', 'Sensor MAF sucio o descalibrado', 'Filtro de gasolina obstruido'],
        pruebas: [
            'Revisar valores de ajuste de combustible (STFT y LTFT > +15%).',
            'Aplicar humo/limpiador de carburador en mangueras de vacío para detectar fugas.'
        ],
        solucion: 'Limpiar sensor MAF con solvente dieléctrico y reparar tomas de aire en admisión.'
    }
};

const PALABRAS_CLAVE = [
    {
        tokens: ['freno', 'frenos', 'chilla', 'chillido', 'pedal'],
        respuesta: (vehiculo) => `
🛠️ **DIAGNÓSTICO TÉCNICO - SISTEMA DE FRENOS**
${vehiculo ? `📌 **Vehículo:** ${vehiculo.marca}${vehiculo.modelo}` : ''}

🔍 **Posibles causas:**
- Pastillas de freno desgastadas (contacto con cristalizado o testigo metálico).
- Discos de freno alabeados o con muescas profundas.
- Perno guía de mordaza (caliper) pegado por falta de lubricación sintética.

⚡ **Pruebas de Laboratorio / Mecánicas:**
1. Medir espesor de pastillas (Límite mínimo de servicio: 3.0 mm).
2. Medir alabeo de disco con Reloj Comparador (Tolerancia máx: 0.05 mm).
3. Inspeccionar líquido de frenos con probador de punto de ebullición/humedad (>3% humedad requiere cambio).

📋 **Texto recomendado para entregar al Cliente:**
"Estimado cliente, se realizó inspección al sistema de frenos. Se detecta desgaste en el material de fricción que genera el sonido. Se requiere rectificación/cambio de discos y cambio de pastillas para garantizar la seguridad del frenado."
`
    },
    {
        tokens: ['aceite', 'humo', 'azul', 'consume', 'consumo'],
        respuesta: (vehiculo) => `
🛠️ **DIAGNÓSTICO TÉCNICO - CONSUMO DE ACEITE / EMISIÓN**
${vehiculo ? `📌 **Vehículo:** ${vehiculo.marca}${vehiculo.modelo}` : ''}

🔍 **Posibles causas:**
- Retenes de válvula endurecidos o desgastados.
- Anillos de compresión/aceite pegados o desalineados.
- Válvula PCV obstruida o defectuosa.

⚡ **Pruebas de Taller:**
1. Realizar prueba de compresión de motor en seco y húmedo (con unas gotas de aceite).
2. Inspeccionar la válvula PCV (verificar flujo unidireccional).
3. Prueba de fuga de cilindros con detector de fugas por neumática.

📋 **Texto recomendado para entregar al Cliente:**
"Se evalúa el síntoma de humo/consumo de lubricante. Se recomienda realizar prueba de hermeticidad de cilindros y reemplazo de sellos de válvula para corregir la compresión y evitar daños mayores en el catalizador."
`
    }
];

// Función principal que procesa la lógica nativa de la IA del taller
function procesarConsultaTaller(mensaje, vehiculo) {
    const texto = mensaje.toUpperCase();

    // 1. Detección automática de Códigos OBD-II (Ej: P0300, P0420)
    const codigoMatch = texto.match(/\b[PBOU]\d{4}\b/i);
    if (codigoMatch) {
        const codigo = codigoMatch[0].toUpperCase();
        if (BASE_DATOS_OBD[codigo]) {
            const obd = BASE_DATOS_OBD[codigo];
            return `
🤖 **JOX-PRO MOTOR DE DIAGNÓSTICO OBD-II**
📌 **Código Detectado:** \`${codigo}\` - ${obd.falla}
${vehiculo ? `🚗 **Vehículo:** ${vehiculo.marca}${vehiculo.modelo}` : ''}

🛠️ **Causas Principales:**
${obd.causas.map(c => `- ${c}`).join('\n')}

⚡ **Procedimiento de Medición Técnico:**
${obd.pruebas.map(p => `1. ${p}`).join('\n')}

✅ **Acción Correctiva Sugerida:**
${obd.solucion}

📋 **Explicación sugerida para el cliente:**
"Se realizó escaneo computarizado detectando el código ${codigo} (${obd.falla}). Se realizarán las pruebas electromecánicas correspondientes para confirmar el componente a reemplazar."
`;
        }
    }

    // 2. Detección por síntoma / palabras clave mecánicas
    const textoMinuscula = mensaje.toLowerCase();
    for (const item of PALABRAS_CLAVE) {
        if (item.tokens.some(token => textoMinuscula.includes(token))) {
            return item.respuesta(vehiculo);
        }
    }

    // 3. Respuesta general por defecto orientada a recepción de taller
    return `
🛠️ **ASISTENTE TÉCNICO DE TALLER JOX-PRO**
${vehiculo ? `📌 **Vehículo en bahía:** ${vehiculo.marca}${vehiculo.modelo}` : ''}

He recibido tu consulta sobre: "${mensaje}".

💡 **Recomendaciones de Recepción Técnica:**
1. Si el vehículo presenta falla intermitente, realiza un escaneo completo de todos los módulos (ECM, TCM, ABS, BCM).
2. Registra el kilometraje exacto y el nivel de combustible al momento del ingreso.
3. Puedes ingresar un código de error específico (ejemplo: *P0300*, *P0420*) para obtener la pauta exacta de diagnóstico electromecánico.
`;
}

module.exports = { procesarConsultaTaller };