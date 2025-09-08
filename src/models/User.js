const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('../utils/encryption');

const USERS_FILE = path.join(__dirname, '../../logs/users.json');
const LOGIN_ATTEMPTS_FILE = path.join(__dirname, '../../logs/login_attempts.json');

// Usuarios predefinidos con roles
const defaultUsers = [
    {
        id: 1,
        username: 'admin',
        email: 'admin@sistema.com',
        password: 'admin123',
        role: 'administrator',
        isBlocked: false,
        createdAt: new Date().toISOString()
    },
    {
        id: 2,
        username: 'nicolas',
        email: 'nicolas@sistema.com',
        password: 'nicolas123',
        role: 'user',
        isBlocked: false,
        createdAt: new Date().toISOString()
    },
    {
        id: 3,
        username: 'steven',
        email: 'steven@sistema.com',
        password: 'steven123',
        role: 'user',
        isBlocked: false,
        createdAt: new Date().toISOString()
    },
    {
        id: 4,
        username: 'william',
        email: 'william@sistema.com',
        password: 'william123',
        role: 'user',
        isBlocked: false,
        createdAt: new Date().toISOString()
    }
];

async function initializeUsers() {
    try {
        let users = [];
        
        if (fs.existsSync(USERS_FILE)) {
            const encryptedData = fs.readFileSync(USERS_FILE, 'utf8');
            const decryptedData = decrypt(encryptedData);
            users = JSON.parse(decryptedData);
        } else {
            for (let user of defaultUsers) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
            users = defaultUsers;
            await saveUsers(users);
        }

        if (!fs.existsSync(LOGIN_ATTEMPTS_FILE)) {
            const initialAttempts = {};
            const encryptedAttempts = encrypt(JSON.stringify(initialAttempts));
            fs.writeFileSync(LOGIN_ATTEMPTS_FILE, encryptedAttempts);
        }

        console.log('Users initialized successfully');
        return users;
    } catch (error) {
        console.error('Error initializing users:', error);
        throw error;
    }
}

async function saveUsers(users) {
    try {
        const encryptedData = encrypt(JSON.stringify(users, null, 2));
        fs.writeFileSync(USERS_FILE, encryptedData);
    } catch (error) {
        console.error('Error saving users:', error);
        throw error;
    }
}

function getUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            return [];
        }
        const encryptedData = fs.readFileSync(USERS_FILE, 'utf8');
        const decryptedData = decrypt(encryptedData);
        return JSON.parse(decryptedData);
    } catch (error) {
        console.error('Error reading users:', error);
        return [];
    }
}

function findUser(identifier) {
    const users = getUsers();
    return users.find(user => 
        user.username === identifier || user.email === identifier
    );
}

async function verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

function getLoginAttempts() {
    try {
        if (!fs.existsSync(LOGIN_ATTEMPTS_FILE)) {
            return {};
        }
        const encryptedData = fs.readFileSync(LOGIN_ATTEMPTS_FILE, 'utf8');
        const decryptedData = decrypt(encryptedData);
        return JSON.parse(decryptedData);
    } catch (error) {
        console.error('Error reading login attempts:', error);
        return {};
    }
}

function saveLoginAttempts(attempts) {
    try {
        const encryptedData = encrypt(JSON.stringify(attempts, null, 2));
        fs.writeFileSync(LOGIN_ATTEMPTS_FILE, encryptedData);
    } catch (error) {
        console.error('Error saving login attempts:', error);
        throw error;
    }
}

function addLoginAttempt(identifier) {
    const attempts = getLoginAttempts();
    const now = new Date();
    
    if (!attempts[identifier]) {
        attempts[identifier] = {
            count: 0,
            lastAttempt: null,
            blockedUntil: null
        };
    }
    
    attempts[identifier].count += 1;
    attempts[identifier].lastAttempt = now.toISOString();
    
    if (attempts[identifier].count >= 5) {
        const blockTime = new Date(now.getTime() + 15 * 60 * 1000);
        attempts[identifier].blockedUntil = blockTime.toISOString();
    }
    
    saveLoginAttempts(attempts);
    return attempts[identifier];
}

function resetLoginAttempts(identifier) {
    const attempts = getLoginAttempts();
    if (attempts[identifier]) {
        delete attempts[identifier];
        saveLoginAttempts(attempts);
    }
}

function isUserBlocked(identifier) {
    const attempts = getLoginAttempts();
    if (!attempts[identifier] || !attempts[identifier].blockedUntil) {
        return false;
    }
    
    const now = new Date();
    const blockedUntil = new Date(attempts[identifier].blockedUntil);
    
    if (now < blockedUntil) {
        return {
            blocked: true,
            blockedUntil: attempts[identifier].blockedUntil,
            remainingTime: Math.ceil((blockedUntil - now) / 1000 / 60)
        };
    } else {
        resetLoginAttempts(identifier);
        return false;
    }
}

async function updateUser(userId, updateData) {
    try {
        const users = getUsers();
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex === -1) {
            throw new Error('User not found');
        }
        
        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        }
        
        users[userIndex] = { ...users[userIndex], ...updateData };
        await saveUsers(users);
        
        return users[userIndex];
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
}

module.exports = {
    initializeUsers,
    getUsers,
    findUser,
    verifyPassword,
    addLoginAttempt,
    resetLoginAttempts,
    isUserBlocked,
    updateUser,
    saveUsers
};
