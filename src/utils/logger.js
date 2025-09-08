const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('./encryption');

const LOGS_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOGS_DIR, 'system.log');

function ensureLogsDirectory() {
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
}

function logAction(level, user, action, additionalData = {}) {
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
        fs.appendFileSync(LOG_FILE, encryptedLog + '\n');
        
        console.log(`[${logEntry.timestamp}] ${level.toUpperCase()}: ${user} - ${action}`);
        
    } catch (error) {
        console.error('Error writing to log:', error);
    }
}

function readLogs(limit = 100) {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            return [];
        }
        
        const encryptedLines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(line => line.trim());
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

function cleanOldLogs(daysToKeep = 30) {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            return;
        }
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const encryptedLines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(line => line.trim());
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
        
        fs.writeFileSync(LOG_FILE, filteredLines.join('\n') + '\n');
        logAction('INFO', 'system', `Cleaned logs older than ${daysToKeep} days`);
        
    } catch (error) {
        console.error('Error cleaning old logs:', error);
    }
}

module.exports = {
    logAction,
    readLogs,
    cleanOldLogs
};
