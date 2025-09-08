import { getUsers, findUser, updateUser } from '../models/User.js';
import { logAction, readLogs } from '../utils/logger.js';

export function getAllUsers(req, res) {
    try {
        const users = getUsers();

        const sanitizedUsers = users.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isBlocked: user.isBlocked,
            createdAt: user.createdAt
        }));

        logAction('INFO', req.user.username, 'Retrieved all users list', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            count: sanitizedUsers.length
        });

        res.json({
            message: 'Users retrieved successfully',
            users: sanitizedUsers
        });

    } catch (error) {
        logAction('ERROR', req.user.username, `Get all users error: ${error.message}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(500).json({ message: 'Internal server error' });
    }
}

export function getUserById(req, res) {
    try {
        const { id } = req.params;
        const userId = parseInt(id);

        if (req.user.role !== 'administrator' && req.user.id !== userId) {
            logAction('WARN', req.user.username, `Attempted to access user ${id} without permission`, {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(403).json({
                message: 'You can only access your own information'
            });
        }

        const users = getUsers();
        const user = users.find(u => u.id === userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const sanitizedUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isBlocked: user.isBlocked,
            createdAt: user.createdAt
        };

        logAction('INFO', req.user.username, `Retrieved user information for ID ${id}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            message: 'User retrieved successfully',
            user: sanitizedUser
        });

    } catch (error) {
        logAction('ERROR', req.user.username, `Get user by ID error: ${error.message}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(500).json({ message: 'Internal server error' });
    }
}

export async function updateUserProfile(req, res) {
    try {
        const { id } = req.params;
        const userId = parseInt(id);
        const { username, email, password } = req.body;

        if (req.user.role !== 'administrator' && req.user.id !== userId) {
            logAction('WARN', req.user.username, `Attempted to update user ${id} without permission`, {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            return res.status(403).json({
                message: 'You can only update your own information'
            });
        }

        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    message: 'Password must be at least 6 characters long'
                });
            }
            updateData.password = password;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                message: 'No update data provided'
            });
        }

        const updatedUser = await updateUser(userId, updateData);

        const sanitizedUser = {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
            isBlocked: updatedUser.isBlocked,
            createdAt: updatedUser.createdAt
        };

        logAction('INFO', req.user.username, `Updated user information for ID ${id}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            updatedFields: Object.keys(updateData)
        });

        res.json({
            message: 'User updated successfully',
            user: sanitizedUser
        });

    } catch (error) {
        logAction('ERROR', req.user.username, `Update user error: ${error.message}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(500).json({ message: 'Internal server error' });
    }
}

export function getSystemLogs(req, res) {
    try {
        const { limit = 50 } = req.query;
        const limitNumber = parseInt(limit);

        const logs = readLogs(limitNumber);

        logAction('INFO', req.user.username, `Retrieved system logs`, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            limit: limitNumber,
            count: logs.length
        });

        res.json({
            message: 'Logs retrieved successfully',
            logs: logs,
            count: logs.length
        });

    } catch (error) {
        logAction('ERROR', req.user.username, `Get system logs error: ${error.message}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(500).json({ message: 'Internal server error' });
    }
}

export function getSystemStats(req, res) {
    try {
        const users = getUsers();
        const logs = readLogs(1000);

        const stats = {
            totalUsers: users.length,
            usersByRole: users.reduce((acc, user) => {
                acc[user.role] = (acc[user.role] || 0) + 1;
                return acc;
            }, {}),
            blockedUsers: users.filter(user => user.isBlocked).length,
            recentActivity: {
                totalLogs: logs.length,
                logsByLevel: logs.reduce((acc, log) => {
                    acc[log.level] = (acc[log.level] || 0) + 1;
                    return acc;
                }, {}),
                recentLogins: logs.filter(log =>
                    log.action.includes('login') &&
                    log.level === 'INFO'
                ).length,
                failedLogins: logs.filter(log =>
                    log.action.includes('login') &&
                    log.level === 'WARN'
                ).length
            }
        };

        logAction('INFO', req.user.username, 'Retrieved system statistics', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            message: 'Statistics retrieved successfully',
            stats: stats
        });

    } catch (error) {
        logAction('ERROR', req.user.username, `Get system stats error: ${error.message}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(500).json({ message: 'Internal server error' });
    }
}
