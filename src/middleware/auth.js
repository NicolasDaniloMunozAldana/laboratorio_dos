import { verify, sign } from 'jsonwebtoken';
import { logAction } from '../utils/logger';
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '24h';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        logAction('WARN', 'anonymous', 'Access attempt without token', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path
        });
        return res.status(401).json({ message: 'Access token required' });
    }

    verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            logAction('WARN', 'anonymous', 'Access attempt with invalid token', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                error: err.message
            });
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        req.user = user;
        next();
    });
}

// Middleware para verificar roles específicos
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            logAction('WARN', req.user.username, `Access denied - insufficient privileges`, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                requiredRoles: roles,
                userRole: req.user.role,
                path: req.path
            });
            return res.status(403).json({
                message: 'Insufficient privileges',
                required: roles,
                current: req.user.role
            });
        }

        next();
    };
}

function requireAdmin(req, res, next) {
    return requireRole(['administrator'])(req, res, next);
}

function generateToken(user) {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
    };

    return sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
    try {
        return verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

export default {
    authenticateToken,
    requireRole,
    requireAdmin,
    generateToken,
    verifyToken,
    JWT_SECRET,
    JWT_EXPIRES_IN
};
