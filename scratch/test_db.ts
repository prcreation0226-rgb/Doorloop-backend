import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const reports = await prisma.screeningReport.findMany({
    include: {
      tenant: {
        include: {
          unit: {
            include: {
              property: true
            }
          }
        }
      }
    }
  });
  console.log("REPORTS:");
  console.log(JSON.stringify(reports.map(r => ({
    id: r.id,
    tenantName: `${r.tenant.firstName} ${r.tenant.lastName}`,
    tenantUnitId: r.tenant.unitId,
    unit: r.tenant.unit,
  })), null, 2));
}

run();
