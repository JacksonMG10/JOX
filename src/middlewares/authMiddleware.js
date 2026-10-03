const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // 1. Leer el token que viene en los "Headers" de la petición
    const authHeader = req.header('Authorization') || req.headers['authorization'];

    // 2. Si no hay token, lo rechazamos
    if (!authHeader) {
        return res.status(401).json({ mensaje: 'No hay token, permiso denegado' });
    }

    try {
        // 3. Limpiamos el token quitando "Bearer " de forma segura
        const tokenLimpio = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7).trim() 
            : authHeader.trim();

        // 4. Clave secreta con respaldo por si process.env.JWT_SECRET no existe en Render
        const secret = process.env.JWT_SECRET || 'secreto_super_seguro';

        // 5. Verificamos que el token sea válido
        const cifrado = jwt.verify(tokenLimpio, secret);

        // 6. Guardamos los datos del usuario en req.usuario
        req.usuario = cifrado;

        next(); 
    } catch (error) {
        console.error('Error en verificación de JWT:', error.message);
        return res.status(401).json({ mensaje: 'Token no válido o expirado' });
    }
};