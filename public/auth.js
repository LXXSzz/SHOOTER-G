// Sistema de autenticación
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

        // Botones de formularios
        this.loginBtn.addEventListener('click', () => this.handleLogin());
        this.registerBtn.addEventListener('click', () => this.handleRegister());
        this.logoutBtn.addEventListener('click', () => this.handleLogout());

        // Enter key en inputs
        [this.loginUsername, this.loginPassword].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        });

        [this.registerUsername, this.registerPassword, this.registerConfirm].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleRegister();
            });
        });
    }

    showRegisterForm() {
        this.loginForm.classList.add('hidden');
        this.registerForm.classList.remove('hidden');
        this.clearMessage();
        this.clearInputs();
    }

    showLoginForm() {
        this.registerForm.classList.add('hidden');
        this.loginForm.classList.remove('hidden');
        this.clearMessage();
        this.clearInputs();
    }

    clearInputs() {
        this.loginUsername.value = '';
        this.loginPassword.value = '';
        this.registerUsername.value = '';
        this.registerPassword.value = '';
        this.registerConfirm.value = '';
    }

    clearMessage() {
        this.authMessage.textContent = '';
        this.authMessage.className = 'message';
    }

    showMessage(message, isError = false) {
        this.authMessage.textContent = message;
        this.authMessage.className = isError ? 'message error' : 'message success';
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/check-auth');
            const data = await response.json();
            
            if (data.authenticated) {
                this.isAuthenticated = true;
                this.username = data.username;
                this.showMenuScreen();
            } else {
                this.showAuthScreen();
            }
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            this.showAuthScreen();
        }
    }

    async handleLogin() {
        const username = this.loginUsername.value.trim();
        const password = this.loginPassword.value.trim();

        if (!username || !password) {
            this.showMessage('Por favor completa todos los campos', true);
            return;
        }

        this.loginBtn.disabled = true;
        this.loginBtn.textContent = 'ENTRANDO...';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.isAuthenticated = true;
                this.username = data.username;
                this.showMessage('¡Login exitoso!');
                setTimeout(() => this.showMenuScreen(), 1000);
            } else {
                this.showMessage(data.error || 'Error al iniciar sesión', true);
            }
        } catch (error) {
            this.showMessage('Error de conexión', true);
        } finally {
            this.loginBtn.disabled = false;
            this.loginBtn.textContent = 'ENTRAR';
        }
    }

    async handleRegister() {
        const username = this.registerUsername.value.trim();
        const password = this.registerPassword.value.trim();
        const confirmPassword = this.registerConfirm.value.trim();

        if (!username || !password || !confirmPassword) {
            this.showMessage('Por favor completa todos los campos', true);
            return;
        }

        if (username.length < 3) {
            this.showMessage('El usuario debe tener al menos 3 caracteres', true);
            return;
        }

        if (password.length < 4) {
            this.showMessage('La contraseña debe tener al menos 4 caracteres', true);
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Las contraseñas no coinciden', true);
            return;
        }

        this.registerBtn.disabled = true;
        this.registerBtn.textContent = 'REGISTRANDO...';

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('¡Usuario creado exitosamente! Ahora puedes iniciar sesión.');
                setTimeout(() => this.showLoginForm(), 2000);
            } else {
                this.showMessage(data.error || 'Error al crear usuario', true);
            }
        } catch (error) {
            this.showMessage('Error de conexión', true);
        } finally {
            this.registerBtn.disabled = false;
            this.registerBtn.textContent = 'REGISTRARSE';
        }
    }

    async handleLogout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            this.isAuthenticated = false;
            this.username = null;
            this.showAuthScreen();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    }

    showAuthScreen() {
        this.authScreen.classList.remove('hidden');
        this.menuScreen.classList.add('hidden');
        this.clearInputs();
        this.clearMessage();
        
        // Asegurar que se muestre el formulario de login por defecto
        this.showLoginForm();
    }

    showMenuScreen() {
        this.authScreen.classList.add('hidden');
        this.menuScreen.classList.remove('hidden');
        
        if (this.username) {
            this.usernameDisplay.textContent = this.username;
        }
    }

    // Método para que otros módulos verifiquen autenticación
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    getUsername() {
        return this.username;
    }
}

// Inicializar sistema de autenticación cuando se carga la página
let authSystem;
document.addEventListener('DOMContentLoaded', () => {
    authSystem = new AuthSystem();
});
