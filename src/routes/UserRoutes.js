import { Router } from 'express';
import { getAllUsers, getUserById, updateUserProfile, getSystemLogs, getSystemStats } from '../controllers/userController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para usuarios normales y admin
router.get('/:id', getUserById);
router.put('/:id', updateUserProfile);

// Rutas solo para administradores
router.get('/', requireAdmin, getAllUsers);
router.get('/admin/logs', requireAdmin, getSystemLogs);
router.get('/admin/stats', requireAdmin, getSystemStats);

export default router;
