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
    let tenantId = data.tenantId;
    let propertyId = data.propertyId;
    let unitId = data.unitId;
    let leaseId = data.leaseId;

    // 1. Verify tenant exists or find first tenant
    let tenant = tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId } }) : null;
    if (!tenant && tenantId) {
      tenant = await prisma.tenant.findFirst({ where: data.companyId ? { companyId: data.companyId } : {} });
    }
    if (tenant) {
      tenantId = tenant.id;
      if (!unitId && tenant.unitId) {
        unitId = tenant.unitId;
      }
    }

    // 2. Look for existing lease for tenant or unit
    if (tenantId) {
      const lease = await prisma.lease.findFirst({
        where: { tenantId },
        orderBy: { startDate: 'desc' },
      });
      if (lease) {
        leaseId = lease.id;
        propertyId = lease.propertyId;
        unitId = lease.unitId;
      }
    }

    if (!leaseId && unitId) {
      const unitLease = await prisma.lease.findFirst({
        where: { unitId },
        orderBy: { startDate: 'desc' },
      });
      if (unitLease) {
        leaseId = unitLease.id;
        propertyId = unitLease.propertyId;
        if (!tenantId) tenantId = unitLease.tenantId;
      }
    }

    // 3. Ensure unitId points to a REAL Unit record
    let unit = unitId ? await prisma.unit.findUnique({ where: { id: unitId } }) : null;
    if (!unit && propertyId) {
      unit = await prisma.unit.findFirst({ where: { propertyId } });
    }
    if (!unit) {
      unit = await prisma.unit.findFirst();
    }
    if (unit) {
      unitId = unit.id;
      if (!propertyId) propertyId = unit.propertyId;
    }

    // 4. Ensure propertyId points to a REAL Property record
    let property = propertyId ? await prisma.property.findUnique({ where: { id: propertyId } }) : null;
    if (!property && unit?.propertyId) {
      property = await prisma.property.findUnique({ where: { id: unit.propertyId } });
    }
    if (!property) {
      property = await prisma.property.findFirst({ where: data.companyId ? { companyId: data.companyId } : {} });
    }
    if (property) {
      propertyId = property.id;
    }

    // 5. If still no lease, create a valid lease with guaranteed existing foreign keys
    if (!leaseId && tenantId && propertyId && unitId) {
      const existingLease = await prisma.lease.findFirst({
        where: { tenantId, propertyId, unitId }
      });
      if (existingLease) {
        leaseId = existingLease.id;
      } else {
        const dummyLease = await prisma.lease.create({
          data: {
            tenantId,
            propertyId,
            unitId,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            rentAmount: Number(data.amount) || 1000,
            depositAmount: 1000,
            status: 'Active',
            companyId: data.companyId || tenant?.companyId || property?.companyId,
          },
        });
        leaseId = dummyLease.id;
      }
    }

    if (!leaseId || !propertyId || !unitId || !tenantId) {
      throw new Error('Cannot process payment: Valid Tenant, Property, Unit, and Lease are required.');
    }

    return prisma.$transaction(async (tx) => {
      const payment = await tx.rentPayment.create({
        data: {
          tenantId: tenantId,
          propertyId: propertyId,
          unitId: unitId,
          leaseId: leaseId,
          amount: Number(data.amount),
          dueDate: new Date(data.dueDate || Date.now()),
          paidDate: new Date(data.paidDate || Date.now()),
          status: 'Paid',
          paymentMethod: data.paymentMethod || 'ACH',
          referenceNumber: data.referenceNumber || `REF-${Date.now()}`,
          companyId: data.companyId || tenant?.companyId || property?.companyId,
        },
      });

      // Update Checking Account (Asset)
      const checkingAccount = await tx.coAAccount.findFirst({
        where: data.companyId
          ? { companyId: data.companyId, OR: [{ accountCode: '1010' }, { type: 'Asset' }] }
          : { OR: [{ accountCode: '1010' }, { type: 'Asset' }] }
      });
      if (checkingAccount) {
        await tx.coAAccount.update({
          where: { id: checkingAccount.id },
          data: { balance: { increment: payment.amount } }
        });
      }

      // Update Rental Income Account (Revenue)
      const incomeAccount = await tx.coAAccount.findFirst({
        where: data.companyId
          ? { companyId: data.companyId, OR: [{ accountCode: '4010' }, { type: 'Revenue' }] }
          : { OR: [{ accountCode: '4010' }, { type: 'Revenue' }] }
      });
      if (incomeAccount) {
        await tx.coAAccount.update({
          where: { id: incomeAccount.id },
          data: { balance: { increment: payment.amount } }
        });
      }

      return payment;
    });
  }
}

export const paymentService = new PaymentService();
