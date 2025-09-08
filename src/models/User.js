import { fileURLToPath } from 'url';
import { dirname, join } from 'path';


import { genSalt, hash, compare } from 'bcryptjs';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { encrypt, decrypt } from '../utils/encryption.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const USERS_FILE = join(__dirname, '../../logs/users.json');
const LOGIN_ATTEMPTS_FILE = join(__dirname, '../../logs/login_attempts.json');

export async function initializeUsers() {
    try {
        let users = [];
        
        if (existsSync(USERS_FILE)) {
            const encryptedData = readFileSync(USERS_FILE, 'utf8');
            const decryptedData = decrypt(encryptedData);
            users = JSON.parse(decryptedData);
        } else {
            for (let user of defaultUsers) {
                const salt = await genSalt(10);
                user.password = await hash(user.password, salt);
            }
            users = defaultUsers;
            await saveUsers(users);
        }

        if (!existsSync(LOGIN_ATTEMPTS_FILE)) {
            const initialAttempts = {};
            const encryptedAttempts = encrypt(JSON.stringify(initialAttempts));
            writeFileSync(LOGIN_ATTEMPTS_FILE, encryptedAttempts);
        }

        console.log('Users initialized successfully');
        return users;
    } catch (error) {
        console.error('Error initializing users:', error);
        throw error;
    }
}

export async function saveUsers(users) {
    try {
        const encryptedData = encrypt(JSON.stringify(users, null, 2));
        writeFileSync(USERS_FILE, encryptedData);
    } catch (error) {
        console.error('Error saving users:', error);
        throw error;
    }
}

export function getUsers() {
    try {
        if (!existsSync(USERS_FILE)) {
            return [];
        }
        const encryptedData = readFileSync(USERS_FILE, 'utf8');
        const decryptedData = decrypt(encryptedData);
        return JSON.parse(decryptedData);
    } catch (error) {
        console.error('Error reading users:', error);
        return [];
    }
}

export function findUser(identifier) {
    const users = getUsers();
    return users.find(user => 
        user.username === identifier || user.email === identifier
    );
}

export async function verifyPassword(password, hashedPassword) {
    return await compare(password, hashedPassword);
}

export function getLoginAttempts() {
    try {
        if (!existsSync(LOGIN_ATTEMPTS_FILE)) {
            return {};
        }
        const encryptedData = readFileSync(LOGIN_ATTEMPTS_FILE, 'utf8');
        const decryptedData = decrypt(encryptedData);
        return JSON.parse(decryptedData);
    } catch (error) {
        console.error('Error reading login attempts:', error);
        return {};
    }
}

export function saveLoginAttempts(attempts) {
    try {
        const encryptedData = encrypt(JSON.stringify(attempts, null, 2));
        writeFileSync(LOGIN_ATTEMPTS_FILE, encryptedData);
    } catch (error) {
        console.error('Error saving login attempts:', error);
        throw error;
    }
}

export function addLoginAttempt(identifier) {
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

export function resetLoginAttempts(identifier) {
    const attempts = getLoginAttempts();
    if (attempts[identifier]) {
        delete attempts[identifier];
        saveLoginAttempts(attempts);
    }
}

export function isUserBlocked(identifier) {
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

export async function updateUser(userId, updateData) {
    try {
        const users = getUsers();
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex === -1) {
            throw new Error('User not found');
        }
        
        if (updateData.password) {
            const salt = await genSalt(10);
            updateData.password = await hash(updateData.password, salt);
        }
        
        users[userIndex] = { ...users[userIndex], ...updateData };
        await saveUsers(users);
        
        return users[userIndex];
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
}


