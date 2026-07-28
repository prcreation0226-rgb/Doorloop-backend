import prisma from '../config/database';

export class LeaseService {
  async getAllLeases(companyId?: string) {
    return prisma.lease.findMany({
      where: companyId ? { companyId } : {},
      include: {
        tenant: true,
        property: true,
        unit: true,
      },
    });
  }

  async createLease(data: any) {
    return prisma.lease.create({
      data: {
        tenantId: data.tenantId,
        propertyId: data.propertyId,
        unitId: data.unitId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        rentAmount: data.rentAmount,
        depositAmount: data.depositAmount,
        status: data.status || 'Pending',
        companyId: data.companyId,
      },
    });
  }

  async updateLease(id: string, data: any, companyId?: string) {
    if (companyId) {
      const lease = await prisma.lease.findFirst({
        where: { id, companyId },
      });
      if (!lease) throw new Error('Lease not found.');
    }
    return prisma.lease.update({
      where: { id },
      data: {
        status: data.status,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async deleteLease(id: string, companyId?: string) {
    if (companyId) {
      const lease = await prisma.lease.findFirst({
        where: { id, companyId },
      });
      if (!lease) throw new Error('Lease not found.');
    }
    return prisma.lease.delete({
      where: { id },
    });
  }
}

export const leaseService = new LeaseService();
