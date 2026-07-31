import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({});
  const properties = await prisma.property.findMany({});
  const leases = await prisma.lease.findMany({});
  
  console.log('--- DATABASE STATUS ---');
  console.log(`Users count: ${users.length}`);
  console.log('Users:', users.map(u => u.email));
  console.log(`Properties count: ${properties.length}`);
  console.log(`Leases count: ${leases.length}`);
}

main().finally(() => prisma.$disconnect());
