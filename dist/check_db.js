"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("./config/database"));
async function test() {
    try {
        console.log("Querying database for wordpress inquiries...");
        const data = await database_1.default.wordPressInquiry.findMany();
        console.log("SUCCESS! Row count:", data.length);
    }
    catch (err) {
        console.error("FAILED to query database:", err);
    }
    finally {
        await database_1.default.$disconnect();
    }
}
test();
