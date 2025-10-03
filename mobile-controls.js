// Sistema de controles móviles para STRIKE v5
class MobileControls {
    constructor(game) {
        this.game = game;
        this.isMobile = this.detectMobile();
        
        // Elementos de los controles
        this.movementBase = document.getElementById('movement-base');
        this.movementKnob = document.getElementById('movement-knob');
        this.shootBase = document.getElementById('shoot-base');
        this.shootKnob = document.getElementById('shoot-knob');
        this.dashButton = document.getElementById('dash-btn');
        
        // Estados de los controles
        this.movementActive = false;
        this.shootActive = false;
        this.movementVector = { x: 0, y: 0 };
        this.shootVector = { x: 0, y: 0 };
        
        // Posiciones iniciales
        this.movementCenter = { x: 0, y: 0 };
        this.shootCenter = { x: 0, y: 0 };
        
        // Configuración
        this.maxDistance = 50; // Distancia máxima de la palanca
        
        if (this.isMobile) {
            this.initializeControls();
        }
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    }
    
    initializeControls() {
        this.setupMovementJoystick();
        this.setupShootJoystick();
        this.setupDashButton();
        this.updateGameControls();
    }
    
    setupMovementJoystick() {
        if (!this.movementBase || !this.movementKnob) return;
        
        // Obtener posición inicial
        const rect = this.movementBase.getBoundingClientRect();
        this.movementCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        
        // Eventos táctiles
        this.movementBase.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.movementActive = true;
            this.handleMovementTouch(e.touches[0]);
        });
        
        this.movementBase.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.movementActive) {
                this.handleMovementTouch(e.touches[0]);
            }
        });
        
        this.movementBase.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.movementActive = false;
            this.resetMovementJoystick();
        });
        
        // Eventos de mouse (para testing en desktop)
        this.movementBase.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.movementActive = true;
            this.handleMovementMouse(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.movementActive) {
                this.handleMovementMouse(e);
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (this.movementActive) {
                this.movementActive = false;
                this.resetMovementJoystick();
            }
        });
    }
    
    setupShootJoystick() {
        if (!this.shootBase || !this.shootKnob) return;
        
        // Obtener posición inicial
        const rect = this.shootBase.getBoundingClientRect();
        this.shootCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        
        // Eventos táctiles
        this.shootBase.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.shootActive = true;
            this.handleShootTouch(e.touches[0]);
        });
        
        this.shootBase.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.shootActive) {
                this.handleShootTouch(e.touches[0]);
            }
        });
        
        this.shootBase.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.shootActive = false;
            this.resetShootJoystick();
        });
        
        // Eventos de mouse (para testing en desktop)
        this.shootBase.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.shootActive = true;
            this.handleShootMouse(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.shootActive) {
                this.handleShootMouse(e);
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (this.shootActive) {
                this.shootActive = false;
                this.resetShootJoystick();
            }
        });
    }
    
    setupDashButton() {
        if (!this.dashButton) return;
        
        this.dashButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.activateDash();
        });
        
        this.dashButton.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.activateDash();
        });
    }
    
    handleMovementTouch(touch) {
        const touchX = touch.clientX;
        const touchY = touch.clientY;
        
        const deltaX = touchX - this.movementCenter.x;
        const deltaY = touchY - this.movementCenter.y;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance <= this.maxDistance) {
            // Dentro del rango
            this.movementVector.x = deltaX / this.maxDistance;
            this.movementVector.y = deltaY / this.maxDistance;
            
            // Mover la palanca visualmente
            this.movementKnob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        } else {
            // Fuera del rango, limitar
            const angle = Math.atan2(deltaY, deltaX);
            const limitedX = Math.cos(angle) * this.maxDistance;
            const limitedY = Math.sin(angle) * this.maxDistance;
            
            this.movementVector.x = limitedX / this.maxDistance;
            this.movementVector.y = limitedY / this.maxDistance;
            
            this.movementKnob.style.transform = `translate(${limitedX}px, ${limitedY}px)`;
        }
        
        this.updateGameControls();
    }
    
    handleMovementMouse(e) {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        const deltaX = mouseX - this.movementCenter.x;
        const deltaY = mouseY - this.movementCenter.y;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance <= this.maxDistance) {
            this.movementVector.x = deltaX / this.maxDistance;
            this.movementVector.y = deltaY / this.maxDistance;
            
            this.movementKnob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        } else {
            const angle = Math.atan2(deltaY, deltaX);
            const limitedX = Math.cos(angle) * this.maxDistance;
            const limitedY = Math.sin(angle) * this.maxDistance;
            
            this.movementVector.x = limitedX / this.maxDistance;
            this.movementVector.y = limitedY / this.maxDistance;
            
            this.movementKnob.style.transform = `translate(${limitedX}px, ${limitedY}px)`;
        }
        
        this.updateGameControls();
    }
    
    handleShootTouch(touch) {
        const touchX = touch.clientX;
        const touchY = touch.clientY;
        
        const deltaX = touchX - this.shootCenter.x;
        const deltaY = touchY - this.shootCenter.y;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance <= this.maxDistance) {
            this.shootVector.x = deltaX / this.maxDistance;
            this.shootVector.y = deltaY / this.maxDistance;
            
            this.shootKnob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        } else {
            const angle = Math.atan2(deltaY, deltaX);
            const limitedX = Math.cos(angle) * this.maxDistance;
            const limitedY = Math.sin(angle) * this.maxDistance;
            
            this.shootVector.x = limitedX / this.maxDistance;
            this.shootVector.y = limitedY / this.maxDistance;
            
            this.shootKnob.style.transform = `translate(${limitedX}px, ${limitedY}px)`;
        }
        
        this.updateGameControls();
    }
    
    handleShootMouse(e) {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        const deltaX = mouseX - this.shootCenter.x;
        const deltaY = mouseY - this.shootCenter.y;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance <= this.maxDistance) {
            this.shootVector.x = deltaX / this.maxDistance;
            this.shootVector.y = deltaY / this.maxDistance;
            
            this.shootKnob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        } else {
            const angle = Math.atan2(deltaY, deltaX);
            const limitedX = Math.cos(angle) * this.maxDistance;
            const limitedY = Math.sin(angle) * this.maxDistance;
            
            this.shootVector.x = limitedX / this.maxDistance;
            this.shootVector.y = limitedY / this.maxDistance;
            
            this.shootKnob.style.transform = `translate(${limitedX}px, ${limitedY}px)`;
        }
        
        this.updateGameControls();
    }
    
    resetMovementJoystick() {
        this.movementVector.x = 0;
        this.movementVector.y = 0;
        this.movementKnob.style.transform = 'translate(0px, 0px)';
        this.updateGameControls();
    }
    
    resetShootJoystick() {
        this.shootVector.x = 0;
        this.shootVector.y = 0;
        this.shootKnob.style.transform = 'translate(0px, 0px)';
        this.updateGameControls();
    }
    
    activateDash() {
        if (this.game && this.game.activateDash) {
            this.game.activateDash();
        }
    }
    
    updateGameControls() {
        if (!this.game) return;
        
        // Actualizar movimiento del jugador
        if (this.movementVector.x !== 0 || this.movementVector.y !== 0) {
            // Simular teclas WASD basado en el vector de movimiento
            const threshold = 0.3; // Sensibilidad mínima
            
            if (this.movementVector.y < -threshold) {
                this.game.keys['w'] = true;
                this.game.keys['arrowup'] = true;
            } else {
                this.game.keys['w'] = false;
                this.game.keys['arrowup'] = false;
            }
            
            if (this.movementVector.y > threshold) {
                this.game.keys['s'] = true;
                this.game.keys['arrowdown'] = true;
            } else {
                this.game.keys['s'] = false;
                this.game.keys['arrowdown'] = false;
            }
            
            if (this.movementVector.x < -threshold) {
                this.game.keys['a'] = true;
                this.game.keys['arrowleft'] = true;
            } else {
                this.game.keys['a'] = false;
                this.game.keys['arrowleft'] = false;
            }
            
            if (this.movementVector.x > threshold) {
                this.game.keys['d'] = true;
                this.game.keys['arrowright'] = true;
            } else {
                this.game.keys['d'] = false;
                this.game.keys['arrowright'] = false;
            }
        } else {
            // Resetear todas las teclas de movimiento
            this.game.keys['w'] = false;
            this.game.keys['s'] = false;
            this.game.keys['a'] = false;
            this.game.keys['d'] = false;
            this.game.keys['arrowup'] = false;
            this.game.keys['arrowdown'] = false;
            this.game.keys['arrowleft'] = false;
            this.game.keys['arrowright'] = false;
        }
        
        // Actualizar mouse para disparo
        if (this.shootVector.x !== 0 || this.shootVector.y !== 0) {
            // Calcular posición del mouse basada en el vector de disparo
            const canvas = document.getElementById('game-canvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                // Aplicar el vector de disparo al mouse
                const mouseX = centerX + (this.shootVector.x * 200); // 200px de rango
                const mouseY = centerY + (this.shootVector.y * 200);
                
                this.game.mouse.x = mouseX - rect.left;
                this.game.mouse.y = mouseY - rect.top;
                
                // Activar disparo automático
                this.game.mouse.isLeftPressed = true;
            }
        } else {
            // Desactivar disparo
            this.game.mouse.isLeftPressed = false;
        }
    }
    
    // Método para actualizar las posiciones de los controles cuando cambia el tamaño de pantalla
    updatePositions() {
        if (this.movementBase) {
            const rect = this.movementBase.getBoundingClientRect();
            this.movementCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }
        
        if (this.shootBase) {
            const rect = this.shootBase.getBoundingClientRect();
            this.shootCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }
    }
}

// Inicializar controles móviles cuando se carga la página
let mobileControls;
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que el juego se inicialice
    setTimeout(() => {
        if (typeof game !== 'undefined') {
            mobileControls = new MobileControls(game);
        }
    }, 1000);
});

// Actualizar posiciones cuando cambia el tamaño de ventana
window.addEventListener('resize', () => {
    if (mobileControls) {
        mobileControls.updatePositions();
    }
});
