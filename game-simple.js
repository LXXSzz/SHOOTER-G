// Sistema de juego simplificado para GitHub Pages
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.isPaused = false;
        this.score = 0;
        this.lives = 3;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 2000;
        this.invulnerabilityStart = 0;
        this.screenShake = { active: false, intensity: 0, duration: 0, startTime: 0 };
        this.lastShotTime = 0;
        this.shotCooldown = 1000;
        this.lastBossShotTime = 0;
        this.bossShotCooldown = 3000;
        this.currentLevel = 1;
        this.levelComplete = false;
        
        // Sistema de combos
        this.combo = {
            streak: 0,
            multiplier: 1,
            maxMultiplier: 5,
            streakTimer: 3000,
            lastKillTime: 0
        };

        // Sistema de garantía de powerups
        this.powerupGuarantee = {
            minPerLevel: 1,
            currentLevelCount: 0,
            lastSpawnTime: 0,
            spawnInterval: 30000,
            levelMultiplier: 1,
            baseProbability: 0.0001
        };
        
        // Configuración del juego
        this.config = {
            canvasWidth: 800,
            canvasHeight: 600,
            playerSpeed: 5,
            enemySpeed: 2,
            bulletSpeed: 8,
            enemySpawnRate: 0.02,
            enemySpeedIncrease: 0.001
        };

        // Entidades del juego
        this.player = null;
        this.boss = null;
        this.enemies = [];
        this.bullets = [];
        this.bossBullets = [];
        this.enemyBullets = [];
        this.particles = [];
        this.powerUps = [];
        this.floatingTexts = [];
        this.dashTrail = [];
        this.spawnTelegraphs = [];

        // Input del jugador
        this.keys = {};
        this.mouse = { x: 0, y: 0, isLeftPressed: false };

        this.initializeCanvas();
        this.bindEvents();
        this.ensureLevelInfoPanel();
    }

    initializeCanvas() {
        // Detectar si es móvil
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                        window.innerWidth <= 768;
        
        if (isMobile) {
            // En móviles, usar toda la pantalla
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.canvas.style.width = '100vw';
            this.canvas.style.height = '100vh';
            
            // Actualizar configuración para móviles
            this.config.canvasWidth = window.innerWidth;
            this.config.canvasHeight = window.innerHeight;
        } else {
            // En desktop, mantener el tamaño original
            const maxWidth = Math.min(window.innerWidth - 40, this.config.canvasWidth);
            const maxHeight = Math.min(window.innerHeight - 150, this.config.canvasHeight);
            
            const aspectRatio = this.config.canvasWidth / this.config.canvasHeight;
            
            if (maxWidth / maxHeight > aspectRatio) {
                this.canvas.width = maxHeight * aspectRatio;
                this.canvas.height = maxHeight;
            } else {
                this.canvas.width = maxWidth;
                this.canvas.height = maxWidth / aspectRatio;
            }
            
            this.canvas.style.width = this.canvas.width + 'px';
            this.canvas.style.height = this.canvas.height + 'px';
        }
        
        // Actualizar el tamaño del canvas en la configuración
        this.config.canvasWidth = this.canvas.width;
        this.config.canvasHeight = this.canvas.height;
    }

    bindEvents() {
        // Teclado
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === 'Escape') {
                this.togglePause();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Mouse
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouse.isLeftPressed = true;
            } else if (e.button === 2) {
                e.preventDefault();
                this.activateDash();
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.isLeftPressed = false;
            }
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Botones del menú
        document.getElementById('play-btn').addEventListener('click', () => {
            this.start();
        });

        document.getElementById('quit-game-btn').addEventListener('click', () => {
            this.stop();
            this.showMenu();
        });
        
        // Redimensionamiento de ventana
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    ensureLevelInfoPanel() {
        let levelInfoPanel = document.getElementById('level-info-panel');
        if (!levelInfoPanel) {
            levelInfoPanel = document.createElement('div');
            levelInfoPanel.id = 'level-info-panel';
            levelInfoPanel.innerHTML = `
                <div class="level-info">
                    <span>Nivel: <span id="current-level">1</span></span>
                    <span>Vidas: <span id="current-lives">3</span></span>
                </div>
            `;
            document.body.appendChild(levelInfoPanel);
        }
    }
    
    handleResize() {
        // Re-inicializar el canvas cuando cambia el tamaño de la ventana
        this.initializeCanvas();
        
        // Actualizar controles móviles si existen
        if (typeof mobileControls !== 'undefined' && mobileControls) {
            mobileControls.updatePositions();
        }
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.score = 0;
        this.lives = 3;
        this.currentLevel = 1;
        this.levelComplete = false;
        
        // Reset powerup system
        this.powerupGuarantee.currentLevelCount = 0;
        this.powerupGuarantee.lastSpawnTime = 0;
        this.powerupGuarantee.minPerLevel = 1;
        
        this.createPlayer();
        this.createBossForLevel(this.currentLevel);
        
        this.showGameScreen();
        this.gameLoop();
        
        console.log('STRIKE v5 iniciado');
    }

    stop() {
        this.isRunning = false;
        this.isPaused = false;
    }

    togglePause() {
        if (!this.isRunning) return;
        this.isPaused = !this.isPaused;
    }

    showGameScreen() {
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
    }

    showMenu() {
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('menu-screen').classList.remove('hidden');
    }

    createPlayer() {
        this.player = {
            x: this.config.canvasWidth / 2 - 15,
            y: this.config.canvasHeight - 50,
            width: 30,
            height: 30,
            speed: this.config.playerSpeed,
            isDashing: false,
            dashEnd: 0,
            dashCooldownEnd: 0,
            rapidFire: false,
            rapidFireEnd: 0,
            doubleShot: false,
            doubleShotEnd: 0,
            hasShield: false,
            magnet: false
        };
    }

    createBossForLevel(level) {
        const bossHealth = 3 + (level - 1) * 2;
        const bossSpeed = 1 + (level - 1) * 0.3;
        
        this.boss = {
            x: this.config.canvasWidth / 2 - 40,
            y: 50,
            width: 80,
            height: 60,
            speed: bossSpeed,
            direction: 1,
            health: bossHealth,
            maxHealth: bossHealth,
            isAlive: true
        };
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
        this.updatePlayer();
        this.updateEnemies();
        this.updateBoss();
        this.updateBullets();
        this.updateBossBullets();
        this.updateEnemyBullets();
        this.updatePowerUps();
        this.updateParticles();
        this.updateFloatingTexts();
        this.updateTelegraphs();
        this.updateInvulnerability();
        this.updateComboTimer();
        this.updateScreenShake();
        this.checkCollisions();
        this.spawnEnemies();
        this.spawnPowerUps();
        this.checkLevelComplete();
    }

    updatePlayer() {
        if (!this.player) return;
        
        // Movimiento
        if (this.keys['w'] || this.keys['arrowup']) {
            this.player.y = Math.max(0, this.player.y - this.player.speed);
        }
        if (this.keys['s'] || this.keys['arrowdown']) {
            this.player.y = Math.min(this.config.canvasHeight - this.player.height, this.player.y + this.player.speed);
        }
        if (this.keys['a'] || this.keys['arrowleft']) {
            this.player.x = Math.max(0, this.player.x - this.player.speed);
        }
        if (this.keys['d'] || this.keys['arrowright']) {
            this.player.x = Math.min(this.config.canvasWidth - this.player.width, this.player.x + this.player.speed);
        }
        
        // Disparo automático
        if (this.mouse.isLeftPressed) {
            this.shoot();
        }
        
        // Dash
        if (this.player.isDashing) {
            const currentTime = Date.now();
            if (currentTime >= this.player.dashEnd) {
                this.player.isDashing = false;
            }
        }
    }

    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Movimiento básico
            if (enemy.side === 'left') {
                enemy.x += enemy.speed;
            } else {
                enemy.x -= enemy.speed;
            }
            
            // Eliminar enemigos que salieron de pantalla
            if (enemy.x > this.config.canvasWidth + 50 || enemy.x < -50) {
                this.enemies.splice(i, 1);
            }
        }
    }

    updateBoss() {
        if (!this.boss || !this.boss.isAlive) return;

        // Mover boss de izquierda a derecha
        this.boss.x += this.boss.speed * this.boss.direction;

        // Cambiar dirección al llegar a los bordes
        if (this.boss.x <= 0) {
            this.boss.direction = 1;
            this.boss.x = 0;
        } else if (this.boss.x >= this.config.canvasWidth - this.boss.width) {
            this.boss.direction = -1;
            this.boss.x = this.config.canvasWidth - this.boss.width;
        }
        
        // Disparar del boss
        this.bossShoot();
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            
            // Eliminar balas que salieron de pantalla
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
            
            if (bullet.x < 0 || bullet.x > this.config.canvasWidth || 
                bullet.y < 0 || bullet.y > this.config.canvasHeight) {
                this.bossBullets.splice(i, 1);
            }
        }
    }

    updateEnemyBullets() {
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            
            if (bullet.x < 0 || bullet.x > this.config.canvasWidth || 
                bullet.y < 0 || bullet.y > this.config.canvasHeight) {
                this.enemyBullets.splice(i, 1);
            }
        }
    }

    updatePowerUps() {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            // Efectos visuales
            powerUp.pulsePhase += 0.1;
            powerUp.glowIntensity = 0.5 + Math.sin(powerUp.pulsePhase) * 0.5;
            powerUp.rotation = (powerUp.rotation || 0) + 0.02;
            
            // Los power-ups desaparecen después de 15 segundos
            if (Date.now() - powerUp.spawnTime > 15000) {
                this.powerUps.splice(i, 1);
            }
        }
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

    updateFloatingTexts() {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const text = this.floatingTexts[i];
            
            text.y -= text.speed;
            text.life--;
            text.alpha = text.life / text.maxLife;
            
            if (text.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

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

    updateScreenShake() {
        if (this.screenShake.active) {
            const currentTime = Date.now();
            if (currentTime - this.screenShake.startTime >= this.screenShake.duration) {
                this.screenShake.active = false;
            }
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
            return;
        }

        this.lastShotTime = currentTime;

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
                vx: vx * 0.8,
                vy: vy * 0.8,
                color: '#00e5ff'
            };
            this.bullets.push(bullet2);
        }
    }

    bossShoot() {
        if (!this.boss || !this.boss.isAlive) return;
        
        const currentTime = Date.now();
        if (currentTime - this.lastBossShotTime < this.bossShotCooldown) {
            return;
        }
        
        this.lastBossShotTime = currentTime;
        
        // Disparar hacia el jugador
        const bossCenterX = this.boss.x + this.boss.width / 2;
        const bossCenterY = this.boss.y + this.boss.height;
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        
        const dx = playerCenterX - bossCenterX;
        const dy = playerCenterY - bossCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;
        
        const vx = (dx / distance) * 3;
        const vy = (dy / distance) * 3;
        
        const bossBullet = {
            x: bossCenterX,
            y: bossCenterY,
            width: 8,
            height: 8,
            vx: vx,
            vy: vy,
            color: '#ff4d4d'
        };
        
        this.bossBullets.push(bossBullet);
    }

    spawnEnemies() {
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
                { type: "RAPID_FIRE", weight: 0.0025 },
                { type: "SHIELD", weight: 0.005 },
                { type: "DOUBLE_SHOT", weight: 0.0005 },
                { type: "HEALTH", weight: 0.00005 }
            ];
            
            const totalWeight = powerUpWeights.reduce((sum, item) => sum + item.weight, 0);
            let random = Math.random() * totalWeight;
            
            let type = "RAPID_FIRE";
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
            
            if (needsGuaranteedSpawn) {
                console.log(`Powerup garantizado spawn en nivel ${this.currentLevel} (${this.powerupGuarantee.currentLevelCount}/${this.powerupGuarantee.minPerLevel})`);
            }
        }
    }

    createRandomEnemy(side, baseSpeed) {
        const enemyTypes = ["NORMAL", "FAST", "TANK"];
        const weights = [60, 30, 10];
        
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
            
            default:
                return this.createRandomEnemy(side, baseSpeed);
        }
    }

    checkCollisions() {
        // Balas vs Enemigos
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                
                if (this.isColliding(bullet, enemy)) {
                    this.bullets.splice(i, 1);
                    enemy.health--;
                    
                    if (enemy.health <= 0) {
                        this.enemies.splice(j, 1);
                        this.score += enemy.points * this.combo.multiplier;
                        this.updateCombo();
                        this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                    }
                    break;
                }
            }
        }
        
        // Balas vs Boss
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            if (this.boss && this.boss.isAlive && this.isColliding(bullet, this.boss)) {
                this.bullets.splice(i, 1);
                this.boss.health--;
                this.createExplosion(bullet.x, bullet.y);
                
                if (this.boss.health <= 0) {
                    this.boss.isAlive = false;
                    this.score += 100 * this.combo.multiplier;
                    this.createBossExplosion();
                    this.checkLevelComplete();
                }
            }
        }
        
        // Jugador vs Power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            if (this.isColliding(this.player, powerUp)) {
                this.applyPowerUp(powerUp.type);
                this.powerUps.splice(i, 1);
                this.createExplosion(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2);
            }
        }

        // Jugador vs Enemigos
        for (let i = this.enemies.length - 1; i >= 0; i--) {
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
                this.createExplosion(bossBullet.x, bossBullet.y);
                this.bossBullets.splice(i, 1);
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
        if (this.player.hasShield) {
            this.player.hasShield = false;
            this.createExplosion(this.player.x + this.player.width/2, this.player.y + this.player.height/2);
            this.triggerScreenShake(3, 200);
        } else {
            this.lives--;
            this.isInvulnerable = true;
            this.invulnerabilityStart = Date.now();
            this.resetCombo();
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
                this.player.rapidFireEnd = currentTime + 8000;
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
                this.player.doubleShotEnd = currentTime + 10000;
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
        
        this.createFloatingText(playerCenterX, playerCenterY - 30, message, color);
        this.createPowerUpParticles(playerCenterX, playerCenterY, color);
    }

    createPowerUpParticles(x, y, color) {
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

    createFloatingText(x, y, message, color = '#fff') {
        const floatingText = {
            x: x,
            y: y,
            message: message,
            color: color,
            speed: 2,
            life: 60,
            maxLife: 60,
            alpha: 1,
            scale: 1
        };
        
        this.floatingTexts.push(floatingText);
    }

    updateCombo() {
        const currentTime = Date.now();
        this.combo.streak++;
        this.combo.lastKillTime = currentTime;
        
        this.combo.multiplier = Math.min(
            1 + Math.floor(this.combo.streak / 5) * 0.5,
            this.combo.maxMultiplier
        );
    }

    resetCombo() {
        this.combo.streak = 0;
        this.combo.multiplier = 1;
    }

    triggerScreenShake(intensity, duration) {
        this.screenShake.active = true;
        this.screenShake.intensity = intensity;
        this.screenShake.duration = duration;
        this.screenShake.startTime = Date.now();
    }

    activateDash() {
        const currentTime = Date.now();
        
        if (currentTime < this.player.dashCooldownEnd || this.player.isDashing) {
            return;
        }
        
        this.player.isDashing = true;
        this.player.dashEnd = currentTime + 1500;
        this.player.dashCooldownEnd = currentTime + 3500;
    }

    checkLevelComplete() {
        if (this.boss && !this.boss.isAlive && !this.levelComplete) {
            this.levelComplete = true;
            
            setTimeout(() => {
                this.nextLevel();
            }, 2000);
        }
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

    gameOver() {
        this.stop();
        
        // Guardar puntuación en localStorage
        this.saveScoreToLocalStorage();
        
        // Mostrar pantalla de game over
        setTimeout(() => {
            this.showGameOverScreen();
        }, 500);
    }

    saveScoreToLocalStorage() {
        const userData = localStorage.getItem('strike_v5_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                if (this.score > user.stats.bestScore) {
                    user.stats.bestScore = this.score;
                    user.stats.totalGames = (user.stats.totalGames || 0) + 1;
                    user.stats.totalScore = (user.stats.totalScore || 0) + this.score;
                    localStorage.setItem('strike_v5_user', JSON.stringify(user));
                    console.log('Nueva mejor puntuación guardada:', this.score);
                }
            } catch (error) {
                console.error('Error guardando puntuación:', error);
            }
        }
    }

    showGameOverScreen() {
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('gameover-screen').classList.remove('hidden');
        
        // Mostrar puntuación final
        const finalScoreElement = document.getElementById('final-score');
        if (finalScoreElement) {
            finalScoreElement.textContent = this.score;
        }
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

        // Dibujar jugador
        if (this.player) {
            this.drawPlayer();
        }

        // Dibujar enemigos
        for (const enemy of this.enemies) {
            this.drawEnemy(enemy);
        }

        // Dibujar boss
        if (this.boss && this.boss.isAlive) {
            this.drawBoss();
        }

        // Dibujar balas
        for (const bullet of this.bullets) {
            this.ctx.fillStyle = bullet.color || '#00e5ff';
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        }

        // Dibujar balas del boss
        for (const bossBullet of this.bossBullets) {
            this.ctx.fillStyle = bossBullet.color || '#ff4d4d';
            this.ctx.fillRect(bossBullet.x, bossBullet.y, bossBullet.width, bossBullet.height);
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

        // Dibujar información del nivel
        this.drawLevelInfo();

        // Restaurar contexto después del screen shake
        this.ctx.restore();
    }

    drawPlayer() {
        if (!this.player) return;
        
        // Efecto de invulnerabilidad
        if (this.isInvulnerable) {
            this.ctx.globalAlpha = 0.5;
        }
        
        // Efecto de dash
        if (this.player.isDashing) {
            this.ctx.globalAlpha = 0.7;
        }
        
        // Dibujar jugador
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Restaurar opacidad
        this.ctx.globalAlpha = 1;
    }

    drawEnemy(enemy) {
        this.ctx.fillStyle = enemy.color || '#fff';
        this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    }

    drawBoss() {
        if (!this.boss || !this.boss.isAlive) return;

        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(this.boss.x, this.boss.y, this.boss.width, this.boss.height);

        this.drawBossHealthBar();
    }

    drawBossHealthBar() {
        if (!this.boss || !this.boss.isAlive) return;

        const barWidth = this.boss.width;
        const barHeight = 6;
        const barX = this.boss.x;
        const barY = this.boss.y - 12;

        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);

        const healthPercent = this.boss.health / this.boss.maxHealth;
        const healthWidth = barWidth * healthPercent;
        
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(barX, barY, healthWidth, barHeight);
    }

    drawPowerUp(powerUp) {
        this.ctx.save();
        
        // Efecto de pulso
        this.ctx.globalAlpha = powerUp.glowIntensity || 1;
        
        // Rotación
        this.ctx.translate(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2);
        this.ctx.rotate(powerUp.rotation || 0);
        
        // Color según tipo
        let color = '#fff';
        switch(powerUp.type) {
            case 'RAPID_FIRE': color = '#ff4444'; break;
            case 'SHIELD': color = '#4444ff'; break;
            case 'DOUBLE_SHOT': color = '#44ff44'; break;
            case 'HEALTH': color = '#ff44ff'; break;
        }
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(-powerUp.width/2, -powerUp.height/2, powerUp.width, powerUp.height);
        
        this.ctx.restore();
    }

    drawFloatingText(text) {
        this.ctx.save();
        this.ctx.globalAlpha = text.alpha;
        this.ctx.fillStyle = text.color;
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text.message, text.x, text.y);
        this.ctx.restore();
    }

    drawLevelInfo() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Nivel: ${this.currentLevel}`, 10, 30);
        this.ctx.fillText(`Puntuación: ${this.score}`, 10, 60);
        this.ctx.fillText(`Vidas: ${this.lives}`, 10, 90);
        
        if (this.combo.streak > 0) {
            this.ctx.fillText(`Combo: ${this.combo.streak}x${this.combo.multiplier}`, 10, 120);
        }
    }
}

// Instancia global del juego
let game;
document.addEventListener('DOMContentLoaded', function() {
    game = new Game();
});
