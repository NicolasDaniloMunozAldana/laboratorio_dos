import { Router } from 'express';
import { getAllUsers, getUserById, updateUserProfile, getSystemLogs, getSystemStats } from '../controllers/userController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtener información de un usuario específico
 *     description: |
 *       Obtiene la información de un usuario por ID.
 *       
 *       **Permisos:**
 *       - Los usuarios normales solo pueden acceder a su propia información
 *       - Los administradores pueden acceder a cualquier usuario
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID numérico del usuario
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *     responses:
 *       200:
 *         description: Información del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User retrieved successfully"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Sin permisos para acceder a este usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "You can only access your own information"
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:id', getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Actualizar información de un usuario
 *     description: |
 *       Actualiza la información de un usuario específico.
 *       
 *       **Permisos:**
 *       - Los usuarios normales solo pueden actualizar su propia información
 *       - Los administradores pueden actualizar cualquier usuario
 *       
 *       **Campos actualizables:**
 *       - username: Nuevo nombre de usuario
 *       - email: Nuevo email
 *       - password: Nueva contraseña (opcional)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID numérico del usuario
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *           examples:
 *             updateUsername:
 *               summary: Actualizar solo username
 *               value:
 *                 username: "newUsername"
 *             updateEmail:
 *               summary: Actualizar solo email
 *               value:
 *                 email: "newemail@sistema.com"
 *             updatePassword:
 *               summary: Actualizar solo contraseña
 *               value:
 *                 password: "newSecurePassword123"
 *             updateAll:
 *               summary: Actualizar todo
 *               value:
 *                 username: "newUsername"
 *                 email: "newemail@sistema.com"
 *                 password: "newSecurePassword123"
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User updated successfully"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Datos de actualización inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     - "Password must be at least 6 characters long"
 *                     - "No update data provided"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Sin permisos para actualizar este usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "You can only update your own information"
 *       500:
 *         description: Error interno del servidor
 */
router.put('/:id', updateUserProfile);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtener lista de todos los usuarios (Solo Administradores)
 *     description: |
 *       Retorna una lista completa de todos los usuarios en el sistema.
 *       
 *       **Restricciones:**
 *       - Solo disponible para usuarios con rol 'administrator'
 *       - Información sensible como contraseñas no se incluye
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Users retrieved successfully"
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/', requireAdmin, getAllUsers);

/**
 * @swagger
 * /api/users/admin/logs:
 *   get:
 *     summary: Obtener logs del sistema (Solo Administradores)
 *     description: |
 *       Retorna los logs de actividad del sistema.
 *       Los logs están encriptados y solo son accesibles por administradores.
 *       
 *       **Información incluida en los logs:**
 *       - Intentos de login (exitosos y fallidos)
 *       - Cambios de contraseña
 *       - Accesos a recursos
 *       - Errores del sistema
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         description: Número máximo de logs a retornar
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 50
 *         example: 100
 *     responses:
 *       200:
 *         description: Logs obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logs retrieved successfully"
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LogEntry'
 *                 count:
 *                   type: integer
 *                   description: Número total de logs retornados
 *                   example: 50
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/admin/logs', requireAdmin, getSystemLogs);

/**
 * @swagger
 * /api/users/admin/stats:
 *   get:
 *     summary: Obtener estadísticas del sistema (Solo Administradores)
 *     description: |
 *       Retorna estadísticas completas del sistema incluyendo:
 *       - Total de usuarios por rol
 *       - Usuarios bloqueados
 *       - Actividad reciente (logins, errores, etc.)
 *       - Distribución de logs por nivel de severidad
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Statistics retrieved successfully"
 *                 stats:
 *                   $ref: '#/components/schemas/SystemStats'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/admin/stats', requireAdmin, getSystemStats);

export default router;
