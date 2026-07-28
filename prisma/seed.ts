import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting DoorLoop ERP Database Seeding...');

  // Clean up existing data to ensure idempotent seed runs
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
  await prisma.rentPayment.deleteMany({});
  await prisma.lease.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.building.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.owner.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.serviceRequest.deleteMany({});
  await prisma.workOrder.deleteMany({});
  await prisma.screeningReport.deleteMany({});
  await prisma.violation.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');

  // 1. Create Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      description: 'Master account with full administrative permissions.',
      isCustom: false,
    },
  });

  const ownerRole = await prisma.role.upsert({
    where: { name: 'Owner' },
    update: {},
    create: {
      name: 'Owner',
      description: 'Owner access to financial statements and payouts.',
      isCustom: false,
    },
  });

  const tenantRole = await prisma.role.upsert({
    where: { name: 'Tenant' },
    update: {},
    create: {
      name: 'Tenant',
      description: 'Tenant portal access for rent payments and maintenance.',
      isCustom: false,
    },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: 'Maintenance Staff' },
    update: {},
    create: {
      name: 'Maintenance Staff',
      description: 'Maintenance dispatcher and tech access.',
      isCustom: false,
    },
  });

  const collectionRole = await prisma.role.upsert({
    where: { name: 'Collection Manager' },
    update: {},
    create: {
      name: 'Collection Manager',
      description: 'Collection manager access.',
      isCustom: false,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Property Manager' },
    update: {},
    create: {
      name: 'Property Manager',
      description: 'Property manager access with operational permissions.',
      isCustom: false,
    },
  });

  // 2. Create Permissions for Admin and Manager Roles
  const modules = [
    'Dashboard',
    'Properties',
    'Leasing',
    'Tenants',
    'Owners',
    'Rent & Payments',
    'Accounting',
    'Maintenance',
    'Documents',
    'Reports',
    'Communication',
    'Company Settings',
  ];

  for (const moduleName of modules) {
    await prisma.permission.upsert({
      where: {
        roleId_module: {
          roleId: adminRole.id,
          module: moduleName,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        module: moduleName,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canApprove: true,
        canExport: true,
      },
    });

    await prisma.permission.upsert({
      where: {
        roleId_module: {
          roleId: managerRole.id,
          module: moduleName,
        },
      },
      update: {},
      create: {
        roleId: managerRole.id,
        module: moduleName,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canApprove: true,
        canExport: true,
      },
    });
  }

  // 3. Create Companies Early to Link Data
  const apex = await prisma.company.upsert({
    where: { email: 'contact@apexpm.com' },
    update: {},
    create: {
      name: 'Apex Property Management',
      code: 'APEX',
      contactName: 'Sarah Davis',
      email: 'contact@apexpm.com',
      phone: '(512) 555-0100',
      planName: 'Enterprise SaaS',
      storageUsed: '4.8 GB',
      status: 'Active',
    },
  });

  const skyline = await prisma.company.upsert({
    where: { email: 'info@skylineig.com' },
    update: {},
    create: {
      name: 'Skyline Investment Group',
      code: 'SKYL',
      contactName: 'Robert Vance',
      email: 'info@skylineig.com',
      phone: '(415) 555-0199',
      planName: 'Pro Plan',
      storageUsed: '2.1 GB',
      status: 'Active',
    },
  });

  // 4. Create Users matching frontend login credentials and scoped by Company
  const passwordHash = '$2b$12$KIX32Jc56M9s.Xg/7B9Aie1M5F1nBvKjD7zS3L0lYhXzQ/F5G7J1e'; // password: 'admin123'
  
  // Apex Users
  await prisma.user.upsert({
    where: { email: 'admin@apexpm.com' },
    update: { roleId: adminRole.id, companyId: apex.id },
    create: {
      email: 'admin@apexpm.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Doe',
      phone: '(512) 555-0100',
      roleId: adminRole.id,
      status: 'Active',
      companyId: apex.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager@apexpm.com' },
    update: { roleId: managerRole.id, companyId: apex.id },
    create: {
      email: 'manager@apexpm.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Davis',
      phone: '(512) 555-0101',
      roleId: managerRole.id,
      status: 'Active',
      companyId: apex.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'owner@apexpm.com' },
    update: { roleId: ownerRole.id, companyId: apex.id },
    create: {
      email: 'owner@apexpm.com',
      passwordHash,
      firstName: 'Lakeside',
      lastName: 'Development',
      phone: '(512) 555-0102',
      roleId: ownerRole.id,
      status: 'Active',
      companyId: apex.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'tenant@apexpm.com' },
    update: { roleId: tenantRole.id, companyId: apex.id },
    create: {
      email: 'tenant@apexpm.com',
      passwordHash,
      firstName: 'Robert',
      lastName: 'Johnson',
      phone: '(512) 555-0103',
      roleId: tenantRole.id,
      status: 'Active',
      companyId: apex.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@apexpm.com' },
    update: { roleId: staffRole.id, companyId: apex.id },
    create: {
      email: 'staff@apexpm.com',
      passwordHash,
      firstName: 'Technician',
      lastName: 'Lead 1',
      phone: '(512) 555-0104',
      roleId: staffRole.id,
      status: 'Active',
      companyId: apex.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'collection@apexpm.com' },
    update: { roleId: collectionRole.id, companyId: apex.id },
    create: {
      email: 'collection@apexpm.com',
      passwordHash,
      firstName: 'Michael',
      lastName: 'Collection',
      phone: '(512) 555-0105',
      roleId: collectionRole.id,
      status: 'Active',
      companyId: apex.id,
    },
  });

  // Skyline User (Isolate test)
  await prisma.user.upsert({
    where: { email: 'manager@skylineig.com' },
    update: { roleId: managerRole.id, companyId: skyline.id },
    create: {
      email: 'manager@skylineig.com',
      passwordHash,
      firstName: 'Robert',
      lastName: 'Vance',
      phone: '(415) 555-0199',
      roleId: managerRole.id,
      status: 'Active',
      companyId: skyline.id,
    },
  });

  // 5. Create Owners
  const ownerApex = await prisma.owner.create({
    data: {
      firstName: 'William',
      lastName: 'Anderson',
      email: 'bill.a@investments.com',
      phone: '(212) 555-0122',
      payoutMethod: 'ACH/Direct Deposit',
      propertiesOwnedCount: 4,
      companyId: apex.id,
    },
  });

  const ownerSkyline = await prisma.owner.create({
    data: {
      firstName: 'Bob',
      lastName: 'Vance',
      email: 'bob@skylineig.com',
      phone: '(415) 555-0233',
      payoutMethod: 'ACH/Direct Deposit',
      propertiesOwnedCount: 1,
      companyId: skyline.id,
    },
  });

  // 6. Create Properties & Units
  // Apex Properties
  const propNamesApex = ['Oakridge Heights', 'Downtown Plaza', 'Sunset Villas'];
  for (let i = 0; i < propNamesApex.length; i++) {
    const property = await prisma.property.create({
      data: {
        name: propNamesApex[i],
        type: 'Apartment',
        status: 'Active',
        ownerId: ownerApex.id,
        ownershipPercentage: 100,
        managementCompany: 'Apex Property Management',
        address: `${100 + i * 12} Main St, Austin, TX 7870${i}`,
        streetAddress: `${100 + i * 12} Main St`,
        city: 'Austin',
        state: 'TX',
        zip: `7870${i}`,
        unitsCount: 5,
        occupiedUnits: 4,
        occupancyRate: 80,
        companyId: apex.id,
        yearBuilt: 2018,
        purchasePrice: 1500000,
        currentValue: 1800000,
        squareFootage: 12000,
      },
    });

    const building = await prisma.building.create({
      data: {
        propertyId: property.id,
        name: 'Building A',
        floors: 2,
        unitsCount: 5,
        occupancyRate: 80,
      },
    });

    for (let u = 1; u <= 3; u++) {
      await prisma.unit.create({
        data: {
          propertyId: property.id,
          buildingId: building.id,
          unitNumber: `10${u}`,
          floor: 1,
          bedrooms: 2,
          bathrooms: 1.5,
          squareFootage: 850,
          rentAmount: 1500,
          securityDeposit: 1500,
          availabilityDate: new Date('2026-08-01'),
          status: 'Occupied',
        },
      });
    }
  }

  // Skyline Properties
  const skylineProp = await prisma.property.create({
    data: {
      name: 'Skyline Heights',
      type: 'Commercial',
      status: 'Active',
      ownerId: ownerSkyline.id,
      ownershipPercentage: 100,
      managementCompany: 'Skyline Investment Group',
      address: '900 Skyline Dr, San Francisco, CA 94101',
      streetAddress: '900 Skyline Dr',
      city: 'San Francisco',
      state: 'CA',
      zip: '94101',
      unitsCount: 1,
      occupiedUnits: 1,
      occupancyRate: 100,
      companyId: skyline.id,
      yearBuilt: 2015,
      purchasePrice: 4000000,
      currentValue: 4500000,
      squareFootage: 20000,
    },
  });

  const skylineBuilding = await prisma.building.create({
    data: {
      propertyId: skylineProp.id,
      name: 'Tower A',
      floors: 1,
      unitsCount: 1,
      occupancyRate: 100,
    },
  });

  await prisma.unit.create({
    data: {
      propertyId: skylineProp.id,
      buildingId: skylineBuilding.id,
      unitNumber: 'Suite 100',
      floor: 1,
      bedrooms: 0,
      bathrooms: 2,
      squareFootage: 2000,
      rentAmount: 5000,
      securityDeposit: 5000,
      availabilityDate: new Date('2026-08-01'),
      status: 'Occupied',
    },
  });

  // 7. Seed Chart of Accounts
  const coaData = [
    { accountCode: '1010', accountName: 'Operating Checking Account', type: 'Asset', balance: 150000 },
    { accountCode: '1020', accountName: 'Security Deposit Escrow Account', type: 'Asset', balance: 45000 },
    { accountCode: '2010', accountName: 'Accounts Payable (AP)', type: 'Liability', balance: 12000 },
    { accountCode: '2020', accountName: 'Tenant Security Deposit Liability', type: 'Liability', balance: 45000 },
    { accountCode: '3010', accountName: "Owner's Equity Capital", type: 'Equity', balance: 500000 },
    { accountCode: '4010', accountName: 'Rental Revenue Income', type: 'Revenue', balance: 220000 },
    { accountCode: '5010', accountName: 'Maintenance & Repair Expense', type: 'Expense', balance: 25000 },
  ];

  for (const acc of coaData) {
    // Seed for Apex
    await prisma.coAAccount.create({
      data: {
        ...acc,
        companyId: apex.id,
      },
    });

    // Seed for Skyline (with modified code to be unique)
    await prisma.coAAccount.create({
      data: {
        ...acc,
        accountCode: `${acc.accountCode}-SKYL`,
        companyId: skyline.id,
      },
    });
  }

  // 8. Seed Bank Accounts
  await prisma.bankAccount.createMany({
    data: [
      { name: 'Apex Operating Account', institution: 'Chase Bank', accountNumber: '...4829', balance: 142500, type: 'Checking', status: 'Active', companyId: apex.id },
      { name: 'Apex Escrow Account', institution: 'Wells Fargo', accountNumber: '...9012', balance: 45000, type: 'Escrow/Savings', status: 'Active', companyId: apex.id },
      { name: 'Skyline Operating Account', institution: 'Bank of America', accountNumber: '...1134', balance: 250000, type: 'Checking', status: 'Active', companyId: skyline.id },
    ],
  });

  // 9. Seed Vendors
  await prisma.vendor.createMany({
    data: [
      { companyName: 'Apex Plumbing Experts', contactName: 'Mario', email: 'mario@apexplumbing.com', phone: '(512) 555-0988', serviceType: 'Plumbing', rating: 4.8, companyId: apex.id },
      { companyName: 'Skyline Electricians', contactName: 'Sparky', email: 'sparky@skylineelectric.com', phone: '(415) 555-0744', serviceType: 'Electrical', rating: 4.9, companyId: skyline.id },
    ],
  });

  // 10. Seed Applications
  await prisma.application.createMany({
    data: [
      { tenantName: 'Alice Cooper', email: 'alice@example.com', propertyName: 'Oakridge Heights', unitNumber: '101', rentProposed: 1500, status: 'Pending', companyId: apex.id },
      { tenantName: 'Bob Vance', email: 'bob@vance.com', propertyName: 'Skyline Heights', unitNumber: 'Suite 100', rentProposed: 5000, status: 'Approved', companyId: skyline.id },
    ],
  });

  console.log('🌱 Scoped seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Database Seeding Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
