// Configuración de la aplicación
require('dotenv').config();

const config = {
    // Servidor
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Base de datos
    dbPath: process.env.DB_PATH || './game.db',
    
    // Seguridad
    sessionSecret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    
    // Rate limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },
    
    // CORS
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    
    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
    logFile: process.env.LOG_FILE || './logs/app.log',
    
    // Validación
    validation: {
        username: {
            minLength: 3,
            maxLength: 20,
            pattern: /^[a-zA-Z0-9_]+$/
        },
        password: {
            minLength: 4,
            maxLength: 100
        },
        score: {
            min: 0,
            max: 999999
        }
    }
};

// Validar configuración crítica
if (config.nodeEnv === 'production') {
    if (config.sessionSecret === 'fallback-secret-change-in-production') {
        console.error('ERROR: Debes configurar SESSION_SECRET en producción');
        process.exit(1);
    }
}

module.exports = config;

