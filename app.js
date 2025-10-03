// Controlador principal de la aplicación
class AppController {
    constructor() {
        this.currentScreen = 'auth';
        this.initializeElements();
        this.bindEvents();
        this.initializeGame();
    }

    initializeElements() {
        // Pantallas
        this.screens = {
            auth: document.getElementById('auth-screen'),
            menu: document.getElementById('menu-screen'),
            game: document.getElementById('game-screen'),
            detailedStats: document.getElementById('detailed-stats-screen'),
            avatar: document.getElementById('avatar-screen'),
            leaderboard: document.getElementById('leaderboard-screen'),
            gameover: document.getElementById('gameover-screen'),
            pause: document.getElementById('pause-screen')
        };

        // Botones del menú principal
        this.playBtn = document.getElementById('play-btn');
        this.detailedStatsBtn = document.getElementById('detailed-stats-btn');
        this.avatarBtn = document.getElementById('avatar-btn');
        this.leaderboardBtn = document.getElementById('leaderboard-btn');

        // Botones de navegación
        this.backFromDetailedStatsBtn = document.getElementById('back-from-detailed-stats');
        this.backFromAvatarBtn = document.getElementById('back-from-avatar');
        this.backFromLeaderboardBtn = document.getElementById('back-from-leaderboard');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.backToMenuBtn = document.getElementById('back-to-menu-btn');

        // Botones de pausa
        this.pauseBtn = document.getElementById('pause-btn');
        this.resumeBtn = document.getElementById('resume-btn');
        this.quitGameBtn = document.getElementById('quit-game-btn');


        // Lista de ranking
        this.leaderboardList = document.getElementById('leaderboard-list');
    }

    bindEvents() {
        // Botones del menú principal
        this.playBtn.addEventListener('click', () => this.startGame());
        this.detailedStatsBtn.addEventListener('click', () => this.showDetailedStats());
        this.avatarBtn.addEventListener('click', () => this.showAvatarSelection());
        this.leaderboardBtn.addEventListener('click', () => this.showLeaderboard());

        // Botones de navegación
        this.backFromDetailedStatsBtn.addEventListener('click', () => this.showMenu());
        this.backFromAvatarBtn.addEventListener('click', () => this.showMenu());
        this.backFromLeaderboardBtn.addEventListener('click', () => this.showMenu());
        this.playAgainBtn.addEventListener('click', () => this.startGame());
        this.backToMenuBtn.addEventListener('click', () => this.showMenu());

        // Botones de pausa
        this.pauseBtn.addEventListener('click', () => this.pauseGame());
        this.resumeBtn.addEventListener('click', () => this.resumeGame());
        this.quitGameBtn.addEventListener('click', () => this.quitToMenu());

        // Tecla ESC para pausar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentScreen === 'game') {
                this.pauseGame();
            }
        });

        // Prevenir menú contextual en toda la página
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    initializeGame() {
        game = new Game();
    }

    hideAllScreens() {
        Object.values(this.screens).forEach(screen => {
            screen.classList.add('hidden');
        });
    }

    showScreen(screenName) {
        this.hideAllScreens();
        this.screens[screenName].classList.remove('hidden');
        this.currentScreen = screenName;
    }

    showMenu() {
        // Solo mostrar menú si el usuario está autenticado
        if (authSystem && authSystem.isUserAuthenticated()) {
            this.showScreen('menu');
        } else {
            this.showScreen('auth');
        }
    }

    startGame() {
        if (!authSystem || !authSystem.isUserAuthenticated()) {
            alert('Debes iniciar sesión para jugar');
            return;
        }

        this.showScreen('game');
        game.start();
    }

    pauseGame() {
        if (game && game.isRunning && !game.isPaused) {
            game.pause();
            this.showScreen('pause');
        }
    }

    resumeGame() {
        if (game && game.isRunning && game.isPaused) {
            game.pause(); // Toggle pause off
            this.showScreen('game');
        }
    }

    quitToMenu() {
        if (game) {
            game.stop();
        }
        this.showMenu();
    }


    async showDetailedStats() {
        if (!authSystem || !authSystem.isUserAuthenticated()) {
            return;
        }

        try {
            const response = await fetch('/api/detailed-stats');
            if (response.ok) {
                const stats = await response.json();
                this.renderDetailedStats(stats);
                this.showScreen('detailedStats');
            } else {
                alert('Error al cargar estadísticas detalladas');
            }
        } catch (error) {
            console.error('Error cargando estadísticas detalladas:', error);
            alert('Error de conexión');
        }
    }

    renderDetailedStats(stats) {
        // Combate
        document.getElementById('detailed-enemies-killed').textContent = stats.enemies_killed || 0;
        document.getElementById('detailed-enemies-normal').textContent = stats.enemies_killed_normal || 0;
        document.getElementById('detailed-enemies-fast').textContent = stats.enemies_killed_fast || 0;
        document.getElementById('detailed-enemies-tank').textContent = stats.enemies_killed_tank || 0;
        document.getElementById('detailed-enemies-zigzag').textContent = stats.enemies_killed_zigzag || 0;
        document.getElementById('detailed-enemies-shooter').textContent = stats.enemies_killed_shooter || 0;
        document.getElementById('detailed-bosses-defeated').textContent = stats.bosses_defeated || 0;
        
        // Calcular precisión
        const accuracy = stats.shots_fired > 0 ? 
            Math.round((stats.shots_hit / stats.shots_fired) * 100) : 0;
        document.getElementById('detailed-accuracy').textContent = accuracy + '%';
        
        document.getElementById('detailed-max-combo').textContent = stats.max_combo || 0;

        // Supervivencia
        const hours = Math.floor((stats.total_playtime || 0) / 3600);
        const minutes = Math.floor(((stats.total_playtime || 0) % 3600) / 60);
        const seconds = (stats.total_playtime || 0) % 60;
        const playtimeText = hours > 0 ? 
            `${hours}h ${minutes}m ${seconds}s` : 
            minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        document.getElementById('detailed-playtime').textContent = playtimeText;
        
        const bestSurvival = stats.survival_time_best || 0;
        const bestMinutes = Math.floor(bestSurvival / 60);
        const bestSeconds = bestSurvival % 60;
        const bestSurvivalText = bestMinutes > 0 ? `${bestMinutes}m ${bestSeconds}s` : `${bestSeconds}s`;
        document.getElementById('detailed-best-survival').textContent = bestSurvivalText;
        
        document.getElementById('detailed-distance').textContent = Math.round(stats.distance_traveled || 0) + ' píxeles';
        document.getElementById('detailed-damage-taken').textContent = stats.damage_taken || 0;
        document.getElementById('detailed-lives-lost').textContent = stats.lives_lost || 0;
        document.getElementById('detailed-max-level').textContent = stats.max_level_reached || 1;

        // Power-ups
        document.getElementById('detailed-powerups-total').textContent = stats.powerups_collected || 0;
        document.getElementById('detailed-powerups-rapid').textContent = stats.powerups_rapid_fire || 0;
        document.getElementById('detailed-powerups-shield').textContent = stats.powerups_shield || 0;
        document.getElementById('detailed-powerups-double').textContent = stats.powerups_double_shot || 0;
        document.getElementById('detailed-powerups-speed').textContent = stats.powerups_speed_boost || 0;
        document.getElementById('detailed-powerups-health').textContent = stats.powerups_health || 0;
        document.getElementById('detailed-powerups-magnet').textContent = stats.powerups_magnet || 0;

        // Progreso
        document.getElementById('detailed-games-played').textContent = stats.games_played || 0;
        document.getElementById('detailed-games-completed').textContent = stats.games_completed || 0;
        document.getElementById('detailed-total-score').textContent = stats.total_score || 0;
        document.getElementById('detailed-best-score').textContent = stats.best_score || 0;
    }

    async showLeaderboard() {
        if (!authSystem || !authSystem.isUserAuthenticated()) {
            return;
        }

        try {
            const response = await fetch('/api/leaderboard');
            if (response.ok) {
                const leaderboard = await response.json();
                this.renderLeaderboard(leaderboard);
                this.showScreen('leaderboard');
            } else {
                alert('Error al cargar ranking');
            }
        } catch (error) {
            console.error('Error cargando ranking:', error);
            alert('Error de conexión');
        }
    }

    renderLeaderboard(leaderboard) {
        this.leaderboardList.innerHTML = '';

        if (leaderboard.length === 0) {
            this.leaderboardList.innerHTML = '<div class="leaderboard-item">No hay puntuaciones registradas</div>';
            return;
        }

        leaderboard.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            
            const rank = index + 1;
            const medal = rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
            
            item.innerHTML = `
                <div class="leaderboard-rank">${rank}${medal}</div>
                <div class="leaderboard-name">${entry.username}</div>
                <div class="leaderboard-score">${entry.best_score}</div>
                <div class="leaderboard-games">${entry.total_games} partidas</div>
            `;
            
            this.leaderboardList.appendChild(item);
        });
    }

    async showAvatarSelection() {
        if (!authSystem || !authSystem.isUserAuthenticated()) {
            return;
        }

        try {
            const response = await fetch('/api/user-avatar');
            if (response.ok) {
                const avatarData = await response.json();
                this.renderAvatarSelection(avatarData);
                this.showScreen('avatar');
            } else {
                alert('Error al cargar avatares');
            }
        } catch (error) {
            console.error('Error cargando avatares:', error);
            alert('Error de conexión');
        }
    }

    renderAvatarSelection(avatarData) {
        // Mostrar puntuación total
        document.getElementById('user-total-score').textContent = avatarData.total_score || 0;
        
        // Obtener avatares desbloqueados
        const unlockedAvatars = avatarData.unlocked_avatars.split(',').map(Number);
        const currentAvatar = avatarData.current_avatar;
        
        // Configurar cada opción de avatar
        for (let i = 1; i <= 3; i++) {
            const avatarOption = document.querySelector(`[data-avatar="${i}"]`);
            const selectBtn = avatarOption.querySelector('.avatar-select-btn');
            
            if (unlockedAvatars.includes(i)) {
                // Avatar desbloqueado
                selectBtn.disabled = false;
                selectBtn.textContent = i === currentAvatar ? 'SELECCIONADO' : 'SELECCIONAR';
                selectBtn.className = 'avatar-select-btn' + (i === currentAvatar ? ' selected' : '');
                avatarOption.className = 'avatar-option' + (i === currentAvatar ? ' selected' : '');
            } else {
                // Avatar bloqueado
                selectBtn.disabled = true;
                selectBtn.textContent = '🔒 BLOQUEADO';
                selectBtn.className = 'avatar-select-btn';
                avatarOption.className = 'avatar-option';
            }
        }
        
        // Mostrar avatar actual
        this.updateCurrentAvatarDisplay(currentAvatar);
        
        // Configurar eventos de selección
        this.bindAvatarEvents();
    }

    updateCurrentAvatarDisplay(avatarId) {
        const avatarNames = { 1: 'Recluta', 2: 'Soldado', 3: 'Comandante' };
        const avatarIcons = { 1: '👤', 2: '⚔️', 3: '👑' };
        const avatarClasses = { 1: 'default-avatar', 2: 'elite-avatar', 3: 'commander-avatar' };
        
        document.getElementById('current-avatar-name').textContent = avatarNames[avatarId];
        
        const avatarDisplay = document.getElementById('current-avatar-display');
        avatarDisplay.innerHTML = `<div class="avatar-icon ${avatarClasses[avatarId]}">${avatarIcons[avatarId]}</div>`;
    }

    bindAvatarEvents() {
        // Remover eventos anteriores
        document.querySelectorAll('.avatar-select-btn').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        // Agregar nuevos eventos
        document.querySelectorAll('.avatar-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!btn.disabled && !btn.classList.contains('selected')) {
                    const avatarId = parseInt(btn.getAttribute('data-avatar'));
                    this.changeAvatar(avatarId);
                }
            });
        });
    }

    async changeAvatar(avatarId) {
        try {
            const response = await fetch('/api/change-avatar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ avatarId: avatarId })
            });

            if (response.ok) {
                // Actualizar la pantalla
                this.showAvatarSelection();
            } else {
                const error = await response.json();
                alert(error.error || 'Error al cambiar avatar');
            }
        } catch (error) {
            console.error('Error cambiando avatar:', error);
            alert('Error de conexión');
        }
    }

    // Método para manejar cambios de autenticación
    onAuthenticationChange(isAuthenticated) {
        if (isAuthenticated) {
            this.showMenu();
        } else {
            this.showScreen('auth');
            if (game) {
                game.stop();
            }
        }
    }
}

// Inicializar aplicación cuando se carga la página
let appController;

document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco para que authSystem se inicialice
    setTimeout(() => {
        appController = new AppController();
        
        // Configurar listener para cambios de autenticación
        const originalShowMenuScreen = authSystem.showMenuScreen;
        authSystem.showMenuScreen = function() {
            originalShowMenuScreen.call(this);
            if (appController) {
                appController.onAuthenticationChange(true);
            }
        };

        const originalShowAuthScreen = authSystem.showAuthScreen;
        authSystem.showAuthScreen = function() {
            originalShowAuthScreen.call(this);
            if (appController) {
                appController.onAuthenticationChange(false);
            }
        };
    }, 100);
});

// Manejar redimensionamiento de ventana
window.addEventListener('resize', () => {
    if (game && game.canvas) {
        game.initializeCanvas();
    }
});
