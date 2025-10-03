// Sistema de autenticación simplificado para GitHub Pages
class AuthSystem {
    constructor() {
        this.isAuthenticated = false;
        this.username = null;
        this.initializeElements();
        this.bindEvents();
        this.checkAuthStatus();
    }

    initializeElements() {
        // Pantallas
        this.authScreen = document.getElementById('auth-screen');
        this.menuScreen = document.getElementById('menu-screen');
        
        // Formularios
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        
        // Inputs de login
        this.loginUsername = document.getElementById('login-username');
        this.loginPassword = document.getElementById('login-password');
        this.loginBtn = document.getElementById('login-btn');
        
        // Inputs de registro
        this.registerUsername = document.getElementById('register-username');
        this.registerPassword = document.getElementById('register-password');
        this.registerConfirm = document.getElementById('register-confirm');
        this.registerBtn = document.getElementById('register-btn');
        
        // Enlaces y mensajes
        this.showRegisterLink = document.getElementById('show-register');
        this.showLoginLink = document.getElementById('show-login');
        this.authMessage = document.getElementById('auth-message');
        
        // Usuario display
        this.usernameDisplay = document.getElementById('username-display');
        
        // Botón logout
        this.logoutBtn = document.getElementById('logout-btn');
    }

    bindEvents() {
        // Cambiar entre login y registro
        this.showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        this.showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Login
        this.loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Registro
        this.registerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Logout
        this.logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Enter en formularios
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        this.registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
    }

    showLoginForm() {
        this.loginForm.classList.remove('hidden');
        this.registerForm.classList.add('hidden');
        this.clearMessage();
    }

    showRegisterForm() {
        this.loginForm.classList.add('hidden');
        this.registerForm.classList.remove('hidden');
        this.clearMessage();
    }

    clearMessage() {
        this.authMessage.textContent = '';
        this.authMessage.className = 'message';
    }

    showMessage(message, type = 'error') {
        this.authMessage.textContent = message;
        this.authMessage.className = `message ${type}`;
    }

    // Verificar autenticación usando localStorage
    checkAuthStatus() {
        const savedUser = localStorage.getItem('strike_v5_user');
        if (savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                this.username = userData.username;
                this.isAuthenticated = true;
                this.showMenuScreen();
            } catch (error) {
                console.error('Error parsing user data:', error);
                localStorage.removeItem('strike_v5_user');
            }
        }
    }

    // Login simplificado
    async handleLogin() {
        const username = this.loginUsername.value.trim();
        const password = this.loginPassword.value.trim();

        if (!username || !password) {
            this.showMessage('Por favor, completa todos los campos');
            return;
        }

        // Verificar en localStorage
        const savedUser = localStorage.getItem('strike_v5_user');
        if (savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                if (userData.username === username && userData.password === password) {
                    this.username = username;
                    this.isAuthenticated = true;
                    this.showMessage('¡Bienvenido de vuelta!', 'success');
                    setTimeout(() => this.showMenuScreen(), 1000);
                    return;
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }

        this.showMessage('Usuario o contraseña incorrectos');
    }

    // Registro simplificado
    async handleRegister() {
        const username = this.registerUsername.value.trim();
        const password = this.registerPassword.value.trim();
        const confirmPassword = this.registerConfirm.value.trim();

        if (!username || !password || !confirmPassword) {
            this.showMessage('Por favor, completa todos los campos');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Las contraseñas no coinciden');
            return;
        }

        if (username.length < 3) {
            this.showMessage('El nombre de usuario debe tener al menos 3 caracteres');
            return;
        }

        if (password.length < 4) {
            this.showMessage('La contraseña debe tener al menos 4 caracteres');
            return;
        }

        // Verificar si el usuario ya existe
        const existingUser = localStorage.getItem('strike_v5_user');
        if (existingUser) {
            try {
                const userData = JSON.parse(existingUser);
                if (userData.username === username) {
                    this.showMessage('Este nombre de usuario ya existe');
                    return;
                }
            } catch (error) {
                console.error('Error parsing existing user data:', error);
            }
        }

        // Crear nuevo usuario
        const userData = {
            username: username,
            password: password,
            createdAt: new Date().toISOString(),
            stats: {
                bestScore: 0,
                totalGames: 0,
                totalScore: 0
            }
        };

        localStorage.setItem('strike_v5_user', JSON.stringify(userData));
        
        this.username = username;
        this.isAuthenticated = true;
        this.showMessage('¡Registro exitoso!', 'success');
        setTimeout(() => this.showMenuScreen(), 1000);
    }

    handleLogout() {
        this.isAuthenticated = false;
        this.username = null;
        this.showAuthScreen();
        this.clearForm();
    }

    showAuthScreen() {
        this.authScreen.classList.remove('hidden');
        this.menuScreen.classList.add('hidden');
    }

    showMenuScreen() {
        this.authScreen.classList.add('hidden');
        this.menuScreen.classList.remove('hidden');
        this.usernameDisplay.textContent = this.username;
    }

    clearForm() {
        this.loginUsername.value = '';
        this.loginPassword.value = '';
        this.registerUsername.value = '';
        this.registerPassword.value = '';
        this.registerConfirm.value = '';
        this.clearMessage();
    }

    // Métodos para compatibilidad con el juego
    getCurrentUser() {
        return this.isAuthenticated ? this.username : null;
    }

    isUserAuthenticated() {
        return this.isAuthenticated;
    }
}

// Inicializar sistema de autenticación
let authSystem;
document.addEventListener('DOMContentLoaded', function() {
    authSystem = new AuthSystem();
});
