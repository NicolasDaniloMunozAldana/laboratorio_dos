/**
 * @swagger
 * components:
 *   responses:
 *     UnauthorizedError:
 *       description: Token de acceso faltante o inválido
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     ForbiddenError:
 *       description: Permisos insuficientes
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     ValidationError:
 *       description: Error de validación de datos
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidationError'
 *     RateLimitError:
 *       description: Demasiadas solicitudes
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: 'Too many requests from this IP, please try again later.'
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, register, requestPasswordReset, resetPassword, getProfile, logout, requestResetCode, verifyResetCode, resetPasswordWithCode } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Rate limiting específico para login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 intentos de login por IP cada 15 minutos
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting para registro
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5, // máximo 5 registros por IP cada hora
    message: 'Too many registration attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting para recuperación de contraseña
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // máximo 3 solicitudes de reset por IP cada hora
    message: 'Too many password reset requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting para verificación de códigos
const codeVerificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 intentos de verificación por IP cada 15 minutos
    message: 'Too many code verification attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión en el sistema
 *     description: |
 *       Autentica un usuario usando username/email y contraseña.
 *       
 *       **Características de seguridad:**
 *       - Rate limiting: máximo 10 intentos cada 15 minutos
 *       - Bloqueo automático tras 5 intentos fallidos (15 minutos)
 *       - Logs de todos los intentos de login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             admin:
 *               summary: Administrador
 *               value:
 *                 identifier: "admin"
 *                 password: "admin123"
 *             user:
 *               summary: Usuario normal
 *               value:
 *                 identifier: "nicolas"
 *                 password: "nicolas123"
 *             email:
 *               summary: Login con email
 *               value:
 *                 identifier: "admin@sistema.com"
 *                 password: "admin123"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid credentials. 4 attempts remaining."
 *                 remainingAttempts:
 *                   type: integer
 *                   example: 4
 *       423:
 *         description: Cuenta bloqueada temporalmente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BlockedAccountError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', loginLimiter, login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     description: |
 *       Crea una nueva cuenta de usuario en el sistema.
 *       
 *       **Validaciones:**
 *       - Username único
 *       - Email único y válido
 *       - Contraseña mínimo 6 caracteres con al menos una letra y un número
 *       - Rate limiting: máximo 5 registros por IP cada hora
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 1
 *                 example: "juanperez"
 *                 description: Nombre de usuario único
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "juan@correo.com"
 *                 description: Email único y válido
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "password123"
 *                 description: Contraseña con al menos una letra y un número
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuario registrado exitosamente"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 3
 *                     username:
 *                       type: string
 *                       example: "juanperez"
 *                     email:
 *                       type: string
 *                       example: "juan@correo.com"
 *                     role:
 *                       type: string
 *                       example: "user"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-08T10:30:00.000Z"
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     - "Nombre de usuario, email y contraseña son requeridos"
 *                     - "El formato del email no es válido"
 *                     - "La contraseña debe tener al menos 6 caracteres"
 *                     - "La contraseña debe contener al menos una letra y un número"
 *                     - "El nombre de usuario ya está en uso"
 *                     - "El email ya está registrado"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         description: Error interno del servidor
 */
router.post('/register', registerLimiter, register);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicitar restablecimiento de contraseña (método legacy)
 *     description: |
 *       Método legacy para solicitar restablecimiento por email.
 *       **Recomendado usar /request-reset-code en su lugar.**
 *     tags: [Password Recovery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@sistema.com"
 *     responses:
 *       200:
 *         description: Solicitud procesada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "If the email exists, a reset link has been sent."
 *                 resetToken:
 *                   type: string
 *                 resetUrl:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/forgot-password', passwordResetLimiter, requestPasswordReset);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Restablecer contraseña con token (método legacy)
 *     description: |
 *       Método legacy para restablecer contraseña usando token.
 *       **Recomendado usar /reset-password-with-code en su lugar.**
 *     tags: [Password Recovery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de restablecimiento recibido por email
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "newPassword123"
 *     responses:
 *       200:
 *         description: Contraseña restablecida exitosamente
 *       400:
 *         description: Token inválido o contraseña no válida
 *       500:
 *         description: Error interno del servidor
 */
router.post('/reset-password', resetPassword);

/**
 * @swagger
 * /api/auth/request-reset-code:
 *   post:
 *     summary: Solicitar código de recuperación de contraseña
 *     description: |
 *       Solicita un código de 6 dígitos para recuperar la contraseña.
 *       El código se envía por email y expira en 15 minutos.
 *       
 *       **Flujo de recuperación:**
 *       1. Llamar a este endpoint con el username
 *       2. Verificar el código con /verify-reset-code
 *       3. Establecer nueva contraseña con /reset-password-with-code
 *     tags: [Password Recovery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetCodeRequest'
 *     responses:
 *       200:
 *         description: Código enviado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Código de recuperación enviado exitosamente a tu email"
 *                 expiresIn:
 *                   type: integer
 *                   example: 15
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuario no encontrado"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         description: Error interno del servidor
 */
router.post('/request-reset-code', passwordResetLimiter, requestResetCode);

/**
 * @swagger
 * /api/auth/verify-reset-code:
 *   post:
 *     summary: Verificar código de recuperación
 *     description: |
 *       Verifica que el código de 6 dígitos sea válido y no haya expirado.
 *       Permite máximo 5 intentos de verificación por código.
 *     tags: [Password Recovery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyCodeRequest'
 *     responses:
 *       200:
 *         description: Código verificado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Código verificado correctamente"
 *                 verified:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Código inválido, expirado o no existe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Código incorrecto. Te quedan 3 intentos."
 *                 remainingAttempts:
 *                   type: integer
 *                   example: 3
 *       429:
 *         description: Demasiados intentos fallidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Demasiados intentos fallidos. Solicita un nuevo código."
 *       500:
 *         description: Error interno del servidor
 */
router.post('/verify-reset-code', codeVerificationLimiter, verifyResetCode);

/**
 * @swagger
 * /api/auth/reset-password-with-code:
 *   post:
 *     summary: Restablecer contraseña con código verificado
 *     description: |
 *       Establece una nueva contraseña usando un código previamente verificado.
 *       El código debe haber sido verificado con /verify-reset-code.
 *       
 *       **Validaciones de contraseña:**
 *       - Mínimo 6 caracteres
 *       - Debe contener al menos una letra
 *       - Debe contener al menos un número
 *     tags: [Password Recovery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Contraseña restablecida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Contraseña restablecida exitosamente"
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Datos inválidos, código incorrecto o contraseña débil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     - "La contraseña debe tener al menos 6 caracteres"
 *                     - "La contraseña debe contener al menos una letra y un número"
 *                     - "Código de recuperación inválido"
 *       500:
 *         description: Error interno del servidor
 */
router.post('/reset-password-with-code', resetPasswordWithCode);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     description: |
 *       Retorna la información del perfil del usuario actualmente autenticado.
 *       Requiere token JWT válido.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión del usuario
 *     description: |
 *       Registra el logout del usuario en los logs del sistema.
 *       Nota: En JWT stateless, el token seguirá siendo válido hasta su expiración.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Error interno del servidor
 */
router.post('/logout', authenticateToken, logout);

export default router;
