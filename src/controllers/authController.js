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

