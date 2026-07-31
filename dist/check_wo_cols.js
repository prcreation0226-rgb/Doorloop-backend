"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const result = await prisma.$queryRaw `
    SHOW COLUMNS FROM work_orders;
  `;
    console.log('WorkOrder column definition in DB:', result);
}
main().finally(() => prisma.$disconnect());
