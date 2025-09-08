import express, { json, urlencoded, static as static_ } from 'express';
import { join } from 'path';
import rateLimit from 'express-rate-limit';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import { initializeUsers } from './src/models/User.js';
import { logAction } from './src/utils/logger.js';

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

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'dashboard.html'));
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