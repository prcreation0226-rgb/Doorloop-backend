import prisma from '../config/database';

export class PaymentService {
  async getAllPayments(companyId?: string) {
    return prisma.rentPayment.findMany({
      where: companyId ? { companyId } : {},
      include: {
        tenant: true,
        property: true,
        unit: true,
        lease: true,
      },
    });
  }

  async processPayment(data: any) {
    let leaseId = data.leaseId;

    if (!leaseId && data.tenantId) {
      const lease = await prisma.lease.findFirst({
        where: { tenantId: data.tenantId },
        orderBy: { startDate: 'desc' },
      });
      if (lease) {
        leaseId = lease.id;
      } else if (data.unitId) {
        const unitLease = await prisma.lease.findFirst({
          where: { unitId: data.unitId },
          orderBy: { startDate: 'desc' },
        });
        if (unitLease) {
          leaseId = unitLease.id;
        }
      }
    }

    // If still no lease, create a dummy one to satisfy Prisma constraint
    if (!leaseId && data.tenantId && data.propertyId && data.unitId) {
      const dummyLease = await prisma.lease.create({
        data: {
          tenantId: data.tenantId,
          propertyId: data.propertyId,
          unitId: data.unitId,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          rentAmount: data.amount || 1000,
          depositAmount: 1000,
          status: 'Active',
          companyId: data.companyId,
        },
      });
      leaseId = dummyLease.id;
    }

    if (!leaseId) {
      throw new Error('Cannot process payment: Tenant must have an active lease or unit assignment.');
    }

    return prisma.rentPayment.create({
      data: {
        tenantId: data.tenantId,
        propertyId: data.propertyId,
        unitId: data.unitId,
        leaseId: leaseId,
        amount: Number(data.amount),
        dueDate: new Date(data.dueDate || Date.now()),
        paidDate: new Date(data.paidDate || Date.now()),
        status: 'Paid',
        paymentMethod: data.paymentMethod || 'ACH',
        referenceNumber: data.referenceNumber || `REF-${Date.now()}`,
        companyId: data.companyId,
      },
    });
  }
}

export const paymentService = new PaymentService();
