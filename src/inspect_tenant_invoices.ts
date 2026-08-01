import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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
