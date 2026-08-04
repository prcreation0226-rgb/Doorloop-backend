"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const tenants = await prisma.tenant.findMany({});
    console.log(tenants.map(t => ({ id: t.id, companyId: t.companyId, firstName: t.firstName, lastName: t.lastName })));
}
main().finally(() => prisma.$disconnect());
