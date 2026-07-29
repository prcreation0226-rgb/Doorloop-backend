import prisma from '../config/database.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export async function getManagerCompanyId(req?: AuthenticatedRequest, explicitId?: string): Promise<string> {
  if (explicitId && typeof explicitId === 'string' && explicitId.trim() !== '' && explicitId !== 'null') {
    return explicitId;
  }

  if (req?.user?.companyId) {
    return req.user.companyId;
  }

  // Find manager user with companyId
  const managerUser = await prisma.user.findFirst({
    where: {
      companyId: { not: null },
    },
    select: { companyId: true },
  });

  if (managerUser?.companyId) {
    return managerUser.companyId;
  }

  // Find first company in DB
  const firstCompany = await prisma.company.findFirst();
  if (firstCompany) {
    return firstCompany.id;
  }

  // Auto-create default manager company if DB is empty
  const defaultCompany = await prisma.company.create({
    data: {
      name: 'Apex Property Management',
      code: 'APEX-001',
      contactName: 'Property Manager',
      email: 'manager@apexpm.com',
      phone: '555-0100',
    },
  });

  return defaultCompany.id;
}

export async function autoHealMissingCompanyIds() {
  try {
    const defaultCompanyId = await getManagerCompanyId();
    if (!defaultCompanyId) return;

    await prisma.vendor.updateMany({
      where: { companyId: null as any },
      data: { companyId: defaultCompanyId },
    });

    await prisma.owner.updateMany({
      where: { companyId: null as any },
      data: { companyId: defaultCompanyId },
    });

    await prisma.tenant.updateMany({
      where: { companyId: null as any },
      data: { companyId: defaultCompanyId },
    });

    await prisma.user.updateMany({
      where: { companyId: null as any },
      data: { companyId: defaultCompanyId },
    });

    await prisma.property.updateMany({
      where: { companyId: null as any },
      data: { companyId: defaultCompanyId },
    });

    await prisma.lease.updateMany({
      where: { companyId: null as any },
      data: { companyId: defaultCompanyId },
    });

    await prisma.companyUser.updateMany({
      where: { companyId: null as any },
      data: { companyId: defaultCompanyId },
    });

    console.log(`[AutoHeal] Successfully assigned default manager companyId (${defaultCompanyId}) to all existing null records.`);
  } catch (error) {
    console.error('[AutoHeal] Failed to assign missing companyIds:', error);
  }
}
