import prisma from '../src/config/database';
import { propertyController } from '../src/controllers/property.controller';
import { unitController } from '../src/controllers/unit.controller';
import { tenantController } from '../src/controllers/tenant.controller';
import { leaseController } from '../src/controllers/lease.controller';
import { paymentController } from '../src/controllers/payment.controller';
import { createPropertySchema } from '../src/validations/property.validation';
import { createUnitSchema } from '../src/validations/unit.validation';
import { createLeaseSchema } from '../src/validations/lease.validation';
import { createPaymentSchema } from '../src/validations/payment.validation';
import { validateRequest } from '../src/middlewares/validate.middleware';
import { AppError } from '../src/utils/appError';

// Mock DB Storage
const mockDb: Record<string, any> = {
  companies: [
    { id: 'company-A', name: 'Company A', code: 'CO_A' },
    { id: 'company-B', name: 'Company B', code: 'CO_B' }
  ],
  properties: [
    { id: 'prop-A', name: 'Property Company A', companyId: 'company-A', ownerId: 'owner-A' },
    { id: 'prop-B', name: 'Property Company B', companyId: 'company-B', ownerId: 'owner-B' },
  ],
  owners: [
    { id: 'owner-A', name: 'Owner A', companyId: 'company-A' },
    { id: 'owner-B', name: 'Owner B', companyId: 'company-B' },
  ],
  units: [
    { id: 'unit-A', propertyId: 'prop-A', unitNumber: 'A-101', companyId: 'company-A' },
    { id: 'unit-B', propertyId: 'prop-B', unitNumber: 'B-101', companyId: 'company-B' },
  ],
  tenants: [
    { id: 'tenant-A', firstName: 'Tenant', lastName: 'A', email: 'tenantA@example.com', companyId: 'company-A' },
    { id: 'tenant-B', firstName: 'Tenant', lastName: 'B', email: 'tenantB@example.com', companyId: 'company-B' },
  ],
  leases: [],
  buildings: [
    { id: 'build-B', propertyId: 'prop-B', name: 'Building B', unitsCount: 5 }
  ],
  role: { id: 'role-tenant', name: 'Tenant' }
};

// Mock prisma connections
prisma.$connect = async () => {};
prisma.$disconnect = async () => {};

prisma.property.findFirst = (async (args: any) => {
  const where = args.where || {};
  return mockDb.properties.find(p => {
    if (where.id && p.id !== where.id) return false;
    if (where.companyId && p.companyId !== where.companyId) return false;
    return true;
  }) || null;
}) as any;

prisma.property.findUnique = (async (args: any) => {
  const where = args.where || {};
  return mockDb.properties.find(p => p.id === where.id) || null;
}) as any;

prisma.owner.findFirst = (async (args: any) => {
  const where = args.where || {};
  return mockDb.owners.find(o => {
    if (where.id && o.id !== where.id) return false;
    if (where.companyId && o.companyId !== where.companyId) return false;
    return true;
  }) || null;
}) as any;

prisma.owner.findUnique = (async (args: any) => {
  const where = args.where || {};
  return mockDb.owners.find(o => o.id === where.id) || null;
}) as any;

prisma.owner.create = (async (args: any) => {
  return { id: `owner-${Date.now()}`, ...args.data };
}) as any;

prisma.unit.findFirst = (async (args: any) => {
  const where = args.where || {};
  return mockDb.units.find(u => {
    if (where.id && u.id !== where.id) return false;
    if (where.propertyId && u.propertyId !== where.propertyId) return false;
    if (where.unitNumber && u.unitNumber !== where.unitNumber) return false;
    if (where.property && where.property.companyId) {
      const prop = mockDb.properties.find(p => p.id === u.propertyId);
      if (!prop || prop.companyId !== where.property.companyId) return false;
    }
    return true;
  }) || null;
}) as any;

prisma.unit.findUnique = (async (args: any) => {
  const where = args.where || {};
  return mockDb.units.find(u => u.id === where.id) || null;
}) as any;

prisma.unit.count = (async (args: any) => {
  return mockDb.units.filter((u: any) => u.buildingId === args.where?.buildingId).length;
}) as any;

prisma.building.findFirst = (async (args: any) => {
  const where = args.where || {};
  return mockDb.buildings.find(b => {
    if (where.id && b.id !== where.id) return false;
    if (where.propertyId && b.propertyId !== where.propertyId) return false;
    if (where.property && where.property.companyId) {
      const prop = mockDb.properties.find(p => p.id === b.propertyId);
      if (!prop || prop.companyId !== where.property.companyId) return false;
    }
    return true;
  }) || null;
}) as any;

prisma.building.findUnique = (async (args: any) => {
  const where = args.where || {};
  return mockDb.buildings.find(b => b.id === where.id) || null;
}) as any;

prisma.building.create = (async (args: any) => {
  const created = { id: `build-${Date.now()}`, ...args.data };
  mockDb.buildings.push(created);
  return created;
}) as any;

prisma.tenant.findFirst = (async (args: any) => {
  const where = args.where || {};
  return mockDb.tenants.find(t => {
    if (where.id && t.id !== where.id) return false;
    if (where.email && t.email !== where.email) return false;
    if (where.companyId && t.companyId !== where.companyId) return false;
    return true;
  }) || null;
}) as any;

prisma.tenant.findUnique = (async (args: any) => {
  const where = args.where || {};
  return mockDb.tenants.find(t => t.id === where.id) || null;
}) as any;

prisma.role.findUnique = (async () => {
  return mockDb.role;
}) as any;

prisma.role.findFirst = (async () => {
  return mockDb.role;
}) as any;

prisma.user.create = (async (args: any) => {
  return { id: `user-${Date.now()}`, ...args.data };
}) as any;

prisma.tenant.create = (async (args: any) => {
  const data = args.data;
  const exists = mockDb.tenants.find((t: any) => t.email === data.email);
  if (exists) {
    const err = new Error('Unique constraint failed on email');
    (err as any).code = 'P2002';
    (err as any).meta = { target: ['email'] };
    throw err;
  }
  const created = { id: `tenant-${Date.now()}`, ...data };
  mockDb.tenants.push(created);
  return created;
}) as any;

prisma.unit.create = (async (args: any) => {
  const data = args.data;
  const created = { id: `unit-${Date.now()}`, ...data };
  mockDb.units.push(created);
  return created;
}) as any;

prisma.rentPayment.findFirst = (async () => {
  return null;
}) as any;

prisma.auditLog.create = (async (args: any) => {
  return { id: `audit-${Date.now()}`, ...args.data };
}) as any;

// Mock lease creation service transaction
prisma.$transaction = (async (callback: any) => {
  const txMock = {
    lease: {
      create: async (args: any) => {
        const lease = { id: `lease-${Date.now()}`, ...args.data };
        mockDb.leases.push(lease);
        return lease;
      }
    },
    moveIn: {
      create: async (args: any) => {
        return { id: `movein-${Date.now()}`, ...args.data };
      }
    },
    auditLog: {
      create: async (args: any) => {
        return { id: `audit-${Date.now()}`, ...args.data };
      }
    },
    user: {
      findFirst: async () => null
    }
  };
  return callback(txMock);
}) as any;

interface MockResponse {
  statusCode: number;
  jsonData: any;
  status(code: number): MockResponse;
  json(data: any): void;
}

function mockRes(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    jsonData: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.jsonData = data;
    }
  };
  return res;
}

async function runValidationMiddleware(schema: any, payload: any): Promise<{ success: boolean; error?: any }> {
  const req = payload as any;
  const res = mockRes() as any;
  let nextCalled = false;
  let nextError: any = null;

  const middleware = validateRequest(schema);
  await middleware(req, res, (err?: any) => {
    nextCalled = true;
    nextError = err;
  });

  if (res.statusCode === 422 || (nextError && nextError.statusCode === 422)) {
    return { success: false, error: nextError || res.jsonData?.error };
  }
  return { success: true };
}

async function main() {
  console.log('--- STARTING VALIDATION AND MULTI-TENANCY TESTS ---');

  const results: any[] = [];

  function logResult(endpoint: string, testName: string, expected: string, actual: string, dbMod: string, result: string) {
    results.push({ endpoint, testName, expected, actual, dbMod, result });
    console.log(`[${result}] ${endpoint} - ${testName}: expected=${expected}, actual=${actual}`);
  }

  // --- TEST CASE 1: Validation - Negative Financial Values ---
  console.log('Testing Negative Financial Values...');
  const res1 = await runValidationMiddleware(createPropertySchema, {
    body: {
      name: 'Test Prop',
      ownerId: 'owner-A',
      address: '123 St',
      purchasePrice: -50000
    }
  });
  logResult(
    'POST /api/properties',
    'Reject Negative Purchase Price',
    'VALIDATION_ERROR / 422',
    res1.success ? 'Success' : `Error: ${res1.error?.message || res1.error?.details?.[0]?.message}`,
    'No',
    res1.success ? 'FAIL' : 'SUCCESS'
  );

  // --- TEST CASE 2: Validation - Invalid Number String (NaN) ---
  console.log('Testing Invalid Number Input...');
  const res2 = await runValidationMiddleware(createPropertySchema, {
    body: {
      name: 'Test Prop',
      ownerId: 'owner-A',
      address: '123 St',
      purchasePrice: 'abc'
    }
  });
  logResult(
    'POST /api/properties',
    'Reject Alphabetic Price Input ("abc")',
    'VALIDATION_ERROR / 422',
    res2.success ? 'Success' : `Error: ${res2.error?.message || res2.error?.details?.[0]?.message}`,
    'No',
    res2.success ? 'FAIL' : 'SUCCESS'
  );

  // --- TEST CASE 3: Validation - Invalid Date String ---
  console.log('Testing Invalid Date Input...');
  const res3 = await runValidationMiddleware(createUnitSchema, {
    body: {
      propertyId: 'prop-A',
      unitNumber: 'U-999',
      availabilityDate: 'not-a-date'
    }
  });
  logResult(
    'POST /api/units',
    'Reject Invalid Date String ("not-a-date")',
    'VALIDATION_ERROR / 422',
    res3.success ? 'Success' : `Error: ${res3.error?.message || res3.error?.details?.[0]?.message}`,
    'No',
    res3.success ? 'FAIL' : 'SUCCESS'
  );

  // --- TEST CASE 4: Validation - Lease Date Relationship (startDate >= endDate) ---
  console.log('Testing Lease chronological order...');
  const res4 = await runValidationMiddleware(createLeaseSchema, {
    body: {
      propertyId: 'prop-A',
      unitId: 'unit-A',
      tenantId: 'tenant-A',
      startDate: '2026-08-20',
      endDate: '2026-08-10',
      rentAmount: 1000,
      depositAmount: 1000
    }
  });
  logResult(
    'POST /api/leases',
    'Reject startDate >= endDate',
    'VALIDATION_ERROR / 422',
    res4.success ? 'Success' : `Error: ${res4.error?.message || res4.error?.details?.[0]?.message}`,
    'No',
    res4.success ? 'FAIL' : 'SUCCESS'
  );

  // --- TEST CASE 5: Multi-Tenant Boundary: Company A User + Company A Property ---
  console.log('Testing Authorized Association (Same Company)...');
  const req5 = {
    user: { companyId: 'company-A' },
    body: {
      propertyId: 'prop-A',
      unitNumber: 'U-100',
      floor: 1,
      bedrooms: 1,
      bathrooms: 1,
      squareFootage: 500,
      rentAmount: 1200,
      securityDeposit: 1200,
      availabilityDate: new Date(),
      status: 'Vacant'
    }
  } as any;
  const res5 = mockRes() as any;
  let err5 = null;
  try {
    await unitController.create(req5, res5, (err: any) => { err5 = err; });
  } catch (e) {
    err5 = e;
  }
  const isAllowed5 = res5.statusCode === 201 || (res5.jsonData && res5.jsonData.success);
  logResult(
    'POST /api/units',
    'Allow Company A User to create Unit in Company A Property',
    'Success (201)',
    isAllowed5 ? 'Success (201)' : `Error: ${err5?.message || res5.jsonData?.error?.message}`,
    'Yes',
    isAllowed5 ? 'SUCCESS' : 'FAIL'
  );

  // --- TEST CASE 6: Multi-Tenant Boundary: Company A User + Company B Property ---
  console.log('Testing Cross-Company Block (Company A user + Company B property)...');
  const req6 = {
    user: { companyId: 'company-A' },
    body: {
      propertyId: 'prop-B',
      unitNumber: 'U-200',
      floor: 1,
      bedrooms: 1,
      bathrooms: 1,
      squareFootage: 500,
      rentAmount: 1200,
      securityDeposit: 1200,
      availabilityDate: new Date(),
      status: 'Vacant'
    }
  } as any;
  const res6 = mockRes() as any;
  let err6: any = null;
  try {
    await unitController.create(req6, res6, (err: any) => { err6 = err; });
  } catch (e) {
    err6 = e;
  }
  const status6 = err6?.statusCode || res6.statusCode;
  const message6 = err6?.message || res6.jsonData?.error?.message;
  logResult(
    'POST /api/units',
    'Block Company A User from creating Unit in Company B Property',
    '404 Not Found',
    `Code: ${status6}, Msg: ${message6}`,
    'No',
    status6 === 404 ? 'SUCCESS' : 'FAIL'
  );

  // --- TEST CASE 7: Multi-Tenant Boundary: Company A User + Company B Tenant/Unit/Property in Lease ---
  console.log('Testing Lease Cross-Company Block...');
  const req7 = {
    user: { companyId: 'company-A' },
    body: {
      propertyId: 'prop-B',
      unitId: 'unit-B',
      tenantId: 'tenant-B',
      startDate: new Date(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
      rentAmount: 1000,
      depositAmount: 1000
    }
  } as any;
  const res7 = mockRes() as any;
  let err7: any = null;
  try {
    await leaseController.create(req7, res7, (err: any) => { err7 = err; });
  } catch (e) {
    err7 = e;
  }
  const status7 = err7?.statusCode || res7.statusCode;
  const message7 = err7?.message || res7.jsonData?.error?.message;
  logResult(
    'POST /api/leases',
    'Block Company A User from creating Lease for Company B tenant/unit',
    '404 Not Found',
    `Code: ${status7}, Msg: ${message7}`,
    'No',
    status7 === 404 ? 'SUCCESS' : 'FAIL'
  );

  // --- TEST CASE 8: Validation - Duplicate Email tenant creation ---
  console.log('Testing tenant creation duplicate email constraint catch...');
  const req8 = {
    user: { companyId: 'company-A' },
    body: {
      firstName: 'Another',
      lastName: 'Tenant',
      email: 'tenantA@example.com', // already in mockDb
      phone: '555-6666'
    }
  } as any;
  const res8 = mockRes() as any;
  let err8: any = null;
  try {
    await tenantController.create(req8, res8, (err: any) => { err8 = err; });
  } catch (e) {
    err8 = e;
  }
  const status8 = err8?.statusCode || res8.statusCode;
  const message8 = err8?.message || res8.jsonData?.error?.message;
  const code8 = err8?.code || res8.jsonData?.error?.code;
  logResult(
    'POST /api/tenants',
    'Catch duplicate email constraint and convert to 400 DUPLICATE_EMAIL',
    '400 / DUPLICATE_EMAIL',
    `Code: ${status8}, Msg: ${message8}, ErrorCode: ${code8}`,
    'No',
    status8 === 400 && (code8 === 'DUPLICATE_EMAIL' || message8.includes('registered')) ? 'SUCCESS' : 'FAIL'
  );

  // Render Markdown Table to file
  console.log('\n--- VERIFICATION TEST RESULTS SUMMARY ---');
  let tableMarkdown = `| Endpoint | Test | Expected | Actual | DB Modified? | Result |\n|---|---|---|---|---|---|\n`;
  for (const r of results) {
    tableMarkdown += `| ${r.endpoint} | ${r.testName} | ${r.expected} | ${r.actual} | ${r.dbMod} | **${r.result}** |\n`;
  }
  console.log(tableMarkdown);
  
  const fs = require('fs');
  fs.writeFileSync('scratch/test_results.md', tableMarkdown);
  console.log('Test results written to scratch/test_results.md');
}

main().catch(console.error);
