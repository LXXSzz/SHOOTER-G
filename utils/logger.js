// Sistema de logging estructurado
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Crear directorio de logs si no existe
const logDir = path.dirname(config.logFile);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

class Logger {
    constructor() {
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        this.currentLevel = this.levels[config.logLevel] || this.levels.info;
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...meta
        };
        return JSON.stringify(logEntry);
    }

    writeToFile(message) {
        try {
            fs.appendFileSync(config.logFile, message + '\n');
        } catch (error) {
            console.error('Error escribiendo al archivo de log:', error);
        }
    }

    log(level, message, meta = {}) {
        if (this.levels[level] <= this.currentLevel) {
            const formattedMessage = this.formatMessage(level, message, meta);
            
            // Console output
            console.log(formattedMessage);
            
            // File output
            this.writeToFile(formattedMessage);
        }
    }

    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    // Métodos específicos para la aplicación
    auth(action, username, success, meta = {}) {
        this.info(`Auth ${action}`, {
            action,
            username,
            success,
            ...meta
        });
    }

    game(action, userId, meta = {}) {
        this.info(`Game ${action}`, {
            action,
            userId,
            ...meta
        });
    }

    security(event, meta = {}) {
        this.warn(`Security event: ${event}`, meta);
    }

    performance(operation, duration, meta = {}) {
        this.info(`Performance: ${operation}`, {
            operation,
            duration: `${duration}ms`,
            ...meta
        });
    }
}

// Instancia singleton
const logger = new Logger();

// Middleware de logging para Express
function requestLogger(req, res, next) {
    const start = Date.now();
    
    // Log de request
    logger.info('Request received', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Interceptar response para log de duración
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - start;
        
        logger.info('Response sent', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });

        originalSend.call(this, data);
    };

    next();
}

// Middleware de error logging
function errorLogger(err, req, res, next) {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        url: req.url,
        ip: req.ip
    });

    next(err);
}

module.exports = {
    logger,
    requestLogger,
    errorLogger
};

