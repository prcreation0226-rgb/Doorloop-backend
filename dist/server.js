"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const database_1 = __importDefault(require("./config/database"));
// Connect and verify database connection
database_1.default.$connect()
    .then(() => {
    logger_1.logger.info('🔌 MySQL Database connected successfully via Prisma Client!');
})
    .catch((error) => {
    logger_1.logger.error(error, '❌ Failed to connect to the MySQL database:');
});
const server = app_1.default.listen(env_1.env.PORT, () => {
    logger_1.logger.info(`🚀 DoorLoop ERP Backend Server running on http://localhost:${env_1.env.PORT}${env_1.env.API_PREFIX}`);
    logger_1.logger.info(`Environment: ${env_1.env.NODE_ENV}`);
});
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        logger_1.logger.error(`❌ Port ${env_1.env.PORT} is already in use by another process.`);
        process.exit(1);
    }
    else {
        logger_1.logger.error(error, 'Server error:');
    }
});
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error(reason, 'Unhandled Rejection caught:');
});
process.on('uncaughtException', (error) => {
    logger_1.logger.error(error, 'Uncaught Exception caught:');
    process.exit(1);
});
