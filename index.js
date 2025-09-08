import express, { json, urlencoded, static as static_ } from 'express';
import { join } from 'path';
import rateLimit from 'express-rate-limit';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import { initializeUsers } from './src/models/User.js';
import { logAction } from './src/utils/logger.js';
import { specs, swaggerUi } from './src/config/swagger.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(json());
app.use(urlencoded({ extended: true }));

app.use(static_(join(__dirname, 'public')));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

initializeUsers();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: `
        .topbar-wrapper img { content: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNGE5MGUyIi8+Cjx0ZXh0IHg9IjUiIHk9IjIwIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCI+U0lSQTwvdGV4dD4KPHN2Zz4K'); width: 80px; }
        .topbar { background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%); }
        .swagger-ui .topbar .download-url-wrapper { display: none; }
    `,
    customSiteTitle: 'SIRA API Documentation',
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        showRequestHeaders: true,
        tryItOutEnabled: true
    }
}));

app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

app.get('/forgot-password', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'forgot-password.html'));
});

app.get('/reset-password', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'reset-password.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'register.html'));
});

app.use((err, req, res, next) => {
    logAction('ERROR', 'system', `Error: ${err.message}`);
    res.status(500).json({ message: 'Internal server error' });
});

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    logAction('INFO', 'system', `Server started on port ${PORT}`);
});

export default app;