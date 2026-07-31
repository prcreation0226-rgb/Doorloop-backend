import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const properties = await prisma.property.findMany();
  console.log('Properties count:', properties.length);
  console.log('Properties:', properties.map(p => ({ id: p.id, name: p.name, companyId: p.companyId })));

  const units = await prisma.unit.count();
  console.log('Units count:', units);

  const workOrders = await prisma.workOrder.count();
  console.log('WorkOrders count:', workOrders);

  const leases = await prisma.lease.count();
  console.log('Leases count:', leases);

  const companies = await prisma.company.findMany();
  console.log('Companies:', companies.map(c => ({ id: c.id, name: c.name })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
