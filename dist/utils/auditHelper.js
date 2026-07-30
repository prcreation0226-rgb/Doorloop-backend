"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValidUserId = getValidUserId;
const database_1 = __importDefault(require("../config/database"));
async function getValidUserId(userId, tx) {
    if (!userId)
        return null;
    const client = tx || database_1.default;
    try {
        const user = await client.user.findUnique({
            where: { id: userId },
        });
        return user ? user.id : null;
    }
    catch {
        return null;
    }
}
