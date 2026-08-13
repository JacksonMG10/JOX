const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // 1. Leer el token que viene en los "Headers" de la petición
    const token = req.header('Authorization');

    // 2. Si no hay token, lo rechazamos
    if (!token) {
        return res.status(401).json({ mensaje: 'No hay token, permiso denegado' });
    }

    try {
        // 3. Limpiamos el token (es común que el frontend envíe la palabra "Bearer " antes del token)
        const tokenLimpio = token.replace('Bearer ', '');
        
        // 4. Verificamos que el token sea válido y haya sido firmado con nuestra clave
        const cifrado = jwt.verify(tokenLimpio, process.env.JWT_SECRET);
        
        // 5. Guardamos los datos del usuario (id_usuario) en la petición para que el controlador los use
        req.usuario = cifrado; 
        
        // 6. Le decimos que puede continuar hacia el controlador
        next(); 
    } catch (error) {
        res.status(401).json({ mensaje: 'Token no válido o expirado' });
    }
};