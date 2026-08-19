"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || 'wLandlord_sec_encrypt_key_32_chr'; // fallback if not loaded
// Validate key length
const getValidKey = () => {
    let key = ENCRYPTION_KEY;
    if (key.length !== 32) {
        console.warn(`INTEGRATION_ENCRYPTION_KEY is ${key.length} characters long instead of 32. Truncating or padding.`);
        key = key.padEnd(32, '!').slice(0, 32);
    }
    return Buffer.from(key, 'utf8');
};
/**
 * Encrypts raw text using AES-256-GCM
 */
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(12); // 12 bytes IV is standard for GCM
    const key = getValidKey();
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return {
        encryptedText: `${authTag}:${encrypted}`,
        iv: iv.toString('hex')
    };
}
/**
 * Decrypts encrypted text using AES-256-GCM and its IV
 */
function decrypt(encryptedTextWithTag, ivHex) {
    const [authTagHex, encryptedHex] = encryptedTextWithTag.split(':');
    if (!authTagHex || !encryptedHex) {
        throw new Error('Invalid encrypted text format.');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getValidKey();
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
