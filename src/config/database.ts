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
        console.log('DEBUG database.ts: store =', store, 'model =', model);
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
          'Document', 'OwnerDocument', 'TenantDocument', 'Lease',
          'Invoice', 'RentPayment', 'WorkOrder', 'Announcement', 'Violation', 'ServiceRequest',
          'CrmLead'
        ];

        const queryArgs = args as any;

        if (modelsWithCompanyId.includes(model)) {
          if (operation !== 'create' && operation !== 'createMany' && (operation as string) !== 'createManyAndReturn') {
            queryArgs.where = queryArgs.where || {};
            queryArgs.where.companyId = companyId;

            // Extra role isolation checks
            if (role === 'Tenant' && tenantId) {
              if (model === 'Tenant') queryArgs.where.id = tenantId;
              if (model === 'Lease') queryArgs.where.tenantId = tenantId;
              if (model === 'Invoice') queryArgs.where.tenantId = tenantId;
              if (model === 'TenantDocument') queryArgs.where.tenantId = tenantId;
            } else if (role === 'Owner' && ownerId) {
              if (model === 'Owner') queryArgs.where.id = ownerId;
              if (model === 'Property') queryArgs.where.ownerId = ownerId;
              if (model === 'OwnerDocument') queryArgs.where.ownerId = ownerId;
            } else if (role === 'Maintenance Staff' && staffId) {
              if (model === 'WorkOrder') queryArgs.where.staffId = staffId;
              if (model === 'StaffProfile') queryArgs.where.id = staffId;
            }
          }
        }

        // Automatically assign companyId on create
        if ((operation === 'create' || operation === 'createMany') && modelsWithCompanyId.includes(model)) {
          const injectCompanyId = (data: any) => {
            if (data && typeof data === 'object') {
              data.companyId = companyId;
            }
          };

          if (queryArgs.data) {
            if (Array.isArray(queryArgs.data)) {
              queryArgs.data.forEach(injectCompanyId);
            } else {
              injectCompanyId(queryArgs.data);
            }
          }
        }

        return query(queryArgs);
      }
    }
  }
});

export default prisma;
