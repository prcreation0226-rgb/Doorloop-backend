"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const user = await prisma.user.findFirst({
        where: { email: 'companyb@gmail.com' }
    });
    if (!user) {
        console.log('User not found');
        return;
    }
    const assignments = await prisma.userAssignment.findMany({
        where: { userId: user.id }
    });
    console.log('User:', user);
    console.log('Assignments:', assignments);
}
main().finally(() => prisma.$disconnect());
