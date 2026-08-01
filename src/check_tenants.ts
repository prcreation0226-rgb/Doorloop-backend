import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({});
  console.log(tenants.map(t => ({ id: t.id, companyId: t.companyId, firstName: t.firstName, lastName: t.lastName })));
}

main().finally(() => prisma.$disconnect());
