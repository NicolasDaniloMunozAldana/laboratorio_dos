import { findUser, verifyPassword, addLoginAttempt, resetLoginAttempts, isUserBlocked, updateUser } from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { logAction } from '../utils/logger.js';
import { generateRandomToken } from '../utils/encryption.js';
import { createTransport } from 'nodemailer';
import 'dotenv/config';

const emailTransporter = createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const resetTokens = new Map();
const resetCodes = new Map();

// Función para generar código de 6 dígitos
function generateResetCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function login(req, res) {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                message: 'Username/email and password are required'
            });
        }

        const blockInfo = isUserBlocked(identifier);
        if (blockInfo && blockInfo.blocked) {
            logAction('WARN', identifier, 'Login attempt while blocked', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                blockedUntil: blockInfo.blockedUntil,
                remainingTime: blockInfo.remainingTime
            });

            return res.status(423).json({
                message: `Account temporarily blocked. Try again in ${blockInfo.remainingTime} minutes.`,
                blockedUntil: blockInfo.blockedUntil,
                remainingMinutes: blockInfo.remainingTime
            });
        }

        const user = findUser(identifier);
        if (!user) {
            addLoginAttempt(identifier);
            logAction('WARN', identifier, 'Login attempt with non-existent user', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isValidPassword = await verifyPassword(password, user.password);
        if (!isValidPassword) {
            const attemptInfo = addLoginAttempt(identifier);
            logAction('WARN', user.username, 'Failed login attempt - invalid password', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                attempts: attemptInfo.count
            });

            const remainingAttempts = 5 - attemptInfo.count;
            if (remainingAttempts <= 0) {
                return res.status(423).json({
                    message: 'Account blocked due to too many failed attempts. Try again in 15 minutes.',
                    blocked: true
                });
            }

            return res.status(401).json({
                message: `Invalid credentials. ${remainingAttempts} attempts remaining.`,
                remainingAttempts
            });
        }

        resetLoginAttempts(identifier);
        const token = generateToken(user);

        logAction('INFO', user.username, 'Successful login', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            role: user.role
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        logAction('ERROR', 'system', `Login error: ${error.message}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(500).json({ message: 'Internal server error' });
    }
}

export async function requestPasswordReset(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = findUser(email);
        if (!user) {
            logAction('WARN', email, 'Password reset requested for non-existent email', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.json({
                message: 'If the email exists, a reset link has been sent.'
            });
        }

        const resetToken = generateRandomToken();
        const resetExpires = new Date(Date.now() + 15 * 60 * 1000);

        resetTokens.set(resetToken, {
            userId: user.id,
            email: user.email,
            expires: resetExpires
        });


        const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
        const mailOptions = {
            from: 'munozaldananicolas@gmail.com',
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <h2>Password Reset Request</h2>
                <p>You requested a password reset for your account.</p>
                <p>Click the link below to reset your password:</p>
                <a href="${resetUrl}">Reset Password</a>
                <p>This link will expire in 15 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        };

        await emailTransporter.sendMail(mailOptions);

        logAction('INFO', user.username, 'Password reset requested', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            resetToken: resetToken
        });

        res.json({
            message: 'If the email exists, a reset link has been sent.',
            resetToken: resetToken,
            resetUrl: `http://localhost:3000/reset-password?token=${resetToken}`
        });

    } catch (error) {
        logAction('ERROR', 'system', `Password reset request error: ${error.message}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(500).json({ message: 'Internal server error' });
    }
}

export async function resetPassword(req, res) {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                message: 'Token and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters long'
            });
        }

        const resetData = resetTokens.get(token);
        if (!resetData) {
            logAction('WARN', 'anonymous', 'Invalid password reset token used', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                token: token.substring(0, 8) + '...'
            });
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        if (new Date() > resetData.expires) {
            resetTokens.delete(token);
            logAction('WARN', resetData.email, 'Expired password reset token used', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(400).json({ message: 'Reset token has expired' });
        }

        await updateUser(resetData.userId, { password: newPassword });

        resetTokens.delete(token);

        logAction('INFO', resetData.email, 'Password reset successful', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ message: 'Password reset successful' });

    } catch (error) {
        logAction('ERROR', 'system', `Password reset error: ${error.message}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(500).json({ message: 'Internal server error' });
    }
}

export function getProfile(req, res) {
    try {
        const user = req.user;

        logAction('INFO', user.username, 'Profile accessed', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        logAction('ERROR', 'system', `Get profile error: ${error.message}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(500).json({ message: 'Internal server error' });
    }
}

export async function requestResetCode(req, res) {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'El nombre de usuario es requerido' });
        }

        const user = findUser(username);
        if (!user) {
            logAction('WARN', username, 'Password reset requested for non-existent user', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(404).json({
                message: 'Usuario no encontrado'
            });
        }

        const resetCode = generateResetCode();
        const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        resetCodes.set(username, {
            code: resetCode,
            userId: user.id,
            email: user.email,
            expires: resetExpires,
            attempts: 0
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Código de Recuperación de Contraseña - SIRA',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4a90e2; text-align: center;">SIRA - Recuperación de Contraseña</h2>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h3>¡Hola ${user.username}!</h3>
                        <p>Has solicitado recuperar tu contraseña. Tu código de recuperación es:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="background: #4a90e2; color: white; font-size: 32px; font-weight: bold; 
                                        padding: 20px; border-radius: 10px; letter-spacing: 8px; display: inline-block;">
                                ${resetCode}
                            </div>
                        </div>
                        
                        <p><strong>Importante:</strong></p>
                        <ul>
                            <li>Este código expira en <strong>15 minutos</strong></li>
                            <li>Solo se puede usar una vez</li>
                            <li>Si no solicitaste este código, ignora este email</li>
                        </ul>
                        
                        <p>Ingresa este código en la página de recuperación para cambiar tu contraseña.</p>
                    </div>
                    
                    <p style="color: #666; font-size: 12px; text-align: center;">
                        Este es un mensaje automático, por favor no respondas a este email.
                    </p>
                </div>
            `
        };

        await emailTransporter.sendMail(mailOptions);

        logAction('INFO', user.username, 'Password reset code requested and sent', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            codeGenerated: true
        });

        res.json({
            message: 'Código de recuperación enviado exitosamente a tu email',
            expiresIn: 15
        });

    } catch (error) {
        logAction('ERROR', 'system', `Reset code request error: ${error.message}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(500).json({ message: 'Error interno del servidor' });
    }
}

export async function verifyResetCode(req, res) {
    try {
        const { username, code } = req.body;

        if (!username || !code) {
            return res.status(400).json({
                message: 'Nombre de usuario y código son requeridos'
            });
        }

        const resetData = resetCodes.get(username);
        if (!resetData) {
            logAction('WARN', username, 'Reset code verification attempt with no active code', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(400).json({ 
                message: 'No hay código activo para este usuario o el código ha expirado' 
            });
        }

        if (new Date() > resetData.expires) {
            resetCodes.delete(username);
            logAction('WARN', username, 'Expired reset code verification attempt', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(400).json({ message: 'El código de recuperación ha expirado' });
        }

        // Incrementar intentos
        resetData.attempts += 1;

        if (resetData.attempts > 5) {
            resetCodes.delete(username);
            logAction('WARN', username, 'Too many reset code verification attempts', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                attempts: resetData.attempts
            });
            return res.status(429).json({ 
                message: 'Demasiados intentos fallidos. Solicita un nuevo código.' 
            });
        }

        if (resetData.code !== code) {
            logAction('WARN', username, 'Invalid reset code verification attempt', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                attempts: resetData.attempts
            });
            
            const remainingAttempts = 5 - resetData.attempts;
            return res.status(400).json({ 
                message: `Código incorrecto. Te quedan ${remainingAttempts} intentos.`,
                remainingAttempts
            });
        }

        // Código verificado correctamente
        logAction('INFO', username, 'Reset code verified successfully', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ 
            message: 'Código verificado correctamente',
            verified: true 
        });

    } catch (error) {
        logAction('ERROR', 'system', `Reset code verification error: ${error.message}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(500).json({ message: 'Error interno del servidor' });
    }
}

export async function resetPasswordWithCode(req, res) {
    try {
        const { username, code, newPassword } = req.body;

        if (!username || !code || !newPassword) {
            return res.status(400).json({
                message: 'Nombre de usuario, código y nueva contraseña son requeridos'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        // Validar que la contraseña tenga al menos una letra y un número
        if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
            return res.status(400).json({
                message: 'La contraseña debe contener al menos una letra y un número'
            });
        }

        const resetData = resetCodes.get(username);
        if (!resetData) {
            logAction('WARN', username, 'Password reset attempt with no active code', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(400).json({ 
                message: 'No hay código activo para este usuario' 
            });
        }

        if (new Date() > resetData.expires) {
            resetCodes.delete(username);
            logAction('WARN', username, 'Password reset attempt with expired code', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(400).json({ message: 'El código de recuperación ha expirado' });
        }

        if (resetData.code !== code) {
            logAction('WARN', username, 'Password reset attempt with invalid code', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(400).json({ message: 'Código de recuperación inválido' });
        }

        // Actualizar la contraseña
        await updateUser(resetData.userId, { password: newPassword });

        // Limpiar el código usado
        resetCodes.delete(username);

        logAction('INFO', username, 'Password reset completed successfully', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ 
            message: 'Contraseña restablecida exitosamente',
            success: true 
        });

    } catch (error) {
        logAction('ERROR', 'system', `Password reset with code error: ${error.message}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(500).json({ message: 'Error interno del servidor' });
    }
}

export function logout(req, res) {
    try {
        const user = req.user;

        logAction('INFO', user.username, 'User logged out', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ message: 'Logged out successfully' });

    } catch (error) {
        logAction('ERROR', 'system', `Logout error: ${error.message}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(500).json({ message: 'Internal server error' });
    }
}

