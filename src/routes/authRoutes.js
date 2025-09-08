import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, requestPasswordReset, resetPassword, getProfile, logout } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rate limiting específico para login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 intentos de login por IP cada 15 minutos
    message: 'Too many login attempts, please try again later.',
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

// Rutas públicas
router.post('/login', loginLimiter, login);
router.post('/forgot-password', passwordResetLimiter, requestPasswordReset);
router.post('/reset-password', resetPassword);

// Rutas protegidas
router.get('/profile', authenticateToken, getProfile);
router.post('/logout', authenticateToken, logout);

export default router;
