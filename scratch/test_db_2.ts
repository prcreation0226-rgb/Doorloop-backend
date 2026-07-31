import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const reports = await prisma.screeningReport.findMany({
    include: {
      tenant: true
    }
  });
  console.log("REPORTS:");
  console.log(JSON.stringify(reports.map(r => ({
    id: r.id,
    firstName: r.tenant?.firstName,
    lastName: r.tenant?.lastName,
    email: r.tenant?.email,
    unitId: r.tenant?.unitId,
  })), null, 2));
}

run();
