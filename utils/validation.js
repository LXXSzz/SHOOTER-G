// Utilidades de validación y sanitización
const config = require('../config');

class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

// Sanitizar strings
function sanitizeString(input) {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>\"'&]/g, '');
}

// Validar username
function validateUsername(username) {
    const sanitized = sanitizeString(username);
    
    if (!sanitized) {
        throw new ValidationError('El nombre de usuario es requerido', 'username');
    }
    
    if (sanitized.length < config.validation.username.minLength) {
        throw new ValidationError(
            `El nombre de usuario debe tener al menos ${config.validation.username.minLength} caracteres`, 
            'username'
        );
    }
    
    if (sanitized.length > config.validation.username.maxLength) {
        throw new ValidationError(
            `El nombre de usuario no puede tener más de ${config.validation.username.maxLength} caracteres`, 
            'username'
        );
    }
    
    if (!config.validation.username.pattern.test(sanitized)) {
        throw new ValidationError(
            'El nombre de usuario solo puede contener letras, números y guiones bajos', 
            'username'
        );
    }
    
    return sanitized;
}

// Validar password
function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        throw new ValidationError('La contraseña es requerida', 'password');
    }
    
    if (password.length < config.validation.password.minLength) {
        throw new ValidationError(
            `La contraseña debe tener al menos ${config.validation.password.minLength} caracteres`, 
            'password'
        );
    }
    
    if (password.length > config.validation.password.maxLength) {
        throw new ValidationError(
            `La contraseña no puede tener más de ${config.validation.password.maxLength} caracteres`, 
            'password'
        );
    }
    
    return password;
}

// Validar score
function validateScore(score) {
    const numScore = parseInt(score);
    
    if (isNaN(numScore)) {
        throw new ValidationError('La puntuación debe ser un número', 'score');
    }
    
    if (numScore < config.validation.score.min) {
        throw new ValidationError(
            `La puntuación no puede ser menor a ${config.validation.score.min}`, 
            'score'
        );
    }
    
    if (numScore > config.validation.score.max) {
        throw new ValidationError(
            `La puntuación no puede ser mayor a ${config.validation.score.max}`, 
            'score'
        );
    }
    
    return numScore;
}

// Validar avatar ID
function validateAvatarId(avatarId) {
    const id = parseInt(avatarId);
    
    if (isNaN(id) || id < 1 || id > 3) {
        throw new ValidationError('ID de avatar inválido', 'avatarId');
    }
    
    return id;
}

// Middleware de validación para requests
function validateRequest(validationRules) {
    return (req, res, next) => {
        try {
            const errors = {};
            
            // Validar cada campo
            for (const [field, validator] of Object.entries(validationRules)) {
                try {
                    const value = req.body[field];
                    req.body[field] = validator(value);
                } catch (error) {
                    if (error instanceof ValidationError) {
                        errors[field] = error.message;
                    } else {
                        errors[field] = 'Error de validación';
                    }
                }
            }
            
            // Si hay errores, devolverlos
            if (Object.keys(errors).length > 0) {
                return res.status(400).json({
                    error: 'Datos de entrada inválidos',
                    details: errors
                });
            }
            
            next();
        } catch (error) {
            res.status(500).json({ error: 'Error interno de validación' });
        }
    };
}

module.exports = {
    ValidationError,
    sanitizeString,
    validateUsername,
    validatePassword,
    validateScore,
    validateAvatarId,
    validateRequest
};

