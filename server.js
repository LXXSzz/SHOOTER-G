const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const compression = require('compression');

// Importar configuraciones y utilidades
const config = require('./config');
const { logger, requestLogger, errorLogger } = require('./utils/logger');
const { validateRequest, validateUsername, validatePassword, validateScore, validateAvatarId } = require('./utils/validation');

const app = express();
const PORT = config.port;

// Configuración de seguridad con Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
    origin: config.corsOrigin,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        error: 'Demasiadas solicitudes, intenta de nuevo más tarde'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Rate limiting específico para autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos por IP
    message: {
        error: 'Demasiados intentos de autenticación, intenta de nuevo en 15 minutos'
    },
    skipSuccessfulRequests: true
});

// Compresión
app.use(compression());

// Logging
app.use(requestLogger);

// Configuración de middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public', {
    maxAge: '1d',
    etag: true,
    lastModified: true
}));

// Configuración de sesión segura
app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: config.nodeEnv === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        sameSite: 'strict'
    },
    name: 'gameSession' // Cambiar nombre por defecto
}));

// Configuración de base de datos
const db = new sqlite3.Database(config.dbPath, (err) => {
    if (err) {
        logger.error('Error al conectar con la base de datos', { error: err.message });
        process.exit(1);
    } else {
        logger.info('Conectado a la base de datos SQLite', { dbPath: config.dbPath });
        initDatabase();
    }
});

// Inicializar tablas con índices para optimización
function initDatabase() {
    const startTime = Date.now();
    
    // Tabla de usuarios
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de puntajes
    db.run(`CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        score INTEGER NOT NULL,
        games_played INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Tabla de estadísticas de usuario
    db.run(`CREATE TABLE IF NOT EXISTS user_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        total_games INTEGER DEFAULT 0,
        best_score INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Tabla de estadísticas detalladas
    db.run(`CREATE TABLE IF NOT EXISTS detailed_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        total_playtime INTEGER DEFAULT 0,
        enemies_killed INTEGER DEFAULT 0,
        enemies_killed_normal INTEGER DEFAULT 0,
        enemies_killed_fast INTEGER DEFAULT 0,
        enemies_killed_tank INTEGER DEFAULT 0,
        enemies_killed_zigzag INTEGER DEFAULT 0,
        enemies_killed_shooter INTEGER DEFAULT 0,
        bosses_defeated INTEGER DEFAULT 0,
        powerups_collected INTEGER DEFAULT 0,
        powerups_rapid_fire INTEGER DEFAULT 0,
        powerups_shield INTEGER DEFAULT 0,
        powerups_double_shot INTEGER DEFAULT 0,
        powerups_speed_boost INTEGER DEFAULT 0,
        powerups_health INTEGER DEFAULT 0,
        powerups_magnet INTEGER DEFAULT 0,
        shots_fired INTEGER DEFAULT 0,
        shots_hit INTEGER DEFAULT 0,
        damage_taken INTEGER DEFAULT 0,
        distance_traveled REAL DEFAULT 0,
        max_combo INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        games_completed INTEGER DEFAULT 0,
        max_level_reached INTEGER DEFAULT 1,
        total_score INTEGER DEFAULT 0,
        best_score INTEGER DEFAULT 0,
        survival_time_best INTEGER DEFAULT 0,
        lives_lost INTEGER DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Tabla de avatares de usuario
    db.run(`CREATE TABLE IF NOT EXISTS user_avatars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        current_avatar INTEGER DEFAULT 1,
        unlocked_avatars TEXT DEFAULT '1',
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Crear índices para optimización
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_detailed_stats_user_id ON detailed_stats(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_avatars_user_id ON user_avatars(user_id)`);
    
    const duration = Date.now() - startTime;
    logger.info('Base de datos inicializada', { duration: `${duration}ms` });
}

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        logger.security('Unauthorized access attempt', {
            ip: req.ip,
            url: req.url,
            method: req.method
        });
        res.status(401).json({ error: 'No autorizado' });
    }
}

// Rutas de autenticación con validación
app.post('/api/register', 
    validateRequest({
        username: validateUsername,
        password: validatePassword
    }),
    async (req, res) => {
        const { username, password } = req.body;
        
        try {
            const hashedPassword = await bcrypt.hash(password, config.bcryptRounds);
            
            db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
                [username, hashedPassword], 
                function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            logger.auth('register', username, false, { error: 'User already exists' });
                            return res.status(400).json({ error: 'El usuario ya existe' });
                        }
                        logger.error('Database error during registration', { error: err.message, username });
                        return res.status(500).json({ error: 'Error al crear usuario' });
                    }
                    
                    // Crear estadísticas iniciales
                    db.run('INSERT INTO user_stats (user_id) VALUES (?)', [this.lastID]);
                    db.run('INSERT INTO detailed_stats (user_id) VALUES (?)', [this.lastID]);
                    db.run('INSERT INTO user_avatars (user_id) VALUES (?)', [this.lastID]);
                    
                    logger.auth('register', username, true, { userId: this.lastID });
                    res.json({ message: 'Usuario creado exitosamente', userId: this.lastID });
                }
            );
        } catch (error) {
            logger.error('Registration error', { error: error.message, username });
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
);

app.post('/api/login', 
    authLimiter,
    validateRequest({
        username: validateUsername,
        password: validatePassword
    }),
    (req, res) => {
        const { username, password } = req.body;

        db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) {
                logger.error('Database error during login', { error: err.message, username });
                return res.status(500).json({ error: 'Error interno del servidor' });
            }
            
            if (!user) {
                logger.auth('login', username, false, { error: 'User not found' });
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            try {
                const validPassword = await bcrypt.compare(password, user.password);
                if (!validPassword) {
                    logger.auth('login', username, false, { error: 'Invalid password' });
                    return res.status(401).json({ error: 'Credenciales inválidas' });
                }

                req.session.userId = user.id;
                req.session.username = user.username;
                
                logger.auth('login', username, true, { userId: user.id });
                res.json({ message: 'Login exitoso', username: user.username });
            } catch (error) {
                logger.error('Login error', { error: error.message, username });
                res.status(500).json({ error: 'Error interno del servidor' });
            }
        });
    }
);

app.post('/api/logout', (req, res) => {
    const username = req.session.username;
    req.session.destroy((err) => {
        if (err) {
            logger.error('Logout error', { error: err.message, username });
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }
        logger.auth('logout', username, true);
        res.json({ message: 'Logout exitoso' });
    });
});

// Rutas del juego
app.post('/api/save-score', 
    requireAuth,
    validateRequest({
        score: validateScore
    }),
    (req, res) => {
        const { score } = req.body;
        const userId = req.session.userId;

        // Guardar puntuación
        db.run('INSERT INTO scores (user_id, score) VALUES (?, ?)', 
            [userId, score], 
            function(err) {
                if (err) {
                    logger.error('Error saving score', { error: err.message, userId, score });
                    return res.status(500).json({ error: 'Error al guardar puntuación' });
                }

                // Actualizar estadísticas básicas (verificar si existe primero)
                db.get('SELECT * FROM user_stats WHERE user_id = ?', [userId], (err, row) => {
                    if (err) {
                        logger.error('Error checking user stats', { error: err.message, userId });
                        return;
                    }
                    
                    if (row) {
                        // Actualizar estadísticas existentes
                        db.run(`UPDATE user_stats SET 
                            total_games = total_games + 1,
                            best_score = MAX(best_score, ?)
                            WHERE user_id = ?`, 
                            [score, userId], 
                            (err) => {
                                if (err) {
                                    logger.error('Error updating user stats', { error: err.message, userId });
                                }
                            }
                        );
                    } else {
                        // Crear estadísticas si no existen
                        db.run('INSERT INTO user_stats (user_id, total_games, best_score) VALUES (?, 1, ?)', 
                            [userId, score], 
                            (err) => {
                                if (err) {
                                    logger.error('Error creating user stats', { error: err.message, userId });
                                }
                            }
                        );
                    }
                });

                logger.game('score_saved', userId, { score, scoreId: this.lastID });
                res.json({ message: 'Puntuación guardada', scoreId: this.lastID });
            }
        );
    }
);

app.get('/api/stats', requireAuth, (req, res) => {
    const userId = req.session.userId;
    
    db.get(`SELECT 
        us.total_games,
        us.best_score,
        us.total_score,
        u.username
        FROM user_stats us
        JOIN users u ON us.user_id = u.id
        WHERE us.user_id = ?`, 
        [userId], 
        (err, stats) => {
            if (err) {
                return res.status(500).json({ error: 'Error al obtener estadísticas' });
            }
            
            res.json(stats || { 
                total_games: 0, 
                best_score: 0, 
                total_score: 0,
                username: req.session.username 
            });
        }
    );
});

app.get('/api/leaderboard', requireAuth, (req, res) => {
    db.all(`SELECT 
        u.username,
        us.best_score,
        us.total_games
        FROM user_stats us
        JOIN users u ON us.user_id = u.id
        WHERE us.best_score > 0
        ORDER BY us.best_score DESC
        LIMIT 10`, 
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Error al obtener ranking' });
            }
            
            res.json(rows);
        }
    );
});

app.get('/api/check-auth', (req, res) => {
    if (req.session.userId) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

// Endpoint para actualizar estadísticas detalladas
app.post('/api/update-detailed-stats', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const stats = req.body;
    
    // Construir la consulta de actualización dinámicamente
    const fields = [];
    const values = [];
    
    // Campos que se pueden actualizar
    const allowedFields = [
        'total_playtime', 'enemies_killed', 'enemies_killed_normal', 'enemies_killed_fast',
        'enemies_killed_tank', 'enemies_killed_zigzag', 'enemies_killed_shooter',
        'bosses_defeated', 'powerups_collected', 'powerups_rapid_fire', 'powerups_shield',
        'powerups_double_shot', 'powerups_speed_boost', 'powerups_health', 'powerups_magnet',
        'shots_fired', 'shots_hit', 'damage_taken', 'distance_traveled', 'max_combo',
        'games_played', 'games_completed', 'max_level_reached', 'total_score',
        'best_score', 'survival_time_best', 'lives_lost'
    ];
    
    for (const field of allowedFields) {
        if (stats[field] !== undefined) {
            fields.push(`${field} = ${field} + ?`);
            values.push(stats[field]);
        }
    }
    
    // Campos que se actualizan con MAX
    const maxFields = ['max_combo', 'max_level_reached', 'best_score', 'survival_time_best'];
    for (const field of maxFields) {
        if (stats[field] !== undefined) {
            const index = fields.findIndex(f => f.includes(field));
            if (index !== -1) {
                fields[index] = `${field} = MAX(${field}, ?)`;
            }
        }
    }
    
    if (fields.length === 0) {
        return res.status(400).json({ error: 'No hay datos para actualizar' });
    }
    
    // Agregar timestamp y userId
    fields.push('last_updated = CURRENT_TIMESTAMP');
    values.push(userId);
    
    const query = `UPDATE detailed_stats SET ${fields.join(', ')} WHERE user_id = ?`;
    
    db.run(query, values, function(err) {
        if (err) {
            console.error('Error actualizando estadísticas detalladas:', err);
            return res.status(500).json({ error: 'Error al actualizar estadísticas' });
        }
        
        res.json({ message: 'Estadísticas actualizadas', rowsAffected: this.changes });
    });
});

// Endpoint para obtener estadísticas detalladas
app.get('/api/detailed-stats', requireAuth, (req, res) => {
    const userId = req.session.userId;
    
    db.get(`SELECT 
        ds.*,
        u.username,
        u.created_at as user_created
        FROM detailed_stats ds
        JOIN users u ON ds.user_id = u.id
        WHERE ds.user_id = ?`, 
        [userId], 
        (err, stats) => {
            if (err) {
                console.error('Error obteniendo estadísticas detalladas:', err);
                return res.status(500).json({ error: 'Error al obtener estadísticas detalladas' });
            }
            
            if (!stats) {
                // Crear estadísticas si no existen
                db.run('INSERT INTO detailed_stats (user_id) VALUES (?)', [userId], (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error al crear estadísticas' });
                    }
                    
                    // Devolver estadísticas vacías
                    res.json({
                        user_id: userId,
                        username: req.session.username,
                        total_playtime: 0,
                        enemies_killed: 0,
                        // ... resto de campos con valores por defecto
                    });
                });
            } else {
                res.json(stats);
            }
        }
    );
});

// Endpoints para el sistema de avatares
app.get('/api/user-avatar', requireAuth, (req, res) => {
    const userId = req.session.userId;
    
    db.get(`SELECT ua.*, ds.total_score 
        FROM user_avatars ua
        LEFT JOIN detailed_stats ds ON ua.user_id = ds.user_id
        WHERE ua.user_id = ?`, 
        [userId], 
        (err, avatar) => {
            if (err) {
                console.error('Error obteniendo avatar:', err);
                return res.status(500).json({ error: 'Error al obtener avatar' });
            }
            
            if (!avatar) {
                // Crear avatar si no existe
                db.run('INSERT INTO user_avatars (user_id) VALUES (?)', [userId], (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error al crear avatar' });
                    }
                    
                    res.json({
                        current_avatar: 1,
                        unlocked_avatars: '1',
                        total_score: 0
                    });
                });
            } else {
                // Verificar desbloqueos basados en puntuación
                const totalScore = avatar.total_score || 0;
                let unlockedAvatars = avatar.unlocked_avatars.split(',').map(Number);
                
                // Desbloquear avatar 2 a los 3000 puntos
                if (totalScore >= 3000 && !unlockedAvatars.includes(2)) {
                    unlockedAvatars.push(2);
                }
                
                // Desbloquear avatar 3 a los 6000 puntos
                if (totalScore >= 6000 && !unlockedAvatars.includes(3)) {
                    unlockedAvatars.push(3);
                }
                
                // Actualizar avatares desbloqueados si cambió
                const newUnlockedString = unlockedAvatars.join(',');
                if (newUnlockedString !== avatar.unlocked_avatars) {
                    db.run('UPDATE user_avatars SET unlocked_avatars = ? WHERE user_id = ?', 
                        [newUnlockedString, userId]);
                }
                
                res.json({
                    current_avatar: avatar.current_avatar,
                    unlocked_avatars: newUnlockedString,
                    total_score: totalScore
                });
            }
        }
    );
});

app.post('/api/change-avatar', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { avatarId } = req.body;
    
    if (!avatarId || avatarId < 1 || avatarId > 3) {
        return res.status(400).json({ error: 'ID de avatar inválido' });
    }
    
    // Verificar que el usuario tenga el avatar desbloqueado
    db.get('SELECT unlocked_avatars FROM user_avatars WHERE user_id = ?', [userId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error al verificar avatar' });
        }
        
        if (!result) {
            return res.status(404).json({ error: 'Avatar de usuario no encontrado' });
        }
        
        const unlockedAvatars = result.unlocked_avatars.split(',').map(Number);
        
        if (!unlockedAvatars.includes(avatarId)) {
            return res.status(403).json({ error: 'Avatar no desbloqueado' });
        }
        
        // Cambiar avatar
        db.run('UPDATE user_avatars SET current_avatar = ? WHERE user_id = ?', 
            [avatarId, userId], 
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Error al cambiar avatar' });
                }
                
                res.json({ message: 'Avatar cambiado exitosamente', avatar: avatarId });
            }
        );
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.nodeEnv,
        version: '1.0.0'
    };
    
    res.status(200).json(healthCheck);
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
    const metrics = {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    };
    
    res.json(metrics);
});

// Error handling middleware
app.use(errorLogger);

// 404 handler
app.use((req, res) => {
    logger.warn('404 Not Found', { url: req.url, method: req.method, ip: req.ip });
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Servir archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
const server = app.listen(PORT, () => {
    logger.info('Servidor iniciado', { 
        port: PORT, 
        environment: config.nodeEnv,
        nodeVersion: process.version 
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando servidor...');
    server.close(() => {
        logger.info('Servidor cerrado');
        db.close((err) => {
            if (err) {
                logger.error('Error cerrando base de datos', { error: err.message });
            } else {
                logger.info('Base de datos cerrada');
            }
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT recibido, cerrando servidor...');
    server.close(() => {
        logger.info('Servidor cerrado');
        db.close((err) => {
            if (err) {
                logger.error('Error cerrando base de datos', { error: err.message });
            } else {
                logger.info('Base de datos cerrada');
            }
            process.exit(0);
        });
    });
});
