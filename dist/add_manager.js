"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('👤 Adding manager@apexpm.com with Property Manager role...');
    // Find the company
    const company = await prisma.company.findFirst();
    if (!company) {
        throw new Error('No company found in database.');
    }
    // Find the Property Manager role
    const role = await prisma.role.findFirst({
        where: { name: 'Property Manager' }
    });
    if (!role) {
        throw new Error('Property Manager role not found in database.');
    }
    const passwordHash = '$2b$12$KIX32Jc56M9s.Xg/7B9Aie1M5F1nBvKjD7zS3L0lYhXzQ/F5G7J1e'; // password: 'admin123'
    const user = await prisma.user.upsert({
        where: { email: 'manager@apexpm.com' },
        update: {
            roleId: role.id,
            companyId: company.id,
            status: 'Active'
        },
        create: {
            email: 'manager@apexpm.com',
            passwordHash,
            firstName: 'Jane',
            lastName: 'Manager',
            phone: '(512) 555-0101',
            roleId: role.id,
            status: 'Active',
            companyId: company.id,
        }
    });
    console.log(`✅ User manager@apexpm.com successfully created with role: ${role.name}`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
