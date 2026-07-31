import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({});
  console.log('--- ROLES ---');
  console.log(roles.map(r => r.name));
}

main().finally(() => prisma.$disconnect());
