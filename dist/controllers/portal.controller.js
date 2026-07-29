"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalController = exports.PortalController = void 0;
const database_1 = __importDefault(require("../config/database"));
const apiResponse_1 = require("../utils/apiResponse");
class PortalController {
    // --- Tenant Portal Views ---
    async getTenantLeases(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const leases = await database_1.default.lease.findMany({
                where: companyId ? { companyId } : {},
                include: {
                    property: true,
                    unit: true,
                    tenant: true,
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: leases });
        }
        catch (error) {
            next(error);
        }
    }
    async getTenantLease(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const lease = await database_1.default.lease.findFirst({
                where: companyId ? { companyId } : {},
                include: {
                    property: true,
                    unit: true,
                    tenant: true,
                },
            });
            if (!lease) {
                const firstProperty = await database_1.default.property.findFirst({
                    where: companyId ? { companyId } : {},
                });
                return (0, apiResponse_1.sendSuccess)({
                    res,
                    data: {
                        id: 'lease-default',
                        propertyName: firstProperty?.name || 'Oakridge Heights',
                        unitNumber: 'Unit 402',
                        rentAmount: 2400,
                        securityDeposit: 2400,
                        leaseStart: '2025-08-01',
                        leaseEnd: '2026-07-31',
                        status: 'Active',
                        tenantName: 'Alex Mercer',
                    },
                });
            }
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: {
                    id: lease.id,
                    propertyName: lease.property?.name || 'Oakridge Heights',
                    unitNumber: lease.unit?.unitNumber || 'Unit 402',
                    rentAmount: lease.rentAmount || 2400,
                    securityDeposit: lease.depositAmount || 2400,
                    leaseStart: lease.startDate ? new Date(lease.startDate).toISOString().split('T')[0] : '2025-08-01',
                    leaseEnd: lease.endDate ? new Date(lease.endDate).toISOString().split('T')[0] : '2026-07-31',
                    status: lease.status || 'Active',
                    tenantName: lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : 'Alex Mercer',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTenantMetrics(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const firstLease = await database_1.default.lease.findFirst({
                where: companyId ? { companyId } : {},
                include: { property: true, unit: true },
            });
            const rent = firstLease?.rentAmount || 2400;
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: {
                    currentRent: rent,
                    nextDueDate: 'August 1, 2026',
                    outstandingBalance: 0,
                    activeVisitors: 2,
                    packagesWaiting: 1,
                    leaseExpiration: 'July 31, 2026',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTenantProfile(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            let tenant = await database_1.default.tenant.findFirst({
                where: companyId ? { companyId } : {},
            });
            if (!tenant) {
                tenant = await database_1.default.tenant.create({
                    data: {
                        firstName: 'Alex',
                        lastName: 'Mercer',
                        email: `alex.m.${Date.now()}@residence.com`,
                        phone: '(555) 234-5678',
                        companyId,
                    },
                });
            }
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: {
                    id: tenant.id,
                    firstName: tenant.firstName,
                    lastName: tenant.lastName,
                    email: tenant.email,
                    phone: tenant.phone,
                    unitNumber: 'Unit 402',
                    emergencyContact: 'Sarah Mercer (555-987-6543)',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateTenantProfile(req, res, next) {
        try {
            const { firstName, lastName, email, phone } = req.body;
            const companyId = req.user?.companyId;
            let tenant = await database_1.default.tenant.findFirst({
                where: companyId ? { companyId } : {},
            });
            if (!tenant) {
                tenant = await database_1.default.tenant.create({
                    data: {
                        firstName: firstName || 'Alex',
                        lastName: lastName || 'Mercer',
                        email: email || `alex.m.${Date.now()}@residence.com`,
                        phone: phone || '(555) 234-5678',
                        companyId,
                    },
                });
            }
            else {
                tenant = await database_1.default.tenant.update({
                    where: { id: tenant.id },
                    data: {
                        firstName: firstName || tenant.firstName,
                        lastName: lastName || tenant.lastName,
                        email: email || tenant.email,
                        phone: phone || tenant.phone,
                    },
                });
            }
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: {
                    id: tenant.id,
                    firstName: tenant.firstName,
                    lastName: tenant.lastName,
                    email: tenant.email,
                    phone: tenant.phone,
                    unitNumber: 'Unit 402',
                    emergencyContact: 'Sarah Mercer (555-987-6543)',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTenantMaintenance(req, res, next) {
        try {
            let orders = await database_1.default.workOrder.findMany({
                include: {
                    property: true,
                },
                orderBy: { createdAt: 'desc' },
            });
            if (orders.length === 0) {
                const firstProperty = await database_1.default.property.findFirst();
                if (firstProperty) {
                    await database_1.default.workOrder.create({
                        data: {
                            title: 'Leaking Faucet in Bathroom',
                            description: 'The bathroom sink faucet has a continuous drip that needs repair.',
                            status: 'Open',
                            priority: 'Normal',
                            propertyId: firstProperty.id,
                            estimatedCost: 150,
                        },
                    });
                    orders = await database_1.default.workOrder.findMany({
                        include: { property: true },
                        orderBy: { createdAt: 'desc' },
                    });
                }
            }
            const formatted = orders.map((wo) => ({
                id: wo.id,
                title: wo.title,
                propertyName: wo.property?.name || 'Oakridge Heights',
                unitName: 'Unit 402',
                priority: wo.priority || 'Medium',
                status: wo.status || 'Open',
                date: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : '2026-07-20',
                description: wo.description || '',
                preferredTime: 'Morning (8AM - 12PM)',
            }));
            return (0, apiResponse_1.sendSuccess)({ res, data: formatted });
        }
        catch (error) {
            next(error);
        }
    }
    async createTenantMaintenance(req, res, next) {
        try {
            const { title, priority, description, preferredTime } = req.body;
            let firstProperty = await database_1.default.property.findFirst();
            if (!firstProperty) {
                const owner = await database_1.default.owner.findFirst();
                let ownerId = owner?.id;
                if (!ownerId) {
                    const newOwner = await database_1.default.owner.create({
                        data: {
                            name: 'Primary Owner',
                            email: 'owner@apexpm.com',
                            phone: '555-0100',
                        },
                    });
                    ownerId = newOwner.id;
                }
                firstProperty = await database_1.default.property.create({
                    data: {
                        name: 'Oakridge Heights',
                        address: '100 Main St, Austin, TX 78701',
                        streetAddress: '100 Main St',
                        city: 'Austin',
                        state: 'TX',
                        zip: '78701',
                        yearBuilt: 2018,
                        squareFootage: 12000,
                        purchasePrice: 1500000,
                        currentValue: 1800000,
                        ownerId: ownerId,
                    },
                });
            }
            let mappedPriority = 'Normal';
            if (priority === 'Low')
                mappedPriority = 'Low';
            else if (priority === 'High' || priority === 'Urgent')
                mappedPriority = 'High';
            else if (priority === 'Emergency')
                mappedPriority = 'Emergency';
            else
                mappedPriority = 'Normal';
            const newOrder = await database_1.default.workOrder.create({
                data: {
                    title: title || 'General Repair Request',
                    description: description || '',
                    priority: mappedPriority,
                    status: 'Open',
                    propertyId: firstProperty.id,
                    estimatedCost: 150,
                },
            });
            return (0, apiResponse_1.sendSuccess)({
                res,
                statusCode: 201,
                data: {
                    id: newOrder.id,
                    title: newOrder.title,
                    propertyName: firstProperty.name,
                    unitName: 'Unit 402',
                    priority: newOrder.priority,
                    status: newOrder.status,
                    date: new Date(newOrder.createdAt).toISOString().split('T')[0],
                    description: newOrder.description,
                    preferredTime: preferredTime || 'Morning (8AM - 12PM)',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTenantDocuments(req, res, next) {
        try {
            let docs = await database_1.default.tenantDocument.findMany({
                orderBy: { uploadedAt: 'desc' },
            });
            if (docs.length === 0) {
                await database_1.default.tenantDocument.createMany({
                    data: [
                        { name: 'Lease_Agreement_Oakridge_Unit402.pdf', category: 'Rental Agreement', size: '2.8 MB' },
                        { name: 'Renter_Insurance_Policy_2026.pdf', category: 'Insurance Policy', size: '1.4 MB' },
                        { name: 'MoveIn_Condition_Checklist.pdf', category: 'Inspection', size: '3.2 MB' },
                        { name: 'MoveIn_Deposit_Receipt.pdf', category: 'Receipts', size: '0.8 MB' },
                    ],
                });
                docs = await database_1.default.tenantDocument.findMany({
                    orderBy: { uploadedAt: 'desc' },
                });
            }
            const formatted = docs.map((d) => ({
                id: d.id,
                name: d.name,
                category: d.category,
                uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toISOString().split('T')[0] : '2026-07-20',
                size: d.size || '1.5 MB',
            }));
            return (0, apiResponse_1.sendSuccess)({ res, data: formatted });
        }
        catch (error) {
            next(error);
        }
    }
    async uploadTenantDocument(req, res, next) {
        try {
            const { name, category, size } = req.body;
            const newDoc = await database_1.default.tenantDocument.create({
                data: {
                    name: name || 'Tenant_Document.pdf',
                    category: category || 'Rental Agreement',
                    size: size || '1.5 MB',
                },
            });
            return (0, apiResponse_1.sendSuccess)({
                res,
                statusCode: 201,
                data: {
                    id: newDoc.id,
                    name: newDoc.name,
                    category: newDoc.category,
                    uploadedAt: new Date(newDoc.uploadedAt).toISOString().split('T')[0],
                    size: newDoc.size,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    // --- Owner Portal Views ---
    async getOwnerFinancials(req, res, next) {
        try {
            const properties = await database_1.default.property.findMany();
            const formatted = properties.map((p, idx) => ({
                id: p.id,
                date: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '2026-07-20',
                propertyName: p.name,
                tenantName: `Tenant Unit ${idx + 1}`,
                category: 'Rental Income',
                amount: p.currentValue ? Math.round(p.currentValue / 500) : 2400,
                status: 'Cleared',
            }));
            return (0, apiResponse_1.sendSuccess)({ res, data: formatted });
        }
        catch (error) {
            next(error);
        }
    }
    async getOwnerDistributions(req, res, next) {
        try {
            let distributions = await database_1.default.ownerDistribution.findMany({
                include: { owner: true },
                orderBy: { processedDate: 'desc' },
            });
            if (distributions.length === 0) {
                const firstOwner = await database_1.default.owner.findFirst();
                let ownerId = firstOwner?.id;
                if (!ownerId) {
                    const newOwner = await database_1.default.owner.create({
                        data: { name: 'Primary Investor', email: 'investor@apexpm.com', phone: '555-0100' },
                    });
                    ownerId = newOwner.id;
                }
                await database_1.default.ownerDistribution.createMany({
                    data: [
                        { ownerId, period: 'Northside Industrial', amount: 4800, status: 'Paid' },
                        { ownerId, period: 'Summit Townhomes', amount: 4800, status: 'Paid' },
                        { ownerId, period: 'Sunset Villas', amount: 4800, status: 'Paid' },
                        { ownerId, period: 'Highland Heights Portfolio', amount: 2400, status: 'Paid' },
                    ],
                });
                distributions = await database_1.default.ownerDistribution.findMany({
                    include: { owner: true },
                    orderBy: { processedDate: 'desc' },
                });
            }
            const formatted = distributions.map((d, idx) => ({
                id: d.id,
                distributionNumber: `DIST-${1000 + idx}`,
                propertyName: d.period || 'Managed Property Asset',
                date: d.processedDate ? new Date(d.processedDate).toISOString().split('T')[0] : '2026-07-20',
                amount: d.amount,
                method: 'Direct Deposit',
                status: d.status || 'Paid',
            }));
            return (0, apiResponse_1.sendSuccess)({ res, data: formatted });
        }
        catch (error) {
            next(error);
        }
    }
    async getOwnerStatements(req, res, next) {
        try {
            const properties = await database_1.default.property.findMany();
            const statements = properties.map((p) => {
                const income = p.currentValue ? Math.round(p.currentValue / 500) : 2400;
                const expenses = Math.round(income * 0.15);
                return {
                    id: `stmt-${p.id}`,
                    period: 'July 2026',
                    propertyName: p.name,
                    openingBalance: 0,
                    totalIncome: income,
                    totalExpenses: expenses,
                    netDistribution: income - expenses,
                    endingBalance: 0,
                    status: 'Published',
                    generatedDate: '2026-07-20',
                };
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: statements });
        }
        catch (error) {
            next(error);
        }
    }
    async getOwnerMaintenance(req, res, next) {
        try {
            const workOrders = await database_1.default.workOrder.findMany({
                include: { property: true },
                orderBy: { createdAt: 'desc' },
            });
            const formatted = workOrders.map((wo) => ({
                id: wo.id,
                title: wo.title,
                propertyName: wo.property?.name || 'Oakridge Heights',
                unitName: 'Unit A1',
                priority: wo.priority || 'Normal',
                status: wo.status || 'Open',
                date: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : '2026-07-20',
                description: wo.description || '',
                estimatedCost: wo.estimatedCost || 250,
            }));
            return (0, apiResponse_1.sendSuccess)({ res, data: formatted });
        }
        catch (error) {
            next(error);
        }
    }
    async getOwnerDocuments(req, res, next) {
        try {
            let docs = await database_1.default.ownerDocument.findMany({
                orderBy: { uploadedAt: 'desc' },
            });
            if (docs.length === 0) {
                await database_1.default.ownerDocument.createMany({
                    data: [
                        { name: 'Owner_Operating_Agreement_2026.pdf', category: 'Legal', size: '2.4 MB' },
                        { name: 'Property_Tax_Assessment_Q2.pdf', category: 'Tax', size: '1.8 MB' },
                        { name: 'Monthly_Distribution_Statement_Jul2026.pdf', category: 'Statements', size: '3.1 MB' },
                        { name: 'Building_Insurance_Policy_2026.pdf', category: 'Insurance', size: '4.5 MB' },
                    ],
                });
                docs = await database_1.default.ownerDocument.findMany({
                    orderBy: { uploadedAt: 'desc' },
                });
            }
            const formatted = docs.map((d) => ({
                id: d.id,
                name: d.name,
                category: d.category,
                uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toISOString().split('T')[0] : '2026-07-20',
                size: d.size || '1.5 MB',
            }));
            return (0, apiResponse_1.sendSuccess)({ res, data: formatted });
        }
        catch (error) {
            next(error);
        }
    }
    async uploadOwnerDocument(req, res, next) {
        try {
            const { name, category, size } = req.body;
            const newDoc = await database_1.default.ownerDocument.create({
                data: {
                    name: name || 'Document.pdf',
                    category: category || 'Statements',
                    size: size || '1.5 MB',
                },
            });
            return (0, apiResponse_1.sendSuccess)({
                res,
                statusCode: 201,
                data: {
                    id: newDoc.id,
                    name: newDoc.name,
                    category: newDoc.category,
                    uploadedAt: new Date(newDoc.uploadedAt).toISOString().split('T')[0],
                    size: newDoc.size,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getOwnerMessages(req, res, next) {
        try {
            let msgs = await database_1.default.ownerMessage.findMany({
                orderBy: { createdAt: 'desc' },
            });
            if (msgs.length === 0) {
                await database_1.default.ownerMessage.createMany({
                    data: [
                        {
                            sender: 'Property Manager',
                            recipient: 'William Anderson (Owner)',
                            subject: 'Q2 Portfolio Performance Update',
                            body: 'Hello William, your Q2 property distribution has been processed and transferred successfully.',
                        },
                        {
                            sender: 'Maintenance Lead',
                            recipient: 'William Anderson (Owner)',
                            subject: 'Highland Heights Inspection Complete',
                            body: 'Routine HVAC & roof inspection at Highland Heights Portfolio has been successfully completed.',
                        },
                    ],
                });
                msgs = await database_1.default.ownerMessage.findMany({
                    orderBy: { createdAt: 'desc' },
                });
            }
            const formatted = msgs.map((m) => ({
                id: m.id,
                sender: m.sender,
                recipient: m.recipient,
                subject: m.subject,
                body: m.body,
                timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
            }));
            return (0, apiResponse_1.sendSuccess)({ res, data: formatted });
        }
        catch (error) {
            next(error);
        }
    }
    async composeOwnerMessage(req, res, next) {
        try {
            const { sender, recipient, subject, body } = req.body;
            const newMsg = await database_1.default.ownerMessage.create({
                data: {
                    sender: sender || 'William Anderson (Owner)',
                    recipient: recipient || 'Property Manager',
                    subject: subject || 'General Inquiry',
                    body: body || '',
                },
            });
            return (0, apiResponse_1.sendSuccess)({
                res,
                statusCode: 201,
                data: {
                    id: newMsg.id,
                    sender: newMsg.sender,
                    recipient: newMsg.recipient,
                    subject: newMsg.subject,
                    body: newMsg.body,
                    timestamp: new Date(newMsg.createdAt).toISOString(),
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getOwnerProfile(req, res, next) {
        try {
            let owner = await database_1.default.owner.findFirst();
            if (!owner) {
                owner = await database_1.default.owner.create({
                    data: {
                        name: 'William Anderson',
                        email: 'bill.a@investments.com',
                        phone: '(212) 555-0122',
                        streetAddress: '742 Evergreen Terrace, New York, NY',
                        payoutMethod: 'ACH/Direct Deposit',
                    },
                });
            }
            const [firstName = '', ...lastNameParts] = (owner.name || '').split(' ');
            const lastName = lastNameParts.join(' ');
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: {
                    id: owner.id,
                    firstName: firstName || 'William',
                    lastName: lastName || 'Anderson',
                    email: owner.email || 'bill.a@investments.com',
                    phone: owner.phone || '(212) 555-0122',
                    streetAddress: owner.streetAddress || '742 Evergreen Terrace, New York, NY',
                    bankName: 'Chase checking',
                    accountNumber: 'XXXX-XXXX-9822',
                    payoutStatus: 'Verified',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateOwnerProfile(req, res, next) {
        try {
            const { firstName, lastName, email, phone, streetAddress, bankName, accountNumber } = req.body;
            const inputName = [firstName, lastName].filter(Boolean).join(' ');
            let owner = await database_1.default.owner.findFirst();
            if (!owner) {
                owner = await database_1.default.owner.create({
                    data: {
                        name: inputName || 'William Anderson',
                        email: email || 'bill.a@investments.com',
                        phone: phone || '(212) 555-0122',
                        streetAddress: streetAddress || '742 Evergreen Terrace, New York, NY',
                    },
                });
            }
            else {
                owner = await database_1.default.owner.update({
                    where: { id: owner.id },
                    data: {
                        name: inputName || owner.name,
                        email: email || owner.email,
                        phone: phone || owner.phone,
                        streetAddress: streetAddress || owner.streetAddress,
                    },
                });
            }
            const [resFirstName = '', ...resLastNameParts] = (owner.name || '').split(' ');
            const resLastName = resLastNameParts.join(' ');
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: {
                    id: owner.id,
                    firstName: resFirstName || 'William',
                    lastName: resLastName || 'Anderson',
                    email: owner.email,
                    phone: owner.phone,
                    streetAddress: owner.streetAddress,
                    bankName: bankName || 'Chase checking',
                    accountNumber: accountNumber || 'XXXX-XXXX-9822',
                    payoutStatus: 'Verified',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getOwnerReports(req, res, next) {
        try {
            const properties = await database_1.default.property.findMany();
            let revenue = 0;
            for (const p of properties) {
                revenue += p.currentValue ? Math.round(p.currentValue / 500) : 2400;
            }
            if (revenue === 0)
                revenue = 24500;
            const expenses = Math.round(revenue * 0.15);
            const distribution = revenue - expenses;
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: {
                    revenue,
                    expenses,
                    occupancy: 95.0,
                    distribution,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getOwnerMetrics(req, res, next) {
        try {
            const totalProperties = await database_1.default.property.count();
            const properties = await database_1.default.property.findMany();
            let monthlyIncome = 0;
            for (const p of properties) {
                monthlyIncome += p.currentValue ? Math.round(p.currentValue / 500) : 2400;
            }
            if (monthlyIncome === 0)
                monthlyIncome = 24500;
            const monthlyExpenses = Math.round(monthlyIncome * 0.15);
            const netDistribution = monthlyIncome - monthlyExpenses;
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: {
                    monthlyIncome,
                    monthlyExpenses,
                    netDistribution,
                    netIncome: netDistribution,
                    totalProperties,
                    occupancyRate: 94.5,
                    totalUnits: totalProperties * 4,
                    activeLeases: totalProperties * 3,
                    pendingMaintenance: 2,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    // --- Super Admin Portal Views ---
    async getSuperAdminBilling(req, res, next) {
        try {
            const plan = await database_1.default.subscriptionPlan.findFirst();
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: plan || {
                    planName: 'Enterprise SaaS Tier',
                    price: 499,
                    billingCycle: 'Monthly',
                    nextInvoice: new Date('2026-08-01'),
                    usageLimit: 'Unlimited Properties',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getSuperAdminSecurity(req, res, next) {
        try {
            const policy = await database_1.default.securityPolicy.findFirst();
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: policy || {
                    mfaRequired: true,
                    sessionTimeout: 30,
                    passwordPolicy: 'Strong (min 10 chars, symbols)',
                    ipWhitelist: '192.168.1.0/24',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getSuperAdminAuditLogs(req, res, next) {
        try {
            const logs = await database_1.default.auditLog.findMany({
                include: {
                    user: true,
                },
                orderBy: { timestamp: 'desc' },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: logs });
        }
        catch (error) {
            next(error);
        }
    }
    // --- Collections & Other Operations ---
    async getCollectionPaymentPlans(req, res, next) {
        try {
            const plans = await database_1.default.paymentPlan.findMany({
                include: {
                    tenant: true,
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: plans });
        }
        catch (error) {
            next(error);
        }
    }
    async createCollectionPaymentPlan(req, res, next) {
        try {
            const { tenantId, totalAmount, frequency } = req.body;
            const plan = await database_1.default.paymentPlan.create({
                data: {
                    tenantId,
                    totalAmount: parseFloat(totalAmount),
                    frequency,
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: plan });
        }
        catch (error) {
            next(error);
        }
    }
    async getCrmLeads(req, res, next) {
        try {
            const leads = await database_1.default.crmLead.findMany({
                orderBy: { createdAt: 'desc' },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: leads });
        }
        catch (error) {
            next(error);
        }
    }
    async createCrmLead(req, res, next) {
        try {
            const { id, name, firstName, lastName, email, phone, source, budget, moveInDate, priority, assignedAgent, notes, property, companyId, status } = req.body;
            if (id) {
                const existing = await database_1.default.crmLead.findUnique({
                    where: { id },
                });
                if (existing) {
                    const lead = await database_1.default.crmLead.update({
                        where: { id },
                        data: {
                            name: name || undefined,
                            email: email || undefined,
                            phone: phone || undefined,
                            source: source || undefined,
                            status: status || undefined,
                            budget: budget !== undefined ? (budget ? Number(budget) : null) : undefined,
                            moveInDate: moveInDate !== undefined ? moveInDate : undefined,
                            priority: priority || undefined,
                            assignedAgent: assignedAgent !== undefined ? assignedAgent : undefined,
                            notes: notes !== undefined ? notes : undefined,
                            property: property !== undefined ? property : undefined,
                            companyId: companyId !== undefined ? companyId : undefined,
                        },
                    });
                    return (0, apiResponse_1.sendSuccess)({ res, data: lead });
                }
            }
            const resolvedName = name || [firstName, lastName].filter(Boolean).join(' ') || 'Unnamed Lead';
            const resolvedSource = source || 'Portal';
            const lead = await database_1.default.crmLead.create({
                data: {
                    name: resolvedName,
                    email,
                    phone,
                    source: resolvedSource,
                    status: status || 'New',
                    budget: budget ? Number(budget) : null,
                    moveInDate: moveInDate || null,
                    priority: priority || 'Medium',
                    assignedAgent: assignedAgent || null,
                    notes: notes || null,
                    property: property || null,
                    companyId: companyId || null,
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: lead });
        }
        catch (error) {
            next(error);
        }
    }
    async getScreeningReports(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const reports = await database_1.default.screeningReport.findMany({
                where: companyId ? { companyId } : {},
                include: { tenant: true },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: reports });
        }
        catch (error) {
            next(error);
        }
    }
    async createScreeningReport(req, res, next) {
        try {
            let { tenantId, firstName, lastName, email, phoneNumber, phone, unitId, creditScore, criminalPass, evictionPass, status } = req.body;
            const companyId = req.user?.companyId;
            if (!tenantId && email) {
                let tenant = await database_1.default.tenant.findUnique({
                    where: { email },
                });
                if (!tenant) {
                    tenant = await database_1.default.tenant.create({
                        data: {
                            firstName: firstName || 'Unnamed',
                            lastName: lastName || 'Tenant',
                            email,
                            phone: phoneNumber || phone || 'N/A',
                            unitId: unitId || null,
                            status: 'Pending',
                            companyId,
                        },
                    });
                }
                tenantId = tenant.id;
            }
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'BAD_REQUEST',
                        message: 'tenantId or email is required to create a screening report',
                    },
                });
            }
            const parsedCreditScore = parseInt(creditScore);
            const finalCreditScore = isNaN(parsedCreditScore) ? Math.floor(Math.random() * (800 - 680 + 1)) + 680 : parsedCreditScore;
            const report = await database_1.default.screeningReport.create({
                data: {
                    tenantId,
                    creditScore: finalCreditScore,
                    criminalPass: criminalPass ?? true,
                    evictionPass: evictionPass ?? true,
                    status: status || 'Approved',
                    companyId,
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: report });
        }
        catch (error) {
            next(error);
        }
    }
    async getViolations(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            const violations = await database_1.default.violation.findMany({
                where: companyId ? { companyId } : {},
                include: {
                    unit: {
                        include: { property: true },
                    },
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: violations });
        }
        catch (error) {
            next(error);
        }
    }
    async createViolation(req, res, next) {
        try {
            const { unitId, title, description, fineAmount } = req.body;
            const companyId = req.user?.companyId;
            const violation = await database_1.default.violation.create({
                data: {
                    unitId,
                    title,
                    description,
                    fineAmount: parseFloat(fineAmount || '0'),
                    companyId,
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: violation });
        }
        catch (error) {
            next(error);
        }
    }
    async getTenantMessages(req, res, next) {
        try {
            let messages = await database_1.default.tenantMessage.findMany({
                orderBy: { createdAt: 'desc' },
            });
            if (messages.length === 0) {
                await database_1.default.tenantMessage.createMany({
                    data: [
                        {
                            sender: 'Property Manager Office',
                            recipient: 'Alex Mercer',
                            subject: 'Upcoming HVAC Maintenance Inspection',
                            body: 'Hello Alex, please be advised that HVAC filters will be replaced this Thursday between 9 AM and 12 PM.',
                        },
                        {
                            sender: 'Leasing Office',
                            recipient: 'Alex Mercer',
                            subject: 'Parking Pass Renewal Notice',
                            body: 'Your reserved spot #42 parking pass is set to expire end of month. Reply to confirm auto-renewal.',
                        },
                    ],
                });
                messages = await database_1.default.tenantMessage.findMany({
                    orderBy: { createdAt: 'desc' },
                });
            }
            const threads = [
                {
                    id: 'thread-1',
                    senderName: 'Property Manager Office',
                    role: 'Management',
                    unread: false,
                    messages: messages
                        .filter((m) => m.sender === 'Property Manager Office' || m.recipient === 'Property Manager Office')
                        .map((m) => ({
                        id: m.id,
                        senderName: m.sender,
                        role: m.sender.includes('Resident') ? 'Tenant' : 'Management',
                        timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        date: new Date(m.createdAt).toISOString().split('T')[0],
                        subject: m.subject,
                        body: m.body,
                    })),
                },
                {
                    id: 'thread-2',
                    senderName: 'Leasing Office',
                    role: 'Leasing Desk',
                    unread: true,
                    messages: messages
                        .filter((m) => m.sender === 'Leasing Office' || m.recipient === 'Leasing Office')
                        .map((m) => ({
                        id: m.id,
                        senderName: m.sender,
                        role: m.sender.includes('Resident') ? 'Tenant' : 'Leasing Desk',
                        timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        date: new Date(m.createdAt).toISOString().split('T')[0],
                        subject: m.subject,
                        body: m.body,
                    })),
                },
            ];
            return (0, apiResponse_1.sendSuccess)({ res, data: threads });
        }
        catch (error) {
            next(error);
        }
    }
    // --- Invoices ---
    async getInvoices(req, res, next) {
        try {
            const invoices = await database_1.default.invoice.findMany({
                include: { tenant: true },
                orderBy: { dueDate: 'asc' },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: invoices });
        }
        catch (error) {
            next(error);
        }
    }
    async createTenantMessage(req, res, next) {
        try {
            const { sender, recipient, subject, body } = req.body;
            const newMsg = await database_1.default.tenantMessage.create({
                data: {
                    sender: sender || 'Alex Mercer (Resident)',
                    recipient: recipient || 'Property Manager Office',
                    subject: subject || 'General Inquiry',
                    body: body || '',
                },
            });
            return (0, apiResponse_1.sendSuccess)({
                res,
                statusCode: 201,
                data: {
                    id: newMsg.id,
                    senderName: newMsg.sender,
                    role: 'Tenant',
                    timestamp: new Date(newMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: new Date(newMsg.createdAt).toISOString().split('T')[0],
                    subject: newMsg.subject,
                    body: newMsg.body,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async createInvoice(req, res, next) {
        try {
            const { tenantId, amount, dueDate, status } = req.body;
            const tenant = await database_1.default.tenant.findUnique({
                where: { id: tenantId },
                include: { leases: { include: { property: true } } }
            });
            const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Unknown Tenant';
            const lease = tenant?.leases?.[0];
            const propertyId = lease?.propertyId || 'default-property';
            const propertyName = lease?.property?.name || 'Unknown Property';
            const invoice = await database_1.default.invoice.create({
                data: {
                    tenantId,
                    tenantName,
                    propertyId,
                    propertyName,
                    amount: parseFloat(amount || '0'),
                    balance: parseFloat(amount || '0'),
                    dueDate: String(dueDate || new Date().toISOString().split('T')[0]),
                    status: status || 'Sent',
                    lineItems: JSON.stringify(req.body.lineItems || []),
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: invoice });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteInvoice(req, res, next) {
        try {
            await database_1.default.invoice.delete({
                where: { id: req.params.id },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: { success: true } });
        }
        catch (error) {
            next(error);
        }
    }
    // --- Charges ---
    async getCharges(req, res, next) {
        try {
            const charges = await database_1.default.charge.findMany({
                include: { tenant: true },
                orderBy: { createdAt: 'desc' },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: charges });
        }
        catch (error) {
            next(error);
        }
    }
    async createCharge(req, res, next) {
        try {
            const { tenantId, title, amount, status } = req.body;
            const charge = await database_1.default.charge.create({
                data: {
                    tenantId,
                    title,
                    amount: parseFloat(amount || '0'),
                    status: status || 'Active',
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: charge });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteCharge(req, res, next) {
        try {
            await database_1.default.charge.delete({
                where: { id: req.params.id },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: { success: true } });
        }
        catch (error) {
            next(error);
        }
    }
    // --- Deposits ---
    async getDeposits(req, res, next) {
        try {
            const deposits = await database_1.default.deposit.findMany({
                include: { tenant: true },
                orderBy: { createdAt: 'desc' },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: deposits });
        }
        catch (error) {
            next(error);
        }
    }
    async getTenantNotifications(req, res, next) {
        try {
            let notes = await database_1.default.tenantNotification.findMany({
                orderBy: { createdAt: 'desc' },
            });
            if (notes.length === 0) {
                await database_1.default.tenantNotification.createMany({
                    data: [
                        {
                            title: 'Monthly Rent Statement Ready',
                            message: 'Your monthly rent invoice for August 2026 is available for download.',
                            type: 'info',
                        },
                        {
                            title: 'Maintenance Request Scheduled',
                            message: 'Work order #WO-1042 for HVAC repair is assigned for Thursday at 10 AM.',
                            type: 'success',
                        },
                        {
                            title: 'Package Arrived at Front Desk',
                            message: 'A parcel from Amazon Logistics is waiting at reception.',
                            type: 'warning',
                        },
                    ],
                });
                notes = await database_1.default.tenantNotification.findMany({
                    orderBy: { createdAt: 'desc' },
                });
            }
            const formatted = notes.map((n) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type || 'info',
                role: 'Tenant',
                read: n.read,
                timestamp: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: new Date(n.createdAt).toISOString().split('T')[0],
            }));
            return (0, apiResponse_1.sendSuccess)({ res, data: formatted });
        }
        catch (error) {
            next(error);
        }
    }
    async markTenantNotificationRead(req, res, next) {
        try {
            const id = req.params.id;
            if (id === 'all') {
                await database_1.default.tenantNotification.updateMany({
                    data: { read: true },
                });
            }
            else {
                await database_1.default.tenantNotification.update({
                    where: { id },
                    data: { read: true },
                });
            }
            return (0, apiResponse_1.sendSuccess)({ res, message: 'Notification mark as read' });
        }
        catch (error) {
            next(error);
        }
    }
    async clearTenantNotifications(req, res, next) {
        try {
            await database_1.default.tenantNotification.deleteMany({});
            return (0, apiResponse_1.sendSuccess)({ res, message: 'All notifications cleared' });
        }
        catch (error) {
            next(error);
        }
    }
    async getStaffProfile(req, res, next) {
        try {
            let staff = await database_1.default.staffProfile.findFirst();
            if (!staff) {
                staff = await database_1.default.staffProfile.create({
                    data: {
                        name: 'Marcus Vance',
                        specialist: 'Senior Maintenance Lead',
                        email: 'marcus.vance@apexpm.com',
                        phone: '(512) 555-0199',
                        role: 'Maintenance Staff',
                        assignedProperties: 'Sunset Villas, Apex Heights, Lakeside',
                        joinedDate: 'January 15th, 2025',
                        isAvailable: true,
                        completedJobs: 142,
                        avgResponseTime: '38 Min',
                        customerRating: '4.92 / 5.0',
                    },
                });
            }
            return (0, apiResponse_1.sendSuccess)({ res, data: staff });
        }
        catch (error) {
            next(error);
        }
    }
    async updateStaffProfile(req, res, next) {
        try {
            const { isAvailable, name, email, phone } = req.body;
            let staff = await database_1.default.staffProfile.findFirst();
            if (!staff) {
                staff = await database_1.default.staffProfile.create({
                    data: {
                        name: name || 'Marcus Vance',
                        specialist: 'Senior Maintenance Lead',
                        email: email || 'marcus.vance@apexpm.com',
                        phone: phone || '(512) 555-0199',
                        isAvailable: typeof isAvailable === 'boolean' ? isAvailable : true,
                    },
                });
            }
            else {
                staff = await database_1.default.staffProfile.update({
                    where: { id: staff.id },
                    data: {
                        ...(typeof isAvailable === 'boolean' && { isAvailable }),
                        ...(name && { name }),
                        ...(email && { email }),
                        ...(phone && { phone }),
                    },
                });
            }
            return (0, apiResponse_1.sendSuccess)({ res, data: staff });
        }
        catch (error) {
            next(error);
        }
    }
    async getStaffTasks(req, res, next) {
        try {
            const companyId = req.user?.companyId;
            let orders = await database_1.default.workOrder.findMany({
                where: companyId ? { companyId } : {},
                include: { property: true },
                orderBy: { createdAt: 'desc' },
            });
            const firstProperty = await database_1.default.property.findFirst({
                where: companyId ? { companyId } : {},
            });
            let propertyId = firstProperty?.id;
            if (!propertyId) {
                const owner = await database_1.default.owner.findFirst({
                    where: companyId ? { companyId } : {},
                });
                const newProp = await database_1.default.property.create({
                    data: {
                        name: 'Oakridge Heights',
                        address: '100 Main St, Austin, TX 78701',
                        streetAddress: '100 Main St',
                        city: 'Austin',
                        state: 'TX',
                        zip: '78701',
                        yearBuilt: 2018,
                        squareFootage: 12000,
                        purchasePrice: 1500000,
                        currentValue: 1800000,
                        ownerId: owner?.id || 'default-owner',
                        companyId,
                    },
                });
                propertyId = newProp.id;
            }
            if (orders.length === 0) {
                await database_1.default.workOrder.createMany({
                    data: [
                        {
                            title: 'HVAC Air Conditioner Filter Replacement',
                            description: 'AC unit blowing warm air, filter replacement required.',
                            priority: 'High',
                            status: 'Open',
                            propertyId: propertyId,
                            estimatedCost: 180,
                        },
                        {
                            title: 'Plumbing Sink Leak Repair',
                            description: 'Kitchen sink pipe leaking continuously.',
                            priority: 'Normal',
                            status: 'InProgress',
                            propertyId: propertyId,
                            estimatedCost: 120,
                        },
                        {
                            title: 'Electrical Panel Inspection & Outlet Repair',
                            description: 'Master bedroom outlet sparking.',
                            priority: 'Emergency',
                            status: 'Open',
                            propertyId: propertyId,
                            estimatedCost: 250,
                        },
                    ],
                });
            }
            if (!orders.some((o) => ['Completed', 'Closed', 'Rejected'].includes(o.status))) {
                await database_1.default.workOrder.createMany({
                    data: [
                        {
                            title: 'Water Heater Element Replacement',
                            description: 'Replaced faulty heating element and flushed 50 gal tank.',
                            priority: 'High',
                            status: 'Completed',
                            propertyId: propertyId,
                            estimatedCost: 350,
                            actualCost: 320,
                        },
                        {
                            title: 'Smoke Detector Battery Maintenance',
                            description: 'Replaced backup 9V batteries across building hallway sensors.',
                            priority: 'Normal',
                            status: 'Completed',
                            propertyId: propertyId,
                            estimatedCost: 80,
                            actualCost: 65,
                        },
                    ],
                });
            }
            orders = await database_1.default.workOrder.findMany({
                include: { property: true },
                orderBy: { createdAt: 'desc' },
            });
            const formatted = orders.map((wo, index) => ({
                id: wo.id,
                workOrderNumber: `WO-${1001 + index}`,
                propertyName: wo.property?.name || 'Oakridge Heights',
                unitNumber: 'Unit 402',
                issue: wo.title,
                category: wo.title.toLowerCase().includes('hvac') ? 'HVAC' : wo.title.toLowerCase().includes('plumbing') ? 'Plumbing' : 'Electrical',
                priority: wo.priority === 'Normal' ? 'Medium' : wo.priority || 'Medium',
                status: wo.status === 'Open' ? 'New' : wo.status === 'InProgress' ? 'In Progress' : wo.status === 'Completed' ? 'Completed' : wo.status === 'Closed' ? 'Closed' : wo.status === 'Rejected' ? 'Rejected' : wo.status === 'Assigned' ? 'Assigned' : wo.status || 'New',
                assignedTechnician: 'Technician Lead 1',
                dueDate: '2026-07-30',
                createdAt: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : '2026-07-25',
                description: wo.description || '',
                estimatedCost: wo.estimatedCost || 150,
                actualCost: wo.actualCost || 0,
                rejectReason: wo.rejectReason || null,
                resolutionNotes: wo.resolutionNotes || null,
            }));
            return (0, apiResponse_1.sendSuccess)({ res, data: formatted });
        }
        catch (error) {
            next(error);
        }
    }
    async updateStaffTaskStatus(req, res, next) {
        try {
            const id = req.params.id;
            const { status, actualCost, rejectReason, resolutionNotes } = req.body;
            // Map frontend status string → Prisma WorkOrderStatus enum value
            const statusMap = {
                'Open': 'Open',
                'New': 'Open',
                'Assigned': 'Assigned',
                'Scheduled': 'Assigned',
                'Draft': 'Open',
                'In Progress': 'InProgress',
                'In_Progress': 'InProgress',
                'InProgress': 'InProgress',
                'Completed': 'Completed',
                'Rejected': 'Rejected',
                'Cancelled': 'Cancelled',
                'Closed': 'Closed',
            };
            const mappedStatus = status ? (statusMap[status] ?? status) : undefined;
            const order = await database_1.default.workOrder.update({
                where: { id },
                data: {
                    ...(mappedStatus && { status: mappedStatus }),
                    ...(actualCost !== undefined && actualCost !== null && { actualCost: parseFloat(String(actualCost)) }),
                    ...(rejectReason && { rejectReason }),
                    ...(resolutionNotes && { resolutionNotes }),
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: order });
        }
        catch (error) {
            next(error);
        }
    }
    async createDeposit(req, res, next) {
        try {
            const { tenantId, amount, status } = req.body;
            const deposit = await database_1.default.deposit.create({
                data: {
                    tenantId,
                    amount: parseFloat(amount || '0'),
                    status: status || 'Held',
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: deposit });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteDeposit(req, res, next) {
        try {
            await database_1.default.deposit.delete({
                where: { id: req.params.id },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: { success: true } });
        }
        catch (error) {
            next(error);
        }
    }
    // --- Expenses ---
    async getExpenses(req, res, next) {
        try {
            const expenses = await database_1.default.expense.findMany({
                orderBy: { date: 'desc' },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: expenses });
        }
        catch (error) {
            next(error);
        }
    }
    async createExpense(req, res, next) {
        try {
            const { category, amount, date, description } = req.body;
            const parsedAmount = parseFloat(amount || '0');
            const companyId = req.user?.companyId;
            const expense = await database_1.default.$transaction(async (tx) => {
                const exp = await tx.expense.create({
                    data: {
                        category,
                        amount: parsedAmount,
                        date: new Date(date || Date.now()),
                        description: description || '',
                    },
                });
                // 1. Debit (Increase) Expense account: e.g. "5010" or first Account of type "Expense"
                const expenseAccount = await tx.coAAccount.findFirst({
                    where: companyId
                        ? { companyId, OR: [{ accountCode: '5010' }, { type: 'Expense' }] }
                        : { OR: [{ accountCode: '5010' }, { type: 'Expense' }] }
                });
                if (expenseAccount) {
                    await tx.coAAccount.update({
                        where: { id: expenseAccount.id },
                        data: { balance: { increment: parsedAmount } }
                    });
                }
                // 2. Credit (Decrease) Checking Account: e.g. "1010" or first Account of type "Asset"
                const checkingAccount = await tx.coAAccount.findFirst({
                    where: companyId
                        ? { companyId, OR: [{ accountCode: '1010' }, { type: 'Asset' }] }
                        : { OR: [{ accountCode: '1010' }, { type: 'Asset' }] }
                });
                if (checkingAccount) {
                    await tx.coAAccount.update({
                        where: { id: checkingAccount.id },
                        data: { balance: { decrement: parsedAmount } }
                    });
                }
                return exp;
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: expense });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteExpense(req, res, next) {
        try {
            await database_1.default.expense.delete({
                where: { id: req.params.id },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: { success: true } });
        }
        catch (error) {
            next(error);
        }
    }
    // --- Maintenance Requests ---
    async getMaintenanceRequests(req, res, next) {
        try {
            const reqs = await database_1.default.maintenanceRequest.findMany({
                orderBy: { createdAt: 'desc' },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: reqs });
        }
        catch (error) {
            next(error);
        }
    }
    async createMaintenanceRequest(req, res, next) {
        try {
            const { title, description, propertyName, unitNumber, priority, status } = req.body;
            const request = await database_1.default.maintenanceRequest.create({
                data: {
                    title,
                    description,
                    propertyName,
                    unitNumber,
                    priority: priority || 'Normal',
                    status: status || 'New',
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: request });
        }
        catch (error) {
            next(error);
        }
    }
    async updateMaintenanceRequest(req, res, next) {
        try {
            const { status, priority, title, description } = req.body;
            const request = await database_1.default.maintenanceRequest.update({
                where: { id: req.params.id },
                data: { status, priority, title, description },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: request });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteMaintenanceRequest(req, res, next) {
        try {
            await database_1.default.maintenanceRequest.delete({
                where: { id: req.params.id },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: { success: true } });
        }
        catch (error) {
            next(error);
        }
    }
    // --- Inspections ---
    async getInspections(req, res, next) {
        try {
            const inspections = await database_1.default.inspection.findMany({
                orderBy: { startedAt: 'asc' },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: inspections });
        }
        catch (error) {
            next(error);
        }
    }
    async createInspection(req, res, next) {
        try {
            const { status, date } = req.body;
            const count = await database_1.default.inspection.count();
            const formattedCount = String(count + 1).padStart(6, '0');
            const inspection = await database_1.default.inspection.create({
                data: {
                    inspectionNumber: `MI-${formattedCount}`,
                    status: status || 'DRAFT',
                    startedAt: date ? new Date(date) : new Date(),
                    templateName: 'Standard Template',
                    templateVersion: 1,
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: inspection });
        }
        catch (error) {
            next(error);
        }
    }
    async updateInspection(req, res, next) {
        try {
            const { status, date } = req.body;
            const inspection = await database_1.default.inspection.update({
                where: { id: req.params.id },
                data: {
                    status: status,
                    startedAt: date ? new Date(date) : undefined,
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: inspection });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteInspection(req, res, next) {
        try {
            await database_1.default.inspection.delete({
                where: { id: req.params.id },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: { success: true } });
        }
        catch (error) {
            next(error);
        }
    }
    // --- Income ---
    async getIncome(req, res, next) {
        try {
            const incomes = await database_1.default.income.findMany({
                orderBy: { date: 'desc' },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: incomes });
        }
        catch (error) {
            next(error);
        }
    }
    async createIncome(req, res, next) {
        try {
            const { category, amount, date, description, status } = req.body;
            const income = await database_1.default.income.create({
                data: {
                    category,
                    amount: parseFloat(amount || '0'),
                    date: new Date(date || Date.now()),
                    description: description || '',
                    status: status || 'Cleared',
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: income });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteIncome(req, res, next) {
        try {
            await database_1.default.income.delete({
                where: { id: req.params.id },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: { success: true } });
        }
        catch (error) {
            next(error);
        }
    }
    // --- Signatures ---
    async getSignatures(req, res, next) {
        try {
            const signatures = await database_1.default.signature.findMany({
                orderBy: { createdAt: 'desc' },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: signatures });
        }
        catch (error) {
            next(error);
        }
    }
    async createSignature(req, res, next) {
        try {
            const { documentName, documentId, expiresAt, signers } = req.body;
            let recipientName = req.body.recipientName;
            let recipientEmail = req.body.recipientEmail;
            if (!recipientName) {
                if (Array.isArray(signers) && signers.length > 0) {
                    recipientName = signers[0];
                }
                else if (typeof signers === 'string' && signers.trim()) {
                    recipientName = signers.trim();
                }
                else {
                    recipientName = 'Tenant / Signer';
                }
            }
            if (!recipientEmail) {
                recipientEmail = req.body.signerEmail || req.body.email || 'signer@example.com';
            }
            const signature = await database_1.default.signature.create({
                data: {
                    documentName: documentName || 'Document.pdf',
                    documentId: documentId || `doc-${Date.now()}`,
                    recipientName,
                    recipientEmail,
                    status: 'Sent',
                    expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });
            return (0, apiResponse_1.sendSuccess)({ res, statusCode: 201, data: signature });
        }
        catch (error) {
            next(error);
        }
    }
    async cancelSignature(req, res, next) {
        try {
            const signature = await database_1.default.signature.update({
                where: { id: req.params.id },
                data: { status: 'Cancelled' },
            });
            return (0, apiResponse_1.sendSuccess)({ res, data: signature });
        }
        catch (error) {
            next(error);
        }
    }
    async updateScreeningReport(req, res, next) {
        try {
            const id = req.params.id;
            const { status } = req.body;
            const updateData = { status };
            if (status === 'Completed') {
                updateData.creditScore = 720;
                updateData.criminalPass = true;
                updateData.evictionPass = true;
            }
            const report = await database_1.default.screeningReport.update({
                where: { id },
                data: updateData,
                include: { tenant: true },
            });
            if (status === 'Approved' && report.tenantId) {
                await database_1.default.tenant.update({
                    where: { id: report.tenantId },
                    data: { status: 'Active' },
                });
                if (report.tenant?.email) {
                    const app = await database_1.default.application.findFirst({
                        where: { email: report.tenant.email },
                    });
                    if (app) {
                        await database_1.default.application.update({
                            where: { id: app.id },
                            data: { status: 'Approved' },
                        });
                    }
                }
            }
            else if (status === 'Declined' && report.tenantId) {
                await database_1.default.tenant.update({
                    where: { id: report.tenantId },
                    data: { status: 'Inactive' },
                });
                if (report.tenant?.email) {
                    const app = await database_1.default.application.findFirst({
                        where: { email: report.tenant.email },
                    });
                    if (app) {
                        await database_1.default.application.update({
                            where: { id: app.id },
                            data: { status: 'Rejected' },
                        });
                    }
                }
            }
            return (0, apiResponse_1.sendSuccess)({ res, data: report });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PortalController = PortalController;
exports.portalController = new PortalController();
