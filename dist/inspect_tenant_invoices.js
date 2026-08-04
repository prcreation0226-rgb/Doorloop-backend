"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const tenant = await prisma.tenant.findFirst({
        where: { email: 'person2b@gmail.com' }
    });
    if (!tenant) {
        console.log('Tenant not found');
        return;
    }
    const invoices = await prisma.invoice.findMany({
        where: { tenantId: tenant.id }
    });
    const payments = await prisma.rentPayment.findMany({
        where: { tenantId: tenant.id }
    });
    console.log('Tenant:', tenant.firstName, tenant.lastName);
    console.log('Invoices:', invoices);
    console.log('Payments:', payments);
}
main().finally(() => prisma.$disconnect());
