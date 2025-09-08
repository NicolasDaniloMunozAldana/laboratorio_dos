# SIRA - Sistema de Información y Recursos Administrativos

## 📋 Descripción

Sistema completo de gestión de usuarios con autenticación JWT, recuperación de contraseñas, control de acceso por roles y sistema de logs encriptados.

## ✨ Características Principales

- **Autenticación JWT**: Tokens seguros con expiración de 24 horas
- **Control de Roles**: Administradores y usuarios normales con permisos diferenciados
- **Rate Limiting**: Protección contra ataques de fuerza bruta
- **Recuperación de Contraseña**: Sistema moderno con códigos de 6 dígitos enviados por email
- **Logs Encriptados**: Seguimiento completo de actividades con encriptación AES-256-CBC
- **Bloqueo Automático**: Protección tras 5 intentos fallidos de login (15 minutos)
- **Documentación Swagger**: API completamente documentada con OpenAPI 3.0

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 16+
- npm o yarn

### Instalación
```bash
npm install
```

### Configuración
1. Copiar `example.env` a `.env`
2. Configurar las variables de entorno:
```env
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password
JWT_SECRET=tu_jwt_secret_key
SECRET_KEY=tu_encryption_key
```

### Ejecutar
```bash
npm start
# o
npm run dev
```

El servidor se ejecutará en `http://localhost:3000`

## 📚 Documentación de la API

### Accesos Rápidos
- **Swagger UI**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Documentación**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **Especificación OpenAPI**: [http://localhost:3000/api-docs.json](http://localhost:3000/api-docs.json)
- **Info API**: [http://localhost:3000/api](http://localhost:3000/api)
- **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

### Usuarios de Demo
| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| admin | admin@sistema.com | admin123 | administrator |
| nicolas | nicolas@sistema.com | nicolas123 | user |
| steven | steven@sistema.com | steven123 | user |
| william | william@sistema.com | william123 | user |

## 🔐 Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil
- `POST /api/auth/logout` - Cerrar sesión

### Recuperación de Contraseña (Nuevo)
- `POST /api/auth/request-reset-code` - Solicitar código
- `POST /api/auth/verify-reset-code` - Verificar código
- `POST /api/auth/reset-password-with-code` - Cambiar contraseña

### Gestión de Usuarios
- `GET /api/users/{id}` - Obtener usuario
- `PUT /api/users/{id}` - Actualizar usuario
- `GET /api/users` - Listar usuarios (admin)
- `GET /api/users/admin/logs` - Logs del sistema (admin)
- `GET /api/users/admin/stats` - Estadísticas (admin)

## 🛡️ Seguridad

### Rate Limits
- **Login**: 10 intentos cada 15 minutos
- **Recuperación**: 3 solicitudes cada hora  
- **Verificación**: 10 intentos cada 15 minutos
- **General**: 100 requests cada 15 minutos

### Características de Seguridad
- Contraseñas hasheadas con bcrypt (10 rounds)
- Tokens JWT firmados con HS256
- Logs encriptados con AES-256-CBC
- Bloqueo automático tras intentos fallidos
- Validación robusta de datos de entrada

## 🔄 Flujo de Recuperación de Contraseña

1. **Solicitar código**: El usuario ingresa su username en `/forgot-password`
2. **Recibir email**: Se envía un código de 6 dígitos que expira en 15 minutos
3. **Verificar código**: El usuario ingresa el código en `/reset-password`
4. **Nueva contraseña**: Tras verificación exitosa, puede establecer nueva contraseña

## 📁 Estructura del Proyecto

```
├── src/
│   ├── config/
│   │   └── swagger.js          # Configuración de Swagger
│   ├── controllers/
│   │   ├── authController.js   # Lógica de autenticación
│   │   └── userController.js   # Gestión de usuarios
│   ├── middleware/
│   │   └── auth.js            # Middleware de autenticación
│   ├── models/
│   │   └── User.js            # Modelo de usuario
│   ├── routes/
│   │   ├── authRoutes.js      # Rutas de autenticación
│   │   └── userRoutes.js      # Rutas de usuarios
│   └── utils/
│       ├── encryption.js      # Utilidades de encriptación
│       └── logger.js          # Sistema de logs
├── public/
│   ├── styles/               # Estilos CSS
│   ├── login.html           # Página de login
│   ├── forgot-password.html # Solicitar recuperación
│   ├── reset-password.html  # Restablecer contraseña
│   ├── dashboard.html       # Panel de control
│   └── docs.html           # Documentación personalizada
├── logs/                    # Archivos de logs encriptados
└── index.js                # Servidor principal
```

## 🧪 Pruebas con Swagger

1. Ir a [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
2. Probar el endpoint `POST /api/auth/login` con credenciales de demo
3. Copiar el token JWT de la respuesta
4. Hacer clic en "Authorize" (🔒) en Swagger
5. Ingresar `Bearer {token}` en el campo de autorización
6. Probar endpoints protegidos

## 📧 Configuración de Email

Para que funcione la recuperación de contraseña:

1. Usar una cuenta Gmail
2. Generar una "App Password" en la configuración de seguridad
3. Configurar `EMAIL_USER` y `EMAIL_PASS` en el archivo `.env`

## 🏗️ Tecnologías Utilizadas

- **Backend**: Node.js + Express.js
- **Autenticación**: JWT (jsonwebtoken)
- **Seguridad**: bcryptjs, express-rate-limit
- **Email**: nodemailer
- **Encriptación**: crypto (AES-256-CBC)
- **Documentación**: swagger-jsdoc, swagger-ui-express
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)

## 📝 Licencia

MIT License
