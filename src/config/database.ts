import { PrismaClient } from '@prisma/client';
import { tenantContext } from '../utils/tenantContext.js';

const prismaRaw = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export const prisma = prismaRaw.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const store = tenantContext.getStore();
        if (!store || !store.companyId) {
          return query(args);
        }

        const { companyId, role, tenantId, ownerId, staffId } = store;

        // Super Admin has bypass
        if (role === 'Super Admin') {
          return query(args);
        }

        // Apply filters only for models that have companyId
        const modelsWithCompanyId = [
          'Property', 'Owner', 'Tenant', 'StaffProfile', 'User', 
          'Document', 'OwnerDocument', 'TenantDocument', 'Lease', 'Unit', 'Building',
          'Invoice', 'RentPayment', 'WorkOrder', 'Announcement', 'Violation', 'ServiceRequest'
        ];

        if (modelsWithCompanyId.includes(model)) {
          if (operation !== 'create' && operation !== 'createMany' && operation !== 'createManyAndReturn') {
            args.where = args.where || {};
            args.where.companyId = companyId;

            // Extra role isolation checks
            if (role === 'Tenant' && tenantId) {
              if (model === 'Tenant') args.where.id = tenantId;
              if (model === 'Lease') args.where.tenantId = tenantId;
              if (model === 'Invoice') args.where.tenantId = tenantId;
              if (model === 'TenantDocument') args.where.tenantId = tenantId;
            } else if (role === 'Owner' && ownerId) {
              if (model === 'Owner') args.where.id = ownerId;
              if (model === 'Property') args.where.ownerId = ownerId;
              if (model === 'OwnerDocument') args.where.ownerId = ownerId;
            } else if (role === 'Maintenance Staff' && staffId) {
              if (model === 'WorkOrder') args.where.staffId = staffId;
              if (model === 'StaffProfile') args.where.id = staffId;
            }
          }
        }

        // Automatically assign companyId on create
        if (operation === 'create' || operation === 'createMany') {
          const injectCompanyId = (data: any) => {
            if (data && typeof data === 'object') {
              data.companyId = companyId;
            }
          };

          if (args.data) {
            if (Array.isArray(args.data)) {
              args.data.forEach(injectCompanyId);
            } else {
              injectCompanyId(args.data);
            }
          }
        }

        return query(args);
      }
    }
  }
});

export default prisma;
