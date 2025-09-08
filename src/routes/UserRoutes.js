const express = require('express');
const { 
    getAllUsers, 
    getUserById, 
    updateUserProfile, 
    getSystemLogs, 
    getSystemStats 
} = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para usuarios normales y admin
router.get('/:id', getUserById);
router.put('/:id', updateUserProfile);

// Rutas solo para administradores
router.get('/', requireAdmin, getAllUsers);
router.get('/admin/logs', requireAdmin, getSystemLogs);
router.get('/admin/stats', requireAdmin, getSystemStats);

module.exports = router;
