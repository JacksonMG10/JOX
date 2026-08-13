const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const iaRoutes = require('./routes/iaRoutes');
require('dotenv').config();

const db = require('./config/db'); 

// === IMPORTAR RUTAS ===
const usuarioRoutes = require('./routes/usuarioRoutes');
const vehiculoRoutes = require('./routes/vehiculoRoutes');
const mantenimientoRoutes = require('./routes/mantenimientoRoutes');
const recordatorioRoutes = require('./routes/recordatorioRoutes');
const publicacionRoutes = require('./routes/publicacionRoutes');
const tutorialRoutes = require('./routes/tutorialRoutes');

const app = express();
const server = http.createServer(app); // <-- NUEVO: Creamos el servidor HTTP basado en Express

// === CONFIGURACIÓN DE SOCKET.IO ===
const io = new Server(server, {
    cors: {
        origin: "*", // Permite que tu frontend se conecte sin bloqueos
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// === MIDDLEWARES ===
app.use(cors()); 
app.use(express.json());

// <-- NUEVO: TRUCO PARA PASAR 'io' A LOS CONTROLADORES
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// === USAR RUTAS ===
app.use('/api/ia', iaRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/vehiculos', vehiculoRoutes);
app.use('/api/mantenimientos', mantenimientoRoutes);
app.use('/api/recordatorios', recordatorioRoutes);
app.use('/api/publicaciones', publicacionRoutes); // Ruta para el muro y comentarios
app.use('/api/tutoriales', tutorialRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('¡Bienvenido a la API REST de JOX!');
});

// Mensajes de consola opcionales para saber si Socket.io conectó bien
io.on('connection', (socket) => {
    console.log(`🟢 Nuevo cliente conectado a JOX Social (Socket ID: ${socket.id})`);
    
    socket.on('disconnect', () => {
        console.log(`🔴 Cliente desconectado`);
    });
});

// Configuración del Puerto
const PORT = process.env.PORT || 3000;

// <-- NUEVO: Cambiamos app.listen por server.listen
server.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 Servidor de JTRACK corriendo en puerto ${PORT}`);
    console.log(`🔌 WebSockets activados para tiempo real`);
    console.log(`📂 Carpeta de subidas lista en: /uploads`);
    console.log(`=================================================`);
});