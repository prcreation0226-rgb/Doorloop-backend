"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.string().default('5000'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    API_PREFIX: zod_1.z.string().default('/api/v1'),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:5173'),
    DATABASE_URL: zod_1.z.string().default('postgresql://postgres:postgres@localhost:5432/doorloop_erp?schema=public'),
    JWT_ACCESS_SECRET: zod_1.z.string().default('doorloop_access_token_secret_key_2026_super_secure'),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default('7d'),
    JWT_REFRESH_SECRET: zod_1.z.string().default('doorloop_refresh_token_secret_key_2026_super_secure'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    BCRYPT_SALT_ROUNDS: zod_1.z.string().transform(Number).default('12'),
    CLOUDINARY_CLOUD_NAME: zod_1.z.string().optional().default(''),
    CLOUDINARY_API_KEY: zod_1.z.string().optional().default(''),
    CLOUDINARY_API_SECRET: zod_1.z.string().optional().default(''),
});
exports.env = envSchema.parse(process.env);
