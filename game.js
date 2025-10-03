// Sistema de juego
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.isPaused = false;
        this.score = 0;
        this.lives = 3;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 2000; // 2 segundos de invulnerabilidad
        this.invulnerabilityStart = 0;
        this.screenShake = { active: false, intensity: 0, duration: 0, startTime: 0 };
        this.lastShotTime = 0;
        this.shotCooldown = 1000; // 1 segundo entre disparos
        this.lastBossShotTime = 0;
        this.bossShotCooldown = 3000; // 3 segundos entre disparos del boss
        this.currentLevel = 1;
        this.levelComplete = false;
        
        // Sistema de combos
        this.combo = {
            streak: 0,
            multiplier: 1,
            maxMultiplier: 5,
            streakTimer: 3000, // Reset si no matas nada en 3s
            lastKillTime: 0
        };

        // Sistema de garantía de powerups
        this.powerupGuarantee = {
            minPerLevel: 1,           // Mínimo por nivel
            currentLevelCount: 0,     // Contador del nivel actual
            lastSpawnTime: 0,         // Último spawn
            spawnInterval: 30000,     // 30 segundos entre garantías
            levelMultiplier: 1,       // Multiplicador por nivel
            baseProbability: 0.0001   // Probabilidad base por frame
        };

        // Sistema de estadísticas detalladas para tracking
        this.sessionStats = {
            gameStartTime: 0,
            enemies_killed: 0,
            enemies_killed_normal: 0,
            enemies_killed_fast: 0,
            enemies_killed_tank: 0,
            enemies_killed_zigzag: 0,
            enemies_killed_shooter: 0,
            bosses_defeated: 0,
            powerups_collected: 0,
            powerups_rapid_fire: 0,
            powerups_shield: 0,
            powerups_double_shot: 0,
            powerups_health: 0,
            shots_fired: 0,
            shots_hit: 0,
            damage_taken: 0,
            distance_traveled: 0,
            max_combo: 0,
            games_completed: 0,
            max_level_reached: 1,
            survival_time: 0,
            lives_lost: 0,
            lastPlayerPosition: { x: 0, y: 0 }
        };
        
        // Sistema de movimiento horizontal libre
        this.horizontalMovement = {
            enabled: true // Movimiento libre activado
        };
        
        // Configuración del juego
        this.config = {
            canvasWidth: 800,
            canvasHeight: 600,
            playerSpeed: 5,
            enemySpeed: 2,
            bulletSpeed: 8,
            enemySpawnRate: 0.02, // Probabilidad por frame
            enemySpeedIncrease: 0.001 // Incremento de velocidad por frame
        };

        // Entidades del juego
        this.player = null;
        this.boss = null;
        this.enemies = [];
        this.bullets = [];
        this.bossBullets = []; // Proyectiles del boss
        this.enemyBullets = []; // Proyectiles de los enemigos
        this.particles = [];
        this.powerUps = []; // Power-ups en el mapa
        this.floatingTexts = []; // Textos flotantes para power-ups
        this.dashTrail = []; // Estela del dash
        this.spawnTelegraphs = []; // Telegraphs de spawns en bordes

        // Input del jugador
        this.keys = {};
        this.mouse = { x: 0, y: 0, isLeftPressed: false };

        this.initializeCanvas();
        this.bindEvents();
        this.ensureLevelInfoPanel();
    }

    initializeCanvas() {
        // Ajustar canvas para diferentes pantallas
        const maxWidth = Math.min(window.innerWidth - 40, this.config.canvasWidth);
        const maxHeight = Math.min(window.innerHeight - 150, this.config.canvasHeight);
        
        const aspectRatio = this.config.canvasWidth / this.config.canvasHeight;
        
        if (maxWidth / maxHeight > aspectRatio) {
            this.canvas.style.height = maxHeight + 'px';
            this.canvas.style.width = (maxHeight * aspectRatio) + 'px';
        } else {
            this.canvas.style.width = maxWidth + 'px';
            this.canvas.style.height = (maxWidth / aspectRatio) + 'px';
        }

        // Configurar contexto
        this.ctx.imageSmoothingEnabled = false;
        this.canvas.style.cursor = 'crosshair';
    }

    ensureLevelInfoPanel() {
        // Crea un panel lateral a la izquierda del canvas para info de nivel y dash
        let panel = document.getElementById('level-info-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'level-info-panel';
            panel.style.position = 'absolute';
            panel.style.left = (this.canvas.getBoundingClientRect().left - 160) + 'px';
            panel.style.top = this.canvas.getBoundingClientRect().top + 'px';
            panel.style.width = '160px';
            panel.style.color = '#fff';
            panel.style.fontFamily = 'Courier New, monospace';
            panel.style.fontSize = '14px';
            panel.style.lineHeight = '20px';
            panel.style.pointerEvents = 'none';
            document.body.appendChild(panel);
        }
        this.levelInfoPanel = panel;
        // Reposicionar al redimensionar
        window.addEventListener('resize', () => {
            if (!this.levelInfoPanel) return;
            const rect = this.canvas.getBoundingClientRect();
            this.levelInfoPanel.style.left = (rect.left - 160) + 'px';
            this.levelInfoPanel.style.top = rect.top + 'px';
        });
    }

    bindEvents() {
        // Eventos de teclado
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Eventos de mouse
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.config.canvasWidth / rect.width;
            const scaleY = this.config.canvasHeight / rect.height;
            
            this.mouse.x = (e.clientX - rect.left) * scaleX;
            this.mouse.y = (e.clientY - rect.top) * scaleY;
        });

        // Click derecho para activar Dash
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.activateDash();
        });

        // Click izquierdo para disparo automático
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Click izquierdo
                e.preventDefault();
                this.mouse.isLeftPressed = true;
            } else if (e.button === 2) { // Click derecho
                e.preventDefault();
                this.activateDash();
            }
        });

        // Soltar click izquierdo para parar disparo automático
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) { // Click izquierdo
                e.preventDefault();
                this.mouse.isLeftPressed = false;
            }
        });

        // Prevenir menú contextual
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    initializeGame() {
        // Resetear estado
        this.score = 0;
        this.lives = 3;
        this.isInvulnerable = false;
        this.currentLevel = 1;
        this.levelComplete = false;
        
        // Resetear combo
        this.combo = {
            streak: 0,
            multiplier: 1,
            maxMultiplier: 5,
            streakTimer: 3000,
            lastKillTime: 0
        };
        
        this.enemies = [];
        this.bullets = [];
        this.bossBullets = [];
        this.enemyBullets = [];
        this.particles = [];
        this.powerUps = [];
        this.floatingTexts = [];
        this.dashTrail = [];
        this.lastShotTime = 0;
        this.lastBossShotTime = 0;
        
        // Resetear movimiento horizontal
        this.horizontalMovement = {
            enabled: true
        };

        // Resetear estadísticas de sesión
        this.sessionStats = {
            gameStartTime: Date.now(),
            enemies_killed: 0,
            enemies_killed_normal: 0,
            enemies_killed_fast: 0,
            enemies_killed_tank: 0,
            enemies_killed_zigzag: 0,
            enemies_killed_shooter: 0,
            bosses_defeated: 0,
            powerups_collected: 0,
            powerups_rapid_fire: 0,
            powerups_shield: 0,
            powerups_double_shot: 0,
            powerups_health: 0,
            shots_fired: 0,
            shots_hit: 0,
            damage_taken: 0,
            distance_traveled: 0,
            max_combo: 0,
            games_completed: 0,
            max_level_reached: this.currentLevel,
            survival_time: 0,
            lives_lost: 0,
            lastPlayerPosition: { x: this.config.canvasWidth / 2, y: this.config.canvasHeight / 2 }
        };

        // Crear jugador en el centro
        this.player = {
            x: this.config.canvasWidth / 2,
            y: this.config.canvasHeight / 2,
            width: 20,
            height: 20,
            health: 100,
            hasShield: false,
            rapidFire: false,
            rapidFireEnd: 0,
            doubleShot: false,
            doubleShotEnd: 0,
            isDashing: false,
            dashEnd: 0,
            dashCooldownEnd: 0
        };

        // Crear boss según el nivel
        this.createBossForLevel(this.currentLevel);

        this.updateScoreDisplay();
        this.updateBossHealthDisplay();
        this.updateLivesDisplay();
    }

    createBossForLevel(level) {
        switch(level) {
            case 1:
                // Boss Comandante Alfa - Boss original
                this.boss = {
                    x: 100,
                    y: 50,
                    width: 80,
                    height: 40,
                    maxHealth: 100,
                    health: 100,
                    speed: 2,
                    direction: 1,
                    isAlive: true,
                    type: "COMMANDER_ALPHA",
                    name: "Comandante Alfa",
                    shotCooldown: 3000,
                    lastShotTime: 0,
                    attackPattern: "SINGLE"
                };
                break;
            case 2:
                // Boss Destructor Beta - Más rápido y dispara doble
                this.boss = {
                    x: 80,
                    y: 40,
                    width: 100,
                    height: 50,
                    maxHealth: 150,
                    health: 150,
                    speed: 3,
                    direction: 1,
                    isAlive: true,
                    type: "DESTRUCTOR_BETA",
                    name: "Destructor Beta",
                    shotCooldown: 2500,
                    lastShotTime: 0,
                    attackPattern: "DOUBLE"
                };
                break;
            case 3:
                // Boss Aniquilador Gamma - Disparo en ráfaga
                this.boss = {
                    x: 60,
                    y: 30,
                    width: 120,
                    height: 60,
                    maxHealth: 200,
                    health: 200,
                    speed: 2.5,
                    direction: 1,
                    isAlive: true,
                    type: "ANNIHILATOR_GAMMA",
                    name: "Aniquilador Gamma",
                    shotCooldown: 4000,
                    lastShotTime: 0,
                    attackPattern: "BURST"
                };
                break;
            default:
                // Bosses infinitos con dificultad escalada
                const scaledLevel = level - 3;
                this.boss = {
                    x: 40,
                    y: 20,
                    width: 140 + (scaledLevel * 10),
                    height: 70 + (scaledLevel * 5),
                    maxHealth: 250 + (scaledLevel * 50),
                    health: 250 + (scaledLevel * 50),
                    speed: 3 + (scaledLevel * 0.5),
                    direction: 1,
                    isAlive: true,
                    type: "OVERLORD",
                    name: `Overlord ${level}`,
                    shotCooldown: Math.max(1500, 3000 - (scaledLevel * 200)),
                    lastShotTime: 0,
                    attackPattern: "CHAOS"
                };
        }
    }

    start() {
        if (!this.isRunning) {
            this.initializeGame();
            this.isRunning = true;
            this.isPaused = false;
            this.gameLoop();
        }
    }

    pause() {
        this.isPaused = !this.isPaused;
    }

    stop() {
        this.isRunning = false;
        this.isPaused = false;
    }

    gameLoop() {
        if (!this.isRunning) return;

        if (!this.isPaused) {
            this.update();
            this.render();
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // Tracking: distancia recorrida
        if (this.player) {
            const currentPlayerPos = { x: this.player.x, y: this.player.y };
            const lastPlayerPos = this.sessionStats.lastPlayerPosition;
            const distance = Math.sqrt(
                Math.pow(currentPlayerPos.x - lastPlayerPos.x, 2) + 
                Math.pow(currentPlayerPos.y - lastPlayerPos.y, 2)
            );
            this.sessionStats.distance_traveled += distance;
            this.sessionStats.lastPlayerPosition = { ...currentPlayerPos };
        }
        
        // Tracking: combo máximo
        if (this.combo.streak > this.sessionStats.max_combo) {
            this.sessionStats.max_combo = this.combo.streak;
        }
        
        // Tracking: nivel máximo alcanzado
        if (this.currentLevel > this.sessionStats.max_level_reached) {
            this.sessionStats.max_level_reached = this.currentLevel;
        }
        
        // Tracking: tiempo de supervivencia
        this.sessionStats.survival_time = Math.floor((Date.now() - this.sessionStats.gameStartTime) / 1000);
        
        this.updateScreenShake();
        this.updateInvulnerability();
        this.updateComboTimer();
        this.updatePlayer();
        this.updateAutoShoot();
        this.updateDash();
        this.updateBoss();
        this.updateEnemies();
        this.updateBullets();
        this.updateBossBullets();
        this.updateEnemyBullets();
        this.updateParticles();
        this.updatePowerUps();
        this.updateFloatingTexts();
        this.updateTelegraphs();
        this.spawnEnemies();
        this.spawnPowerUps();
        this.handleBossShooting();
        this.checkCollisions();
        this.checkLevelComplete();
        this.updateScoreDisplay();
        this.updateBossHealthDisplay();
        this.updateLivesDisplay();
    }

    updatePlayer() {
        // Calcular velocidad actual (aumentada si está en dash)
        const currentSpeed = this.player.isDashing ? this.config.playerSpeed * 1.2 : this.config.playerSpeed;
        
        // Movimiento vertical con W y S
        if (this.keys['w'] && this.player.y > 0) {
            this.player.y -= currentSpeed;
        }
        if (this.keys['s'] && this.player.y < this.config.canvasHeight - this.player.height) {
            this.player.y += currentSpeed;
        }

        // Movimiento horizontal libre con A y D
        if (this.keys['a'] && this.player.x > 0) {
            this.player.x -= currentSpeed;
        }
        if (this.keys['d'] && this.player.x < this.config.canvasWidth - this.player.width) {
            this.player.x += currentSpeed;
        }
    }

    updateAutoShoot() {
        // Disparo automático si se mantiene presionado el click izquierdo y no está en dash
        if (this.mouse.isLeftPressed && !this.player.isDashing) {
            this.shoot();
        }
    }

    updateDash() {
        const currentTime = Date.now();
        
        // Crear estela si está en dash
        if (this.player.isDashing) {
            this.dashTrail.push({
                x: this.player.x,
                y: this.player.y,
                width: this.player.width,
                height: this.player.height,
                life: 14,
                maxLife: 14
            });
        }
        
        // Actualizar estela
        for (let i = this.dashTrail.length - 1; i >= 0; i--) {
            const trail = this.dashTrail[i];
            trail.life--;
            
            if (trail.life <= 0) {
                this.dashTrail.splice(i, 1);
            }
        }
        
        // Verificar si el dash ha terminado
        if (this.player.isDashing && currentTime >= this.player.dashEnd) {
            this.player.isDashing = false;
        }
    }

    updateInvulnerability() {
        if (this.isInvulnerable) {
            const currentTime = Date.now();
            if (currentTime - this.invulnerabilityStart >= this.invulnerabilityTime) {
                this.isInvulnerable = false;
            }
        }
    }

    updateComboTimer() {
        const currentTime = Date.now();
        if (this.combo.streak > 0 && currentTime - this.combo.lastKillTime > this.combo.streakTimer) {
            this.resetCombo();
        }
    }

    updateCombo() {
        const currentTime = Date.now();
        this.combo.streak++;
        this.combo.lastKillTime = currentTime;
        
        // Calcular multiplicador basado en el streak
        this.combo.multiplier = Math.min(
            1 + Math.floor(this.combo.streak / 5) * 0.5,
            this.combo.maxMultiplier
        );
    }

    resetCombo() {
        this.combo.streak = 0;
        this.combo.multiplier = 1;
    }

    updateScreenShake() {
        if (this.screenShake.active) {
            const currentTime = Date.now();
            if (currentTime - this.screenShake.startTime >= this.screenShake.duration) {
                this.screenShake.active = false;
            }
        }
    }

    triggerScreenShake(intensity, duration) {
        this.screenShake.active = true;
        this.screenShake.intensity = intensity;
        this.screenShake.duration = duration;
        this.screenShake.startTime = Date.now();
    }

    activateDash() {
        const currentTime = Date.now();
        
        // Verificar que no esté en cooldown y no esté ya en dash
        if (currentTime < this.player.dashCooldownEnd || this.player.isDashing) {
            return;
        }
        
        // Activar dash
        this.player.isDashing = true;
        this.player.dashEnd = currentTime + 1500; // 1.5 segundos
        this.player.dashCooldownEnd = currentTime + 3500; // 2 segundos de cooldown después del dash (1.5s dash + 2s cooldown)
    }


    updateBoss() {
        if (!this.boss || !this.boss.isAlive) return;

        // Mover boss de izquierda a derecha
        this.boss.x += this.boss.speed * this.boss.direction;

        // Cambiar dirección al llegar a los bordes
        if (this.boss.x <= 0) {
            this.boss.direction = 1; // Ir a la derecha
            this.boss.x = 0;
        } else if (this.boss.x >= this.config.canvasWidth - this.boss.width) {
            this.boss.direction = -1; // Ir a la izquierda
            this.boss.x = this.config.canvasWidth - this.boss.width;
        }
    }

    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Comportamiento específico por tipo
            switch(enemy.type) {
                case "NORMAL":
                case "FAST":
                case "TANK":
                    this.updateNormalEnemy(enemy);
                    break;
                case "ZIGZAG":
                    this.updateZigzagEnemy(enemy);
                    break;
                case "SHOOTER":
                    this.updateShooterEnemy(enemy);
                    break;
            }

            // Eliminar enemigos que salieron de pantalla
            if (enemy.x > this.config.canvasWidth + 50 || enemy.x < -50) {
                this.enemies.splice(i, 1);
            }
        }
    }

    updateNormalEnemy(enemy) {
        // Movimiento horizontal normal
        if (enemy.side === 'left') {
            enemy.x += enemy.speed;
        } else {
            enemy.x -= enemy.speed;
        }
    }

    updateZigzagEnemy(enemy) {
        // Movimiento horizontal
        if (enemy.side === 'left') {
            enemy.x += enemy.speed;
        } else {
            enemy.x -= enemy.speed;
        }

        // Movimiento zigzag vertical
        enemy.zigzagTimer++;
        if (enemy.zigzagTimer > 30) { // Cambiar dirección cada 30 frames
            enemy.zigzagDirection *= -1;
            enemy.zigzagTimer = 0;
        }
        
        enemy.y += enemy.zigzagDirection * 2;
        
        // Mantener dentro de los límites verticales
        if (enemy.y < 0) {
            enemy.y = 0;
            enemy.zigzagDirection = 1;
        } else if (enemy.y > this.config.canvasHeight - enemy.height) {
            enemy.y = this.config.canvasHeight - enemy.height;
            enemy.zigzagDirection = -1;
        }
    }

    updateShooterEnemy(enemy) {
        // Movimiento horizontal más lento
        if (enemy.side === 'left') {
            enemy.x += enemy.speed;
        } else {
            enemy.x -= enemy.speed;
        }

        // Disparar hacia el jugador
        const currentTime = Date.now();
        if (currentTime - enemy.lastShotTime >= enemy.shotCooldown) {
            this.enemyShoot(enemy);
            enemy.lastShotTime = currentTime;
        }
    }

    enemyShoot(enemy) {
        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;

        const dx = playerCenterX - enemyCenterX;
        const dy = playerCenterY - enemyCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        const bulletSpeed = 3;
        const vx = (dx / distance) * bulletSpeed;
        const vy = (dy / distance) * bulletSpeed;

        const enemyBullet = {
            x: enemyCenterX,
            y: enemyCenterY,
            width: 5,
            height: 5,
            vx: vx,
            vy: vy,
            color: '#ff4d4d'
        };

        this.enemyBullets.push(enemyBullet);
    }

    updateEnemyBullets() {
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            // Eliminar balas fuera de pantalla
            if (bullet.x < 0 || bullet.x > this.config.canvasWidth || 
                bullet.y < 0 || bullet.y > this.config.canvasHeight) {
                this.enemyBullets.splice(i, 1);
            }
        }
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            // Eliminar balas fuera de pantalla
            if (bullet.x < 0 || bullet.x > this.config.canvasWidth || 
                bullet.y < 0 || bullet.y > this.config.canvasHeight) {
                this.bullets.splice(i, 1);
            }
        }
    }

    updateBossBullets() {
        for (let i = this.bossBullets.length - 1; i >= 0; i--) {
            const bullet = this.bossBullets[i];
            
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            // Eliminar balas fuera de pantalla
            if (bullet.x < 0 || bullet.x > this.config.canvasWidth || 
                bullet.y < 0 || bullet.y > this.config.canvasHeight) {
                this.bossBullets.splice(i, 1);
            }
        }
    }

    handleBossShooting() {
        if (!this.boss || !this.boss.isAlive) return;
        
        const currentTime = Date.now();
        if (currentTime - this.boss.lastShotTime >= this.boss.shotCooldown) {
            this.bossShoot();
            this.boss.lastShotTime = currentTime;
        }
    }

    bossShoot() {
        if (!this.boss || !this.boss.isAlive) return;

        const bossCenterX = this.boss.x + this.boss.width / 2;
        const bossCenterY = this.boss.y + this.boss.height / 2;
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;

        switch(this.boss.attackPattern) {
            case "SINGLE":
                this.createBossBullet(bossCenterX, bossCenterY, playerCenterX, playerCenterY, 4);
                break;
            case "DOUBLE":
                // Disparo doble con ligera separación
                this.createBossBullet(bossCenterX - 10, bossCenterY, playerCenterX - 20, playerCenterY, 4);
                this.createBossBullet(bossCenterX + 10, bossCenterY, playerCenterX + 20, playerCenterY, 4);
                break;
            case "BURST":
                // Ráfaga de 3 disparos
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        if (this.boss && this.boss.isAlive) {
                            this.createBossBullet(bossCenterX, bossCenterY, playerCenterX, playerCenterY, 5);
                        }
                    }, i * 200);
                }
                break;
            case "CHAOS":
                // Patrón caótico - múltiples direcciones
                this.createBossBullet(bossCenterX, bossCenterY, playerCenterX, playerCenterY, 4);
                this.createBossBullet(bossCenterX, bossCenterY, playerCenterX - 50, playerCenterY, 3);
                this.createBossBullet(bossCenterX, bossCenterY, playerCenterX + 50, playerCenterY, 3);
                break;
        }
    }

    createBossBullet(startX, startY, targetX, targetY, speed) {
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        const vx = (dx / distance) * speed;
        const vy = (dy / distance) * speed;

        const bossBullet = {
            x: startX,
            y: startY,
            width: 8,
            height: 8,
            vx: vx,
            vy: vy,
            color: '#ff4d4d'
        };

        this.bossBullets.push(bossBullet);
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;

            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updatePowerUps() {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            // Efectos visuales
            powerUp.pulsePhase += 0.1;
            powerUp.glowIntensity = 0.5 + Math.sin(powerUp.pulsePhase) * 0.5;
            powerUp.rotation = (powerUp.rotation || 0) + 0.02; // Rotación lenta
            
            // Efecto magnet
            if (this.player.magnet) {
                const playerCenterX = this.player.x + this.player.width / 2;
                const playerCenterY = this.player.y + this.player.height / 2;
                const powerUpCenterX = powerUp.x + powerUp.width / 2;
                const powerUpCenterY = powerUp.y + powerUp.height / 2;
                
                const dx = playerCenterX - powerUpCenterX;
                const dy = playerCenterY - powerUpCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 150) { // Rango de atracción
                    const magnetSpeed = 3;
                    const vx = (dx / distance) * magnetSpeed;
                    const vy = (dy / distance) * magnetSpeed;
                    
                    powerUp.x += vx;
                    powerUp.y += vy;
                }
            }
            
            // Los power-ups desaparecen después de 15 segundos
            if (Date.now() - powerUp.spawnTime > 15000) {
                this.powerUps.splice(i, 1);
            }
        }
    }

    updateFloatingTexts() {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const text = this.floatingTexts[i];
            
            // Mover texto hacia arriba
            text.y -= text.speed;
            text.life--;
            
            // Cambiar opacidad con el tiempo
            text.alpha = text.life / text.maxLife;
            
            // Eliminar texto cuando termine su vida
            if (text.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    createFloatingText(x, y, message, color = '#fff') {
        const floatingText = {
            x: x,
            y: y,
            message: message,
            color: color,
            speed: 2,
            life: 60, // 60 frames
            maxLife: 60,
            alpha: 1,
            scale: 1
        };
        
        this.floatingTexts.push(floatingText);
    }

    spawnPowerUps() {
        const currentTime = Date.now();
        const timeSinceLastSpawn = currentTime - this.powerupGuarantee.lastSpawnTime;
        
        // Calcular probabilidad base ajustada por nivel
        const levelMultiplier = Math.min(1 + (this.currentLevel - 1) * 0.5, 3.0);
        const adjustedProbability = this.powerupGuarantee.baseProbability * levelMultiplier;
        
        // Sistema de garantía: si no ha aparecido uno en mucho tiempo
        const guaranteeThreshold = this.powerupGuarantee.spawnInterval / (1 + this.currentLevel * 0.3);
        const needsGuaranteedSpawn = timeSinceLastSpawn > guaranteeThreshold;
        
        // Spawn si cumple probabilidad normal O si necesita garantía
        if (Math.random() < adjustedProbability || needsGuaranteedSpawn) {
            // Sistema de probabilidades ponderadas (mantiene las rarezas relativas)
            const powerUpWeights = [
                { type: "RAPID_FIRE", weight: 0.0025 },  // 0.0025%
                { type: "SHIELD", weight: 0.005 },       // 0.005%
                { type: "DOUBLE_SHOT", weight: 0.0005 }, // 0.0005%
                { type: "HEALTH", weight: 0.00005 }      // 0.00005%
            ];
            
            const totalWeight = powerUpWeights.reduce((sum, item) => sum + item.weight, 0);
            let random = Math.random() * totalWeight;
            
            let type = "RAPID_FIRE"; // fallback
            for (const item of powerUpWeights) {
                random -= item.weight;
                if (random <= 0) {
                    type = item.type;
                    break;
                }
            }
            
            const powerUp = {
                x: Math.random() * (this.config.canvasWidth - 30),
                y: Math.random() * (this.config.canvasHeight - 30),
                width: 30,
                height: 30,
                type: type,
                spawnTime: currentTime,
                pulsePhase: 0,
                glowIntensity: 1
            };
            
            this.powerUps.push(powerUp);
            
            // Actualizar contadores del sistema de garantía
            this.powerupGuarantee.lastSpawnTime = currentTime;
            this.powerupGuarantee.currentLevelCount++;
            
            // Log para debugging (opcional)
            if (needsGuaranteedSpawn) {
                console.log(`Powerup garantizado spawn en nivel ${this.currentLevel} (${this.powerupGuarantee.currentLevelCount}/${this.powerupGuarantee.minPerLevel})`);
            }
        }
    }

    spawnEnemies() {
        // Incrementar dificultad gradualmente
        const currentEnemySpeed = this.config.enemySpeed + (this.score * this.config.enemySpeedIncrease);
        
        if (Math.random() < this.config.enemySpawnRate) {
            const side = Math.random() < 0.5 ? 'left' : 'right';
            let baseY = Math.random() * (this.config.canvasHeight - 30);
            if (this.player && Math.abs(baseY - this.player.y) < 40) {
                baseY = Math.min(this.config.canvasHeight - 30, Math.max(0, this.player.y + (Math.random() < 0.5 ? -60 : 60)));
            }
            this.spawnTelegraphs.push({
                side,
                y: baseY,
                spawnAt: Date.now() + 500,
                pulse: 0,
                speedRef: currentEnemySpeed
            });
        }
    }

    createRandomEnemy(side, baseSpeed) {
        const enemyTypes = ["NORMAL", "FAST", "TANK", "ZIGZAG", "SHOOTER"];
        const weights = [40, 25, 15, 15, 5]; // Probabilidades ponderadas
        
        // Selección ponderada
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        let selectedType = enemyTypes[0];
        
        for (let i = 0; i < enemyTypes.length; i++) {
            if (random < weights[i]) {
                selectedType = enemyTypes[i];
                break;
            }
            random -= weights[i];
        }

        const baseX = side === 'left' ? -30 : this.config.canvasWidth + 30;
        const baseY = Math.random() * (this.config.canvasHeight - 30);

        switch(selectedType) {
            case "NORMAL":
                return {
                    x: baseX,
                    y: baseY,
                    width: 25,
                    height: 25,
                    speed: baseSpeed + Math.random() * 1,
                    side: side,
                    type: "NORMAL",
                    health: 1,
                    points: 10,
                    color: '#fff'
                };
            
            case "FAST":
                return {
                    x: baseX,
                    y: baseY,
                    width: 20,
                    height: 20,
                    speed: baseSpeed * 2 + Math.random() * 1,
                    side: side,
                    type: "FAST",
                    health: 1,
                    points: 15,
                    color: '#fff'
                };
            
            case "TANK":
                return {
                    x: baseX,
                    y: baseY,
                    width: 35,
                    height: 35,
                    speed: baseSpeed * 0.7,
                    side: side,
                    type: "TANK",
                    health: 2,
                    maxHealth: 2,
                    points: 25,
                    color: '#fff'
                };
            
            case "ZIGZAG":
                return {
                    x: baseX,
                    y: baseY,
                    width: 22,
                    height: 22,
                    speed: baseSpeed * 1.2,
                    side: side,
                    type: "ZIGZAG",
                    health: 1,
                    points: 20,
                    color: '#fff',
                    zigzagDirection: 1,
                    zigzagTimer: 0
                };
            
            case "SHOOTER":
                return {
                    x: baseX,
                    y: baseY,
                    width: 30,
                    height: 30,
                    speed: baseSpeed * 0.8,
                    side: side,
                    type: "SHOOTER",
                    health: 1,
                    points: 30,
                    color: '#fff',
                    lastShotTime: Date.now(),
                    shotCooldown: 2000
                };
            
            default:
                return this.createRandomEnemy(side, baseSpeed); // Fallback
        }
    }

    shoot() {
        const currentTime = Date.now();
        
        // Verificar power-ups temporales
        if (this.player.rapidFire && currentTime > this.player.rapidFireEnd) {
            this.player.rapidFire = false;
        }
        if (this.player.doubleShot && currentTime > this.player.doubleShotEnd) {
            this.player.doubleShot = false;
        }
        
        // Cooldown ajustado por rapid fire
        const currentCooldown = this.player.rapidFire ? 300 : this.shotCooldown;
        
        if (currentTime - this.lastShotTime < currentCooldown) {
            return; // Aún en cooldown
        }

        this.lastShotTime = currentTime;

        // Tracking: contar disparos
        this.sessionStats.shots_fired++;

        // Calcular dirección hacia el mouse
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        
        const dx = this.mouse.x - playerCenterX;
        const dy = this.mouse.y - playerCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        // Normalizar y aplicar velocidad
        const vx = (dx / distance) * this.config.bulletSpeed;
        const vy = (dy / distance) * this.config.bulletSpeed;

        // Disparo principal
        const bullet = {
            x: playerCenterX,
            y: playerCenterY,
            width: 6,
            height: 6,
            vx: vx,
            vy: vy,
            color: '#00e5ff'
        };

        this.bullets.push(bullet);
        
        // Disparo doble si tienes el power-up
        if (this.player.doubleShot) {
            const bullet2 = {
                x: playerCenterX,
                y: playerCenterY,
                width: 6,
                height: 6,
                vx: vx + (Math.random() - 0.5) * 2, // Ligera variación
                vy: vy + (Math.random() - 0.5) * 2,
                color: '#00e5ff'
            };
            this.bullets.push(bullet2);
        }
    }
    
    checkCollisions() {
        // Balas vs Boss
        if (this.boss && this.boss.isAlive) {
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                const bullet = this.bullets[i];
                
                if (this.isColliding(bullet, this.boss)) {
                    // Crear partículas de explosión
                    this.createExplosion(bullet.x, bullet.y);
                    
                    // Tracking: disparo acertado
                    this.sessionStats.shots_hit++;
                    
                    // Eliminar bala
                    this.bullets.splice(i, 1);
                    
                    // Reducir vida del boss
                    this.boss.health -= 10;
                    
                    // Aumentar puntuación por golpear al boss
                    this.score += 25;
                    
                    // Verificar si el boss murió
                    if (this.boss.health <= 0) {
                        this.boss.isAlive = false;
                        this.score += 500; // Bonus por derrotar al boss
                        
                        // Tracking: boss derrotado
                        this.sessionStats.bosses_defeated++;
                        
                        this.createBossExplosion();
                        this.triggerScreenShake(15, 1000); // Screen shake grande para boss derrotado
                        this.checkVictory();
                    }
                    break;
                }
            }
        }

        // Balas vs Enemigos
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                
                if (this.isColliding(bullet, enemy)) {
                    // Crear partículas de explosión
                    this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    
                    // Tracking: disparo acertado
                    this.sessionStats.shots_hit++;
                    
                    // Eliminar bala
                    this.bullets.splice(i, 1);
                    
                    // Reducir vida del enemigo
                    enemy.health--;
                    
                    // Si el enemigo murió, eliminarlo y dar puntos
                    if (enemy.health <= 0) {
                        // Tracking: enemigo eliminado
                        this.sessionStats.enemies_killed++;
                        
                        // Tracking por tipo de enemigo
                        switch(enemy.type) {
                            case 'NORMAL': this.sessionStats.enemies_killed_normal++; break;
                            case 'FAST': this.sessionStats.enemies_killed_fast++; break;
                            case 'TANK': this.sessionStats.enemies_killed_tank++; break;
                            case 'ZIGZAG': this.sessionStats.enemies_killed_zigzag++; break;
                            case 'SHOOTER': this.sessionStats.enemies_killed_shooter++; break;
                        }
                        
                        this.enemies.splice(j, 1);
                        const points = Math.floor(enemy.points * this.combo.multiplier);
                        this.score += points;
                        this.updateCombo();
                    }
                    break;
                }
            }
        }

        // Jugador vs Power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            if (this.isColliding(this.player, powerUp)) {
                // Tracking: power-up recogido
                this.sessionStats.powerups_collected++;
                
                // Tracking por tipo de power-up
                switch(powerUp.type) {
                    case 'RAPID_FIRE': this.sessionStats.powerups_rapid_fire++; break;
                    case 'SHIELD': this.sessionStats.powerups_shield++; break;
                    case 'DOUBLE_SHOT': this.sessionStats.powerups_double_shot++; break;
                    case 'HEALTH': this.sessionStats.powerups_health++; break;
                }
                
                this.applyPowerUp(powerUp.type);
                this.powerUps.splice(i, 1);
                this.createExplosion(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2);
            }
        }

        // Jugador vs Enemigos
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            
            if (this.isColliding(this.player, enemy) && !this.isInvulnerable && !this.player.isDashing) {
                this.takeDamage();
                break;
            }
        }

        // Jugador vs Boss
        if (this.boss && this.boss.isAlive && this.isColliding(this.player, this.boss) && !this.isInvulnerable && !this.player.isDashing) {
            this.takeDamage();
        }

        // Jugador vs Balas del Boss
        for (let i = this.bossBullets.length - 1; i >= 0; i--) {
            const bossBullet = this.bossBullets[i];
            
            if (this.isColliding(this.player, bossBullet) && !this.isInvulnerable && !this.player.isDashing) {
                // Crear partículas cuando el jugador es golpeado
                this.createExplosion(bossBullet.x, bossBullet.y);
                
                // Eliminar la bala del boss
                this.bossBullets.splice(i, 1);
                
                // Tomar daño
                this.takeDamage();
                break;
            }
        }

        // Jugador vs Balas de Enemigos
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const enemyBullet = this.enemyBullets[i];
            
            if (this.isColliding(this.player, enemyBullet) && !this.isInvulnerable && !this.player.isDashing) {
                // Crear partículas cuando el jugador es golpeado
                this.createExplosion(enemyBullet.x, enemyBullet.y);
                
                // Eliminar la bala del enemigo
                this.enemyBullets.splice(i, 1);
                
                // Tomar daño
                this.takeDamage();
                break;
            }
        }
    }

    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    createExplosion(x, y) {
        for (let i = 0; i < 8; i++) {
            const particle = {
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 20
            };
            this.particles.push(particle);
        }
    }

    createBossExplosion() {
        if (!this.boss) return;
        
        const centerX = this.boss.x + this.boss.width / 2;
        const centerY = this.boss.y + this.boss.height / 2;
        
        // Crear una explosión más grande para el boss
        for (let i = 0; i < 20; i++) {
            const particle = {
                x: centerX + (Math.random() - 0.5) * this.boss.width,
                y: centerY + (Math.random() - 0.5) * this.boss.height,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30
            };
            this.particles.push(particle);
        }
    }

    takeDamage() {
        // Tracking: daño recibido
        this.sessionStats.damage_taken++;
        
        if (this.player.hasShield) {
            // El escudo absorbe el golpe
            this.player.hasShield = false;
            this.createExplosion(this.player.x + this.player.width/2, this.player.y + this.player.height/2);
            this.triggerScreenShake(3, 200);
        } else {
            // Perder una vida
            this.lives--;
            
            // Tracking: vida perdida
            this.sessionStats.lives_lost++;
            
            this.isInvulnerable = true;
            this.invulnerabilityStart = Date.now();
            this.resetCombo(); // Resetear combo al tomar daño
            this.triggerScreenShake(8, 500);
        
            if (this.lives <= 0) {
                this.gameOver();
            }
        }
    }

    applyPowerUp(type) {
        const currentTime = Date.now();
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        
        let message = '';
        let color = '#fff';
        
        switch(type) {
            case "RAPID_FIRE":
                this.player.rapidFire = true;
                this.player.rapidFireEnd = currentTime + 8000; // 8 segundos
                message = "RAPID FIRE!";
                color = '#ff4444';
                break;
            case "SHIELD":
                this.player.hasShield = true;
                message = "SHIELD!";
                color = '#4444ff';
                break;
            case "DOUBLE_SHOT":
                this.player.doubleShot = true;
                this.player.doubleShotEnd = currentTime + 10000; // 10 segundos
                message = "DOUBLE SHOT!";
                color = '#44ff44';
                break;
            case "HEALTH":
                if (this.lives < 3) {
                    this.lives++;
                    message = "LIFE UP!";
                    color = '#ff44ff';
                } else {
                    message = "MAX LIVES!";
                    color = '#ff44ff';
                }
                break;
        }
        
        // Crear texto flotante
        this.createFloatingText(playerCenterX, playerCenterY - 30, message, color);
        
        // Crear partículas especiales para el power-up
        this.createPowerUpParticles(playerCenterX, playerCenterY, color);
    }

    createPowerUpParticles(x, y, color) {
        // Crear partículas especiales con color específico
        for (let i = 0; i < 15; i++) {
            const particle = {
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30,
                maxLife: 30,
                color: color,
                size: Math.random() * 3 + 1
            };
            this.particles.push(particle);
        }
    }

    checkLevelComplete() {
        if (this.boss && !this.boss.isAlive && !this.levelComplete) {
            this.levelComplete = true;
            
            // Esperar 2 segundos antes de avanzar al siguiente nivel
            setTimeout(() => {
                this.nextLevel();
            }, 2000);
        }
    }

    // Telegraphs de spawns laterales
    updateTelegraphs() {
        const now = Date.now();
        for (let i = this.spawnTelegraphs.length - 1; i >= 0; i--) {
            const t = this.spawnTelegraphs[i];
            t.pulse += 0.15;
            if (now >= t.spawnAt) {
                const enemy = this.createRandomEnemy(t.side, t.speedRef);
                enemy.y = Math.min(this.config.canvasHeight - enemy.height, Math.max(0, t.y));
                this.enemies.push(enemy);
                this.spawnTelegraphs.splice(i, 1);
            }
        }
    }

    drawTelegraphs() {
        this.ctx.save();
        for (const t of this.spawnTelegraphs) {
            const alpha = 0.4 + 0.3 * Math.sin(t.pulse);
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = '#ffd93d';
            const barHeight = 30;
            if (t.side === 'left') {
                this.ctx.fillRect(0, t.y, 8, barHeight);
            } else {
                this.ctx.fillRect(this.config.canvasWidth - 8, t.y, 8, barHeight);
            }
        }
        this.ctx.restore();
    }

    nextLevel() {
        this.currentLevel++;
        this.levelComplete = false;
        
        // Limpiar entidades
        this.enemies = [];
        this.bossBullets = [];
        this.powerUps = [];
        
        // Reset contador de powerups para el nuevo nivel
        this.powerupGuarantee.currentLevelCount = 0;
        this.powerupGuarantee.levelMultiplier = Math.min(this.currentLevel, 4);
        
        // Ajustar mínimo de powerups por nivel
        this.powerupGuarantee.minPerLevel = Math.min(this.currentLevel, 4);
        
        // Crear nuevo boss
        this.createBossForLevel(this.currentLevel);
        
        // Bonus por completar nivel
        this.score += 100;
        
        console.log(`¡Nivel ${this.currentLevel} iniciado! Mínimo ${this.powerupGuarantee.minPerLevel} powerups garantizados.`);
    }

    checkVictory() {
        // Opcional: Puedes agregar lógica de victoria aquí
        // Por ahora, el juego continúa después de derrotar al boss
        console.log("¡Boss derrotado!");
    }
    
    render() {
        // Aplicar screen shake si está activo
        this.ctx.save();
        if (this.screenShake.active) {
            const shakeX = (Math.random() - 0.5) * this.screenShake.intensity;
            const shakeY = (Math.random() - 0.5) * this.screenShake.intensity;
            this.ctx.translate(shakeX, shakeY);
        }

        // Limpiar canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);

        // Dibujar boss (si está vivo)
        if (this.boss && this.boss.isAlive) {
            this.drawBoss();
        }

        // Dibujar estela del dash
        this.drawDashTrail();
        
        // Dibujar jugador (con efectos de invulnerabilidad y escudo)
        this.drawPlayer();

        // Dibujar crosshair en posición del mouse
        this.drawCrosshair();

        // Dibujar enemigos
        this.drawTelegraphs();
        for (const enemy of this.enemies) {
            this.drawEnemy(enemy);
        }

        // Dibujar balas del jugador
        for (const bullet of this.bullets) {
            this.ctx.fillStyle = bullet.color || '#ffffff';
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }

        // Dibujar balas del boss (más grandes y con halo)
        for (const bossBullet of this.bossBullets) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.35;
            this.ctx.fillStyle = 'rgba(255,77,77,0.35)';
            this.ctx.fillRect(bossBullet.x - 2, bossBullet.y - 2, bossBullet.width + 4, bossBullet.height + 4);
            this.ctx.restore();
            this.ctx.fillStyle = bossBullet.color || '#ff4d4d';
            this.ctx.fillRect(bossBullet.x, bossBullet.y, bossBullet.width, bossBullet.height);
        }

        // Dibujar balas de enemigos
        for (const enemyBullet of this.enemyBullets) {
            this.ctx.fillStyle = enemyBullet.color || '#ff4d4d';
            this.ctx.fillRect(enemyBullet.x, enemyBullet.y, enemyBullet.width, enemyBullet.height);
        }

        // Dibujar power-ups
        for (const powerUp of this.powerUps) {
            this.drawPowerUp(powerUp);
        }

        // Dibujar partículas
        for (const particle of this.particles) {
            const alpha = particle.life / (particle.maxLife || 20);
            this.ctx.globalAlpha = alpha;
            
            if (particle.color) {
                this.ctx.fillStyle = particle.color;
                const size = particle.size || 2;
                this.ctx.fillRect(particle.x - size/2, particle.y - size/2, size, size);
            } else {
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
            }
        }
        this.ctx.globalAlpha = 1;

        // Dibujar textos flotantes
        for (const text of this.floatingTexts) {
            this.drawFloatingText(text);
        }

        // Dibujar línea de mira
        this.drawAimLine();

        // Dibujar información del nivel y boss
        this.drawLevelInfo();

        // Restaurar contexto después del screen shake
        this.ctx.restore();
    }

    drawCrosshair() {
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        
        // Líneas del crosshair
        this.ctx.moveTo(this.mouse.x - 10, this.mouse.y);
        this.ctx.lineTo(this.mouse.x + 10, this.mouse.y);
        this.ctx.moveTo(this.mouse.x, this.mouse.y - 10);
        this.ctx.lineTo(this.mouse.x, this.mouse.y + 10);
        
        this.ctx.stroke();
    }

    drawBoss() {
        if (!this.boss || !this.boss.isAlive) return;

        // Dibujar el cuerpo del boss (más grande)
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(this.boss.x, this.boss.y, this.boss.width, this.boss.height);

        // Dibujar barra de vida del boss
        this.drawBossHealthBar();
    }

    drawBossHealthBar() {
        if (!this.boss || !this.boss.isAlive) return;

        const barWidth = this.boss.width;
        const barHeight = 6;
        const barX = this.boss.x;
        const barY = this.boss.y - 12;

        // Fondo de la barra (negro)
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

        // Borde de la barra (blanco)
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Vida actual (blanco)
        const healthPercent = this.boss.health / this.boss.maxHealth;
        const healthWidth = barWidth * healthPercent;
        
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(barX, barY, healthWidth, barHeight);
    }

    drawAimLine() {
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(playerCenterX, playerCenterY);
        this.ctx.lineTo(this.mouse.x, this.mouse.y);
        this.ctx.stroke();
    }


    drawPlayer() {
        // Efecto de parpadeo si está invulnerable
        if (this.isInvulnerable) {
            const blinkRate = Math.floor(Date.now() / 100) % 2;
            if (blinkRate === 0) return; // No dibujar en algunos frames
        }

        this.ctx.save();
        
        // Aplicar transparencia si está en dash (restaurado a original)
        if (this.player.isDashing) {
            this.ctx.globalAlpha = 1;
        }

        // Color del jugador
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);

        // Dibujar escudo si lo tiene
        if (this.player.hasShield) {
            this.ctx.strokeStyle = '#4444ff';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height / 2,
                15, 0, Math.PI * 2
            );
            this.ctx.stroke();
        }

        // Efecto de magnet (círculo de atracción)
        if (this.player.magnet) {
            this.ctx.strokeStyle = '#44ffff';
            this.ctx.lineWidth = 1;
            this.ctx.globalAlpha = 0.3;
            this.ctx.beginPath();
            this.ctx.arc(
                this.player.x + this.player.width / 2,
                this.player.y + this.player.height / 2,
                150, 0, Math.PI * 2
            );
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        }
        
        this.ctx.restore();
    }

    drawDashTrail() {
        // Dibujar estela del dash
        for (const trail of this.dashTrail) {
            const alpha = trail.life / trail.maxLife;
            this.ctx.save();
            this.ctx.globalAlpha = alpha * 0.3; // Estela muy transparente (original)
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(trail.x, trail.y, trail.width, trail.height);
            this.ctx.restore();
        }
    }

    drawPowerUp(powerUp) {
        // Efecto de brillo pulsante
        this.ctx.save();
        this.ctx.globalAlpha = powerUp.glowIntensity;
        
        const centerX = powerUp.x + powerUp.width / 2;
        const centerY = powerUp.y + powerUp.height / 2;
        const radius = powerUp.width / 2;
        
        // Obtener color del power-up
        let letter = '';
        let symbol = '';
        let color = '#fff';
        let bgColor = '#333';
        switch(powerUp.type) {
            case 'RAPID_FIRE': 
                letter = 'R'; 
                symbol = '🔥'; 
                color = '#ff4444'; 
                bgColor = '#441111'; 
                break;
            case 'SHIELD': 
                letter = 'S'; 
                symbol = '🛡️'; 
                color = '#4444ff'; 
                bgColor = '#111144'; 
                break;
            case 'DOUBLE_SHOT': 
                letter = 'D'; 
                symbol = '⚡'; 
                color = '#44ff44'; 
                bgColor = '#114411'; 
                break;
            case 'HEALTH': 
                letter = 'H'; 
                symbol = '❤️'; 
                color = '#ff44ff'; 
                bgColor = '#441144'; 
                break;
        }
        
        // Dibujar círculo exterior brillante (halo)
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = powerUp.glowIntensity * 0.3;
        this.ctx.fill();
        
        // Dibujar círculo principal
        this.ctx.globalAlpha = powerUp.glowIntensity;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = bgColor;
        this.ctx.fill();
        
        // Dibujar borde del círculo
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Dibujar líneas decorativas (forma de diamante interior rotativo)
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = powerUp.glowIntensity * 0.8;
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(powerUp.rotation || 0);
        
        const innerRadius = radius * 0.6;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -innerRadius);
        this.ctx.lineTo(innerRadius, 0);
        this.ctx.lineTo(0, innerRadius);
        this.ctx.lineTo(-innerRadius, 0);
        this.ctx.closePath();
        this.ctx.stroke();
        
        this.ctx.restore();

        // Dibujar símbolo y letra identificadora
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 12px Courier New';
        this.ctx.textAlign = 'center';
        
        // Dibujar símbolo arriba
        this.ctx.font = 'bold 14px Courier New';
        this.ctx.fillText(symbol, centerX, centerY - 2);
        
        // Dibujar letra abajo
        this.ctx.font = 'bold 10px Courier New';
        this.ctx.fillText(letter, centerX, centerY + 8);
        
        this.ctx.restore();
        this.ctx.textAlign = 'left';
    }

    drawFloatingText(text) {
        this.ctx.save();
        this.ctx.globalAlpha = text.alpha;
        this.ctx.fillStyle = text.color;
        this.ctx.font = 'bold 20px Courier New';
        this.ctx.textAlign = 'center';
        
        // Efecto de sombra
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(text.message, text.x + 2, text.y + 2);
        
        // Texto principal
        this.ctx.fillStyle = text.color;
        this.ctx.fillText(text.message, text.x, text.y);
        
        this.ctx.restore();
    }

    drawLevelInfo() {
        if (!this.boss) return;

        if (!this.levelInfoPanel) return;
        const now = Date.now();
        const lines = [];
        lines.push(`<div>NIVEL: ${this.currentLevel}</div>`);
        lines.push(`<div>BOSS: ${this.boss.name}</div>`);
        
        if (this.player.rapidFire) {
            const timeLeft = Math.max(0, this.player.rapidFireEnd - now);
            lines.push(`<div>RAPID FIRE: ${Math.ceil(timeLeft/1000)}s</div>`);
        }
        if (this.player.doubleShot) {
            const timeLeft = Math.max(0, this.player.doubleShotEnd - now);
            lines.push(`<div>DOUBLE SHOT: ${Math.ceil(timeLeft/1000)}s</div>`);
        }
        if (this.player.hasShield) {
            lines.push(`<div>SHIELD: ACTIVE</div>`);
        }
        if (this.combo.streak > 0) {
            lines.push(`<div>COMBO: ${this.combo.streak}x (${this.combo.multiplier.toFixed(1)}x)</div>`);
        }
        if (this.player.isDashing) {
            const timeLeft = Math.max(0, this.player.dashEnd - now);
            lines.push(`<div>DASH: ${Math.ceil(timeLeft/1000)}s</div>`);
        } else if (now < this.player.dashCooldownEnd) {
            const cooldownLeft = Math.max(0, this.player.dashCooldownEnd - now);
            lines.push(`<div>DASH COOLDOWN: ${Math.ceil(cooldownLeft/1000)}s</div>`);
        } else {
            lines.push(`<div>DASH: READY</div>`);
        }
        this.renderDashPanelLines(lines);
    }

    // HUD del dash en panel externo (texto + barra)
    renderDashPanelLines(lines) {
        if (!this.levelInfoPanel) return;
        const now = Date.now();
        let ratio;
        let label;
        if (this.player.isDashing) {
            ratio = Math.max(0, (this.player.dashEnd - now) / 1500);
            label = 'DASH';
        } else if (now < this.player.dashCooldownEnd) {
            ratio = Math.max(0, (this.player.dashCooldownEnd - now) / 3500);
            label = 'COOLDOWN';
        } else {
            ratio = 0;
            label = 'READY';
        }

        const bar = `<div style="margin-top:6px; width:140px; height:8px; border:1px solid #fff; background:#333;">
            <div style="height:8px; width:${(1 - ratio) * 140}px; background:#66ccff"></div>
        </div>`;
        lines.push(`<div>DASH: ${label}</div>`);
        lines.push(bar);
        this.levelInfoPanel.innerHTML = lines.join('');
    }

    drawEnemy(enemy) {
        // Color base blanco
        this.ctx.fillStyle = '#fff';
        
        // Dibujar el enemigo
        this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Indicadores visuales por tipo
        this.ctx.font = '12px Courier New';
        this.ctx.textAlign = 'center';
        
        let indicator = '';
        switch(enemy.type) {
            case 'FAST':
                indicator = 'F';
                break;
            case 'TANK':
                indicator = 'T';
                // Mostrar barra de vida para tanks
                if (enemy.health < enemy.maxHealth) {
                    this.drawEnemyHealthBar(enemy);
                }
                break;
            case 'ZIGZAG':
                indicator = 'Z';
                break;
            case 'SHOOTER':
                indicator = 'S';
                break;
        }
        
        if (indicator) {
            this.ctx.fillStyle = '#000';
            this.ctx.fillText(indicator, enemy.x + enemy.width/2, enemy.y + enemy.height/2 + 4);
        }
        
        this.ctx.textAlign = 'left';
    }

    drawEnemyHealthBar(enemy) {
        const barWidth = enemy.width;
        const barHeight = 4;
        const barX = enemy.x;
        const barY = enemy.y - 8;

        // Fondo de la barra
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // Vida actual
        const healthPercent = enemy.health / enemy.maxHealth;
        const healthWidth = barWidth * healthPercent;
        
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(barX, barY, healthWidth, barHeight);
    }

    updateScoreDisplay() {
        const scoreElement = document.getElementById('current-score');
        if (scoreElement) {
            scoreElement.textContent = this.score;
        }
    }

    updateBossHealthDisplay() {
        // La vida del boss se muestra directamente en el canvas
        // Este método está aquí por consistencia, pero no es necesario
        // ya que la barra de vida se dibuja en drawBossHealthBar()
    }

    updateLivesDisplay() {
        const livesElement = document.getElementById('current-lives');
        if (livesElement) {
            livesElement.textContent = this.lives;
        }
    }

    gameOver() {
        this.stop();
        
        // Mostrar puntuación final
        const finalScoreElement = document.getElementById('final-score');
        if (finalScoreElement) {
            finalScoreElement.textContent = this.score;
        }

        // Finalizar tracking de la partida
        this.sessionStats.total_score = this.score;
        this.sessionStats.games_played = 1; // Esta partida
        
        // Guardar puntuación y estadísticas en el servidor
        this.saveScore();
        this.saveDetailedStats();

        // Mostrar pantalla de game over
        setTimeout(() => {
            document.getElementById('game-screen').classList.add('hidden');
            document.getElementById('gameover-screen').classList.remove('hidden');
        }, 500);
    }

    async saveScore() {
        try {
            const response = await fetch('/api/save-score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ score: this.score })
            });

            if (!response.ok) {
                console.error('Error al guardar puntuación');
            }
        } catch (error) {
            console.error('Error de conexión al guardar puntuación:', error);
        }
    }

    async saveDetailedStats() {
        try {
            // Calcular tiempo de juego en segundos
            const playtime = Math.floor((Date.now() - this.sessionStats.gameStartTime) / 1000);
            
            const statsToSave = {
                total_playtime: playtime,
                enemies_killed: this.sessionStats.enemies_killed,
                enemies_killed_normal: this.sessionStats.enemies_killed_normal,
                enemies_killed_fast: this.sessionStats.enemies_killed_fast,
                enemies_killed_tank: this.sessionStats.enemies_killed_tank,
                enemies_killed_zigzag: this.sessionStats.enemies_killed_zigzag,
                enemies_killed_shooter: this.sessionStats.enemies_killed_shooter,
                bosses_defeated: this.sessionStats.bosses_defeated,
                powerups_collected: this.sessionStats.powerups_collected,
                powerups_rapid_fire: this.sessionStats.powerups_rapid_fire,
                powerups_shield: this.sessionStats.powerups_shield,
                powerups_double_shot: this.sessionStats.powerups_double_shot,
                powerups_health: this.sessionStats.powerups_health,
                powerups_magnet: this.sessionStats.powerups_magnet,
                shots_fired: this.sessionStats.shots_fired,
                shots_hit: this.sessionStats.shots_hit,
                damage_taken: this.sessionStats.damage_taken,
                distance_traveled: Math.round(this.sessionStats.distance_traveled),
                max_combo: this.sessionStats.max_combo,
                games_played: 1,
                max_level_reached: this.sessionStats.max_level_reached,
                total_score: this.sessionStats.total_score,
                best_score: this.sessionStats.total_score, // Para comparar con el mejor
                survival_time_best: this.sessionStats.survival_time,
                lives_lost: this.sessionStats.lives_lost
            };

            const response = await fetch('/api/update-detailed-stats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(statsToSave)
            });

            if (!response.ok) {
                console.error('Error al guardar estadísticas detalladas');
            } else {
                console.log('Estadísticas detalladas guardadas exitosamente');
            }
        } catch (error) {
            console.error('Error de red al guardar estadísticas detalladas:', error);
        }
    }

    getScore() {
        return this.score;
    }
}

// Instancia global del juego
let game;
