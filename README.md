# 🎮 STRIKE v5

Un juego de disparos 2D minimalista con sistema de usuarios, estadísticas detalladas y ranking global.

## ✨ Características

- **Juego completo**: 5 tipos de enemigos, 3 bosses, power-ups y sistema de combos
- **Sistema de usuarios**: Registro, login y autenticación segura
- **Estadísticas detalladas**: Tracking completo de 25+ métricas de juego
- **Sistema de avatares**: 3 avatares desbloqueables por progreso
- **Ranking global**: Top 10 mejores puntuaciones
- **Responsive**: Funciona en desktop y móviles
- **Seguridad**: Rate limiting, validación, headers de seguridad

## 🚀 Instalación Rápida

### Requisitos
- Node.js 16+ 
- npm o yarn

### Pasos
```bash
# 1. Clonar e instalar dependencias
git clone <repo-url>
cd game-l
npm install

# 2. Configurar variables de entorno
cp config.env.example .env
# Editar .env con tus configuraciones

# 3. Ejecutar en desarrollo
npm run dev

# 4. Abrir en navegador
# http://localhost:3000
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Servidor con nodemon
npm start           # Servidor de producción

# Testing
npm test            # Ejecutar tests
npm run test:watch  # Tests en modo watch

# Calidad de código
npm run lint        # Verificar código con ESLint
npm run lint:fix    # Corregir errores automáticamente
npm run format      # Formatear código con Prettier
npm run format:check # Verificar formato
```

## 🛡️ Seguridad Implementada

- **Helmet.js**: Headers de seguridad HTTP
- **Rate Limiting**: Protección contra spam y ataques
- **Validación**: Sanitización de todos los inputs
- **CORS**: Control de origen cruzado
- **Sesiones seguras**: Cookies httpOnly y SameSite
- **Logging**: Sistema de logs estructurado
- **Variables de entorno**: Configuración segura

## 📊 Monitoreo

### Health Checks
```bash
# Estado del servidor
curl http://localhost:3000/health

# Métricas del sistema
curl http://localhost:3000/metrics
```

### Logs
Los logs se guardan en `./logs/app.log` con formato JSON estructurado.

## 🗄️ Base de Datos

### Estructura
- **users**: Usuarios y autenticación
- **scores**: Puntuaciones de partidas
- **user_stats**: Estadísticas básicas
- **detailed_stats**: Estadísticas detalladas (25+ campos)
- **user_avatars**: Sistema de avatares

### Optimizaciones
- Índices en campos críticos
- Queries optimizadas
- Transacciones para operaciones complejas

## 🎯 Controles del Juego

- **WASD**: Movimiento
- **Mouse**: Apuntar
- **Click Izquierdo**: Disparo automático
- **Click Derecho**: Dash (inmunidad 1.5s)
- **ESC**: Pausa

## 🏆 Sistema de Progresión

### Enemigos (5 tipos)
- **Normal**: Básico, 10 puntos
- **Fast**: Rápido, 15 puntos
- **Tank**: 2 vidas, 25 puntos
- **Zigzag**: Movimiento especial, 20 puntos
- **Shooter**: Dispara al jugador, 30 puntos

### Bosses (3 + escalado)
- **Nivel 1**: Comandante Alfa
- **Nivel 2**: Destructor Beta
- **Nivel 3**: Aniquilador Gamma
- **Nivel 4+**: Overlord (escalado infinito)

### Power-ups (4 tipos)
- **Rapid Fire**: Disparo rápido 8s
- **Shield**: Absorbe un golpe
- **Double Shot**: Disparo doble 10s
- **Health**: Restaura una vida

### Avatares (3 desbloqueables)
- **Recluta** (👤): Por defecto
- **Soldado** (⚔️): 3,000 puntos
- **Comandante** (👑): 6,000 puntos

## 🚀 Deployment en Producción

### Variables de Entorno Requeridas
```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=tu-secreto-super-seguro
DB_PATH=./game.db
CORS_ORIGIN=https://tu-dominio.com
```

### Con Docker (Opcional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Con PM2
```bash
npm install -g pm2
pm2 start server.js --name "game-server"
pm2 startup
pm2 save
```

## 📈 Métricas y Performance

### Optimizaciones Implementadas
- **Compresión**: Gzip para assets estáticos
- **Cache**: Headers de cache para archivos estáticos
- **Índices DB**: Optimización de consultas
- **Rate Limiting**: Protección de recursos
- **Logging**: Monitoreo de performance

### Endpoints de Monitoreo
- `GET /health` - Estado del servidor
- `GET /metrics` - Métricas del sistema

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests con coverage
npm test -- --coverage

# Tests en modo watch
npm run test:watch
```

## 📝 Estructura del Proyecto

```
game-l/
├── public/           # Frontend (HTML, CSS, JS)
├── utils/           # Utilidades (validación, logging)
├── tests/           # Tests unitarios
├── logs/            # Archivos de log
├── config.js        # Configuración centralizada
├── server.js        # Servidor principal
└── package.json     # Dependencias y scripts
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Si encuentras algún problema o tienes preguntas:

1. Revisa los logs en `./logs/app.log`
2. Verifica la configuración en `.env`
3. Ejecuta `npm run lint` para verificar el código
4. Abre un issue en GitHub

---

**¡Disfruta jugando! 🎮**

