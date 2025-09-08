import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { encrypt, decrypt } from './encryption.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOGS_DIR = join(__dirname, '../../logs');
const LOG_FILE = join(LOGS_DIR, 'system.log');

export function ensureLogsDirectory() {
    if (!existsSync(LOGS_DIR)) {
        mkdirSync(LOGS_DIR, { recursive: true });
    }
}

export function logAction(level, user, action, additionalData = {}) {
    try {
        ensureLogsDirectory();
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            user: user,
            action: action,
            ip: additionalData.ip || 'unknown',
            userAgent: additionalData.userAgent || 'unknown',
            additionalData: additionalData
        };
        
        const logLine = JSON.stringify(logEntry) + '\n';
        
        const encryptedLog = encrypt(logLine);
        appendFileSync(LOG_FILE, encryptedLog + '\n');
        
        console.log(`[${logEntry.timestamp}] ${level.toUpperCase()}: ${user} - ${action}`);
        
    } catch (error) {
        console.error('Error writing to log:', error);
    }
}

export function readLogs(limit = 100) {
    try {
        if (!existsSync(LOG_FILE)) {
            return [];
        }
        
        const encryptedLines = readFileSync(LOG_FILE, 'utf8').split('\n').filter(line => line.trim());
        const logs = [];
        
        for (const encryptedLine of encryptedLines.slice(-limit)) {
            try {
                const decryptedLine = decrypt(encryptedLine);
                const logEntry = JSON.parse(decryptedLine);
                logs.push(logEntry);
            } catch (error) {
                console.error('Error decrypting log entry:', error);
            }
        }
        
        return logs;
    } catch (error) {
        console.error('Error reading logs:', error);
        return [];
    }
}

export function cleanOldLogs(daysToKeep = 30) {
    try {
        if (!existsSync(LOG_FILE)) {
            return;
        }
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const encryptedLines = readFileSync(LOG_FILE, 'utf8').split('\n').filter(line => line.trim());
        const filteredLines = [];
        
        for (const encryptedLine of encryptedLines) {
            try {
                const decryptedLine = decrypt(encryptedLine);
                const logEntry = JSON.parse(decryptedLine);
                const logDate = new Date(logEntry.timestamp);
                
                if (logDate >= cutoffDate) {
                    filteredLines.push(encryptedLine);
                }
            } catch (error) {
                filteredLines.push(encryptedLine);
            }
        }
        
        writeFileSync(LOG_FILE, filteredLines.join('\n') + '\n');
        logAction('INFO', 'system', `Cleaned logs older than ${daysToKeep} days`);
        
    } catch (error) {
        console.error('Error cleaning old logs:', error);
    }
}

