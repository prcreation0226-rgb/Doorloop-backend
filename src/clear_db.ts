import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing all data except admin@apexpm.com...');

  // 1. Disable FK checks
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

  // 2. Delete all transaction/operational data
  await prisma.inspectionPhoto.deleteMany({});
  await prisma.inspectionItem.deleteMany({});
  await prisma.inspectionRoom.deleteMany({});
  await prisma.inspection.deleteMany({});
  await prisma.moveIn.deleteMany({});
  await prisma.inspectionTemplateItem.deleteMany({});
  await prisma.inspectionTemplateRoom.deleteMany({});
  await prisma.inspectionTemplate.deleteMany({});
  await prisma.rentPayment.deleteMany({});
  await prisma.lease.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.building.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.owner.deleteMany({});
  await prisma.serviceRequest.deleteMany({});
  await prisma.workOrder.deleteMany({});
  await prisma.screeningReport.deleteMany({});
  await prisma.violation.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.coAAccount.deleteMany({});
  await prisma.bankAccount.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.companyUser.deleteMany({});

  // 3. Delete all users EXCEPT admin@apexpm.com
  await prisma.user.deleteMany({
    where: {
      email: { not: 'admin@apexpm.com' }
    }
  });

  // 4. Enable FK checks
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');

  console.log('✅ Database successfully cleared! Only admin@apexpm.com user remains.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
