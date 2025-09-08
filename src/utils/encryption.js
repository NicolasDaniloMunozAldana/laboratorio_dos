const crypto = require('crypto');

const SECRET_KEY = crypto
  .createHash('sha256')
  .update(String("megustantusojos")) 
  .digest();
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('Error encrypting data:', error);
        throw error;
    }
}

function decrypt(encryptedData) {
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted data format');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('Error decrypting data:', error);
        throw error;
    }
}

function generateSecureHash(data) {
    return crypto.createHash('sha256').update(data + SECRET_KEY).digest('hex');
}

function generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

module.exports = {
    encrypt,
    decrypt,
    generateSecureHash,
    generateRandomToken
};
