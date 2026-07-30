import prisma from '../config/database';
import { getValidUserId } from '../utils/auditHelper';

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
    return prisma.$transaction(async (tx) => {
      const lease = await tx.lease.create({
        data: {
          tenantId: data.tenantId,
          propertyId: data.propertyId,
          unitId: data.unitId,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          rentAmount: Number(data.rentAmount),
          depositAmount: Number(data.depositAmount),
          status: 'Pending_Move_In',
          companyId: data.companyId,
        },
      });

      await tx.moveIn.create({
        data: {
          leaseId: lease.id,
          unitId: lease.unitId,
          scheduledDate: lease.startDate,
          status: 'SCHEDULED',
          createdBy: data.createdBy || 'System',
          companyId: data.companyId,
        },
      });

      const validUserId = await getValidUserId(data.userId, tx);
      await tx.auditLog.create({
        data: {
          action: 'Lease Created & Move In Scheduled',
          userId: validUserId,
          module: 'Leasing',
          object: `Lease ${lease.id}`,
          ip: '127.0.0.1',
          status: 'Success',
        },
      });

      return lease;
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
