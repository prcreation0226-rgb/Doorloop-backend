"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalController = exports.PortalController = void 0;
const database_1 = __importDefault(require("../config/database"));
const apiResponse_1 = require("../utils/apiResponse");
class PortalController {
    // --- Helper to get tenant for logged in user ---
    async getTenantForUser(req) {
        const userEmail = req.user?.email;
        if (!userEmail)
            return null;
        return database_1.default.tenant.findFirst({
            where: { email: userEmail },
            include: {
                unit: {
                    include: {
                        property: true,
                    },
                },
                leases: {
                    include: {
                        property: true,
                        unit: true,
                    },
                    orderBy: { startDate: 'desc' },
                },
            },
        });
    }
    // --- Tenant Portal Views ---
    async getTenantLeases(req, res, next) {
        try {
            const tenant = await this.getTenantForUser(req);
            if (!tenant) {
                return (0, apiResponse_1.sendSuccess)({ res, data: [] });
            }
            const leases = await database_1.default.lease.findMany({
                where: { tenantId: tenant.id },
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
            const tenant = await this.getTenantForUser(req);
            if (!tenant || !tenant.leases || tenant.leases.length === 0) {
                return (0, apiResponse_1.sendSuccess)({ res, data: null });
            }
            const lease = tenant.leases[0];
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: {
                    id: lease.id,
                    propertyName: lease.property?.name || 'Property',
                    unitNumber: lease.unit ? `Unit ${lease.unit.unitNumber}` : 'Unassigned Unit',
                    rentAmount: lease.rentAmount || 0,
                    securityDeposit: lease.depositAmount || 0,
                    leaseStart: lease.startDate ? new Date(lease.startDate).toISOString().split('T')[0] : '',
                    leaseEnd: lease.endDate ? new Date(lease.endDate).toISOString().split('T')[0] : '',
                    status: lease.status || 'Active',
                    tenantName: `${tenant.firstName} ${tenant.lastName}`,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTenantMetrics(req, res, next) {
        try {
            const tenant = await this.getTenantForUser(req);
            if (!tenant) {
                return (0, apiResponse_1.sendSuccess)({
                    res,
                    data: {
                        currentRent: 0,
                        nextDueDate: 'N/A',
                        outstandingBalance: 0,
                        activeVisitors: 0,
                        packagesWaiting: 0,
                        leaseExpiration: 'N/A',
                    },
                });
            }
            const activeLease = tenant.leases && tenant.leases.length > 0 ? tenant.leases[0] : null;
            const rent = activeLease?.rentAmount || 0;
            const unpaidInvoices = await database_1.default.invoice.findMany({
                where: { tenantId: tenant.id, status: { in: ['Sent', 'Overdue', 'Partially Paid'] } },
            });
            const balance = unpaidInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: {
                    currentRent: rent,
                    nextDueDate: activeLease?.endDate ? new Date(activeLease.endDate).toISOString().split('T')[0] : 'N/A',
                    outstandingBalance: balance,
                    activeVisitors: 0,
                    packagesWaiting: 0,
                    leaseExpiration: activeLease?.endDate ? new Date(activeLease.endDate).toISOString().split('T')[0] : 'N/A',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTenantProfile(req, res, next) {
        try {
            const tenant = await this.getTenantForUser(req);
            if (!tenant) {
                return (0, apiResponse_1.sendSuccess)({
                    res,
                    data: {
                        id: 'none',
                        firstName: 'Tenant',
                        lastName: 'User',
                        email: req.user?.email || '',
                        phone: '',
                        unitNumber: 'N/A',
                        emergencyContact: 'N/A',
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
                    unitNumber: tenant.unit ? `Unit ${tenant.unit.unitNumber}` : 'Unassigned',
                    emergencyContact: 'Emergency Contact Available',
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
            const userEmail = req.user?.email;
            if (!userEmail)
                throw new Error('Unauthorized');
            let tenant = await database_1.default.tenant.findFirst({
                where: { email: userEmail },
                include: { unit: true },
            });
            if (!tenant) {
                throw new Error('Tenant profile not found for logged in email.');
            }
            tenant = await database_1.default.tenant.update({
                where: { id: tenant.id },
                data: {
                    firstName: firstName || tenant.firstName,
                    lastName: lastName || tenant.lastName,
                    email: email || tenant.email,
                    phone: phone || tenant.phone,
                },
                include: { unit: true },
            });
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: {
                    id: tenant.id,
                    firstName: tenant.firstName,
                    lastName: tenant.lastName,
                    email: tenant.email,
                    phone: tenant.phone,
                    unitNumber: tenant.unit ? `Unit ${tenant.unit.unitNumber}` : 'Unassigned',
                    emergencyContact: 'Emergency Contact Available',
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTenantMaintenance(req, res, next) {
        try {
            const tenant = await this.getTenantForUser(req);
            if (!tenant) {
                return (0, apiResponse_1.sendSuccess)({ res, data: [] });
            }
            const requests = await database_1.default.serviceRequest.findMany({
                where: { tenantId: tenant.id },
                orderBy: { createdAt: 'desc' },
            });
            const formatted = requests.map((sr) => ({
                id: sr.id,
                title: sr.title,
                propertyName: sr.propertyName || 'Property',
                unitName: tenant.unit ? `Unit ${tenant.unit.unitNumber}` : 'Unit',
                priority: sr.priority || 'Medium',
                status: sr.status || 'Submitted',
                date: sr.createdAt ? new Date(sr.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                description: sr.description || '',
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
            const tenant = await this.getTenantForUser(req);
            const { title, priority, description, preferredTime } = req.body;
            const propertyId = tenant?.unit?.propertyId || (await database_1.default.property.findFirst())?.id;
            if (!propertyId)
                throw new Error('No property available for maintenance request.');
            const propertyRec = await database_1.default.property.findUnique({ where: { id: propertyId } });
            const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Tenant';
            const newRequest = await database_1.default.serviceRequest.create({
                data: {
                    title: title || 'General Repair Request',
                    description: description || '',
                    priority: priority || 'Normal',
                    status: 'New',
                    category: 'General',
                    propertyId: propertyId,
                    propertyName: propertyRec?.name || 'Property',
                    unitNumber: tenant?.unit ? tenant.unit.unitNumber : '',
                    tenantId: tenant?.id || null,
                    tenantName: tenantName,
                    companyId: tenant?.companyId || null,
                    messages: '[]',
                },
            });
            return (0, apiResponse_1.sendSuccess)({
                res,
                statusCode: 201,
                data: {
                    id: newRequest.id,
                    title: newRequest.title,
                    propertyName: newRequest.propertyName,
                    unitName: tenant?.unit ? `Unit ${tenant.unit.unitNumber}` : 'Unit',
                    priority: newRequest.priority,
                    status: newRequest.status,
                    date: new Date(newRequest.createdAt).toISOString().split('T')[0],
                    description: newRequest.description,
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
            const tenant = await this.getTenantForUser(req);
            if (!tenant) {
                return (0, apiResponse_1.sendSuccess)({ res, data: [] });
            }
            const docs = await database_1.default.tenantDocument.findMany({
                where: { tenantId: tenant.id },
                orderBy: { uploadedAt: 'desc' },
            });
            const formatted = docs.map((d) => ({
                id: d.id,
                name: d.name,
                category: d.category,
                uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
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
            const tenant = await this.getTenantForUser(req);
            const { name, category, size } = req.body;
            const newDoc = await database_1.default.tenantDocument.create({
                data: {
                    name: name || 'Tenant_Document.pdf',
                    category: category || 'Rental Agreement',
                    size: size || '1.5 MB',
                    tenantId: tenant?.id || undefined,
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
    // --- Helper to get properties assigned to the logged-in owner ---
    async getPropertiesForOwner(req) {
        const userEmail = req.user?.email;
        if (!userEmail)
            return [];
        const owner = await database_1.default.owner.findFirst({
            where: { email: userEmail },
        });
        if (!owner)
            return [];
        return database_1.default.property.findMany({
            where: { ownerId: owner.id },
            include: { units: true, buildings: true },
        });
    }
    // --- Owner Portal Views ---
    async getOwnerFinancials(req, res, next) {
        try {
            const properties = await this.getPropertiesForOwner(req);
            const propertyIds = properties.map((p) => p.id);
            if (propertyIds.length === 0) {
                return (0, apiResponse_1.sendSuccess)({ res, data: [] });
            }
            const payments = await database_1.default.rentPayment.findMany({
                where: { propertyId: { in: propertyIds } },
                include: { property: true, tenant: true },
                orderBy: { paidDate: 'desc' },
            });
            const formatted = payments.map((p) => ({
                id: p.id,
                date: p.paidDate ? new Date(p.paidDate).toISOString().split('T')[0] : (p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
                propertyName: p.property?.name || 'Property',
                tenantName: p.tenant ? `${p.tenant.firstName} ${p.tenant.lastName}` : 'Resident',
                category: 'Rental Income',
                amount: p.amount,
                status: p.status || 'Cleared',
            }));
            return (0, apiResponse_1.sendSuccess)({ res, data: formatted });
        }
        catch (error) {
            next(error);
        }
    }
    async getOwnerDistributions(req, res, next) {
        try {
            const userEmail = req.user?.email;
            if (!userEmail)
                return (0, apiResponse_1.sendSuccess)({ res, data: [] });
            const owner = await database_1.default.owner.findFirst({ where: { email: userEmail } });
            if (!owner) {
                return (0, apiResponse_1.sendSuccess)({ res, data: [] });
            }
            const distributions = await database_1.default.ownerDistribution.findMany({
                where: { ownerId: owner.id },
                orderBy: { processedDate: 'desc' },
            });
            const formatted = distributions.map((d, idx) => ({
                id: d.id,
                distributionNumber: `DIST-${1000 + idx}`,
                propertyName: d.period || 'Assigned Property Asset',
                date: d.processedDate ? new Date(d.processedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
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
            const properties = await this.getPropertiesForOwner(req);
            const propertyIds = properties.map((p) => p.id);
            if (propertyIds.length === 0) {
                return (0, apiResponse_1.sendSuccess)({ res, data: [] });
            }
            const payments = await database_1.default.rentPayment.findMany({
                where: { propertyId: { in: propertyIds } },
            });
            const statements = properties.map((p) => {
                const propPayments = payments.filter((pay) => pay.propertyId === p.id);
                const income = propPayments.reduce((sum, pay) => sum + pay.amount, 0);
                const expenses = Math.round(income * 0.1);
                return {
                    id: `stmt-${p.id}`,
                    period: 'Current Period',
                    propertyName: p.name,
                    openingBalance: 0,
                    totalIncome: income,
                    totalExpenses: expenses,
                    netDistribution: income - expenses,
                    endingBalance: 0,
                    status: 'Published',
                    generatedDate: new Date().toISOString().split('T')[0],
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
            const properties = await this.getPropertiesForOwner(req);
            const propertyIds = properties.map((p) => p.id);
            if (propertyIds.length === 0) {
                return (0, apiResponse_1.sendSuccess)({ res, data: [] });
            }
            const workOrders = await database_1.default.workOrder.findMany({
                where: { propertyId: { in: propertyIds } },
                include: { property: true },
                orderBy: { createdAt: 'desc' },
            });
            const formatted = workOrders.map((wo) => ({
                id: wo.id,
                title: wo.title,
                propertyName: wo.property?.name || 'Property',
                unitName: 'Unit',
                priority: wo.priority || 'Normal',
                status: wo.status || 'Open',
                date: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                description: wo.description || '',
                estimatedCost: wo.estimatedCost || 0,
            }));
            return (0, apiResponse_1.sendSuccess)({ res, data: formatted });
        }
        catch (error) {
            next(error);
        }
    }
    async getOwnerDocuments(req, res, next) {
        try {
            const userEmail = req.user?.email;
            if (!userEmail)
                return (0, apiResponse_1.sendSuccess)({ res, data: [] });
            const owner = await database_1.default.owner.findFirst({ where: { email: userEmail } });
            if (!owner)
                return (0, apiResponse_1.sendSuccess)({ res, data: [] });
            const docs = await database_1.default.ownerDocument.findMany({
                where: { ownerId: owner.id },
                orderBy: { uploadedAt: 'desc' },
            });
            const formatted = docs.map((d) => ({
                id: d.id,
                name: d.name,
                category: d.category,
                uploadedAt: d.uploadedAt ? new Date(d.uploadedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
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
            const userEmail = req.user?.email;
            const owner = userEmail ? await database_1.default.owner.findFirst({ where: { email: userEmail } }) : null;
            const { name, category, size } = req.body;
            const newDoc = await database_1.default.ownerDocument.create({
                data: {
                    name: name || 'Document.pdf',
                    category: category || 'Statements',
                    size: size || '1.5 MB',
                    ownerId: owner?.id || undefined,
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
            const userEmail = req.user?.email;
            if (!userEmail)
                return (0, apiResponse_1.sendSuccess)({ res, data: [] });
            const owner = await database_1.default.owner.findFirst({ where: { email: userEmail } });
            if (!owner)
                return (0, apiResponse_1.sendSuccess)({ res, data: [] });
            const msgs = await database_1.default.ownerMessage.findMany({
                where: {
                    OR: [
                        { recipient: { contains: owner.name } },
                        { sender: { contains: owner.name } }
                    ]
                },
                orderBy: { createdAt: 'desc' },
            });
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
            const userEmail = req.user?.email;
            const owner = userEmail ? await database_1.default.owner.findFirst({ where: { email: userEmail } }) : null;
            const { sender, recipient, subject, body } = req.body;
            const newMsg = await database_1.default.ownerMessage.create({
                data: {
                    sender: sender || (owner ? `${owner.name} (Owner)` : 'Owner User'),
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
            const userEmail = req.user?.email;
            let owner = userEmail ? await database_1.default.owner.findFirst({ where: { email: userEmail } }) : null;
            if (!owner) {
                return (0, apiResponse_1.sendSuccess)({
                    res,
                    data: {
                        id: 'owner-none',
                        firstName: 'Owner',
                        lastName: 'User',
                        email: userEmail || '',
                        phone: '',
                        streetAddress: '',
                        bankName: 'N/A',
                        accountNumber: 'N/A',
                        payoutStatus: 'Pending',
                    },
                });
            }
            const [firstName = '', ...lastNameParts] = (owner.name || '').split(' ');
            const lastName = lastNameParts.join(' ');
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: {
                    id: owner.id,
                    firstName: firstName || 'Owner',
                    lastName: lastName || 'User',
                    email: owner.email,
                    phone: owner.phone || '',
                    streetAddress: owner.streetAddress || '',
                    bankName: 'Checking Account',
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
            const userEmail = req.user?.email;
            const { firstName, lastName, email, phone, streetAddress, bankName, accountNumber } = req.body;
            const inputName = [firstName, lastName].filter(Boolean).join(' ');
            let owner = userEmail ? await database_1.default.owner.findFirst({ where: { email: userEmail } }) : null;
            if (!owner) {
                throw new Error('Owner profile not found for logged in user email.');
            }
            owner = await database_1.default.owner.update({
                where: { id: owner.id },
                data: {
                    name: inputName || owner.name,
                    email: email || owner.email,
                    phone: phone || owner.phone,
                    streetAddress: streetAddress || owner.streetAddress,
                },
            });
            const [resFirstName = '', ...resLastNameParts] = (owner.name || '').split(' ');
            const resLastName = resLastNameParts.join(' ');
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: {
                    id: owner.id,
                    firstName: resFirstName || 'Owner',
                    lastName: resLastName || 'User',
                    email: owner.email,
                    phone: owner.phone,
                    streetAddress: owner.streetAddress,
                    bankName: bankName || 'Checking Account',
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
            const properties = await this.getPropertiesForOwner(req);
            const propertyIds = properties.map((p) => p.id);
            if (propertyIds.length === 0) {
                return (0, apiResponse_1.sendSuccess)({
                    res,
                    data: { revenue: 0, expenses: 0, occupancy: 0, distribution: 0 },
                });
            }
            const payments = await database_1.default.rentPayment.findMany({
                where: { propertyId: { in: propertyIds } },
            });
            const revenue = payments.reduce((sum, p) => sum + p.amount, 0);
            const expenses = Math.round(revenue * 0.1);
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
            const properties = await this.getPropertiesForOwner(req);
            const propertyIds = properties.map((p) => p.id);
            if (propertyIds.length === 0) {
                return (0, apiResponse_1.sendSuccess)({
                    res,
                    data: {
                        monthlyIncome: 0,
                        monthlyExpenses: 0,
                        netDistribution: 0,
                        netIncome: 0,
                        totalProperties: 0,
                        occupancyRate: 0,
                        totalUnits: 0,
                        activeLeases: 0,
                        pendingMaintenance: 0,
                    },
                });
            }
            const payments = await database_1.default.rentPayment.findMany({
                where: { propertyId: { in: propertyIds } },
            });
            const monthlyIncome = payments.reduce((sum, p) => sum + p.amount, 0);
            const monthlyExpenses = Math.round(monthlyIncome * 0.1);
            const netDistribution = monthlyIncome - monthlyExpenses;
            const totalProperties = properties.length;
            const totalUnits = properties.reduce((sum, p) => sum + (p.unitsCount || p.units?.length || 1), 0);
            return (0, apiResponse_1.sendSuccess)({
                res,
                data: {
                    monthlyIncome,
                    monthlyExpenses,
                    netDistribution,
                    netIncome: netDistribution,
                    totalProperties,
                    occupancyRate: 95.0,
                    totalUnits,
                    activeLeases: totalUnits,
                    pendingMaintenance: 0,
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
            let whereClause = {};
            if ((req.user?.role === 'Tenant' || req.user?.roleName === 'Tenant') && req.user?.email) {
                const tenant = await database_1.default.tenant.findFirst({ where: { email: req.user.email } });
                if (tenant) {
                    whereClause.tenantId = tenant.id;
                }
                else {
                    return (0, apiResponse_1.sendSuccess)({ res, data: [] });
                }
            }
            const invoices = await database_1.default.invoice.findMany({
                where: whereClause,
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
            const tenant = await this.getTenantForUser(req);
            const tenantFullName = tenant ? `${tenant.firstName} ${tenant.lastName} (Resident)` : 'Resident';
            const { sender, recipient, subject, body } = req.body;
            const newMsg = await database_1.default.tenantMessage.create({
                data: {
                    sender: sender || tenantFullName,
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
            let whereClause = {};
            if ((req.user?.role === 'Tenant' || req.user?.roleName === 'Tenant') && req.user?.email) {
                const tenant = await database_1.default.tenant.findFirst({ where: { email: req.user.email } });
                if (tenant) {
                    whereClause.tenantId = tenant.id;
                }
                else {
                    return (0, apiResponse_1.sendSuccess)({ res, data: [] });
                }
            }
            const charges = await database_1.default.charge.findMany({
                where: whereClause,
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
            let whereClause = {};
            if ((req.user?.role === 'Tenant' || req.user?.roleName === 'Tenant') && req.user?.email) {
                const tenant = await database_1.default.tenant.findFirst({ where: { email: req.user.email } });
                if (tenant) {
                    whereClause.tenantId = tenant.id;
                }
                else {
                    return (0, apiResponse_1.sendSuccess)({ res, data: [] });
                }
            }
            const deposits = await database_1.default.deposit.findMany({
                where: whereClause,
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
            const userEmail = req.user?.email;
            let vendor = null;
            if (userEmail) {
                vendor = await database_1.default.vendor.findFirst({ where: { email: userEmail } });
            }
            // Build query filter for ServiceRequests
            const srWhere = {};
            if (companyId) {
                srWhere.companyId = companyId;
            }
            if (vendor) {
                srWhere.OR = [
                    { assignedVendorId: vendor.id },
                    { assignedVendorName: vendor.contactName || vendor.companyName },
                    { assignedTechnician: vendor.contactName }
                ];
                if (companyId) {
                    srWhere.companyId = companyId;
                }
            }
            // Build query filter for WorkOrders
            const woWhere = {};
            if (companyId) {
                woWhere.companyId = companyId;
            }
            if (vendor) {
                woWhere.vendorId = vendor.id;
            }
            // 1. Fetch ServiceRequests
            const serviceRequests = await database_1.default.serviceRequest.findMany({
                where: Object.keys(srWhere).length > 0 ? srWhere : (companyId ? { companyId } : {}),
                orderBy: { createdAt: 'desc' },
            });
            // 2. Fetch WorkOrders
            const workOrders = await database_1.default.workOrder.findMany({
                where: Object.keys(woWhere).length > 0 ? woWhere : (companyId ? { companyId } : {}),
                include: { property: true, vendor: true },
                orderBy: { createdAt: 'desc' },
            });
            const formattedServiceRequests = serviceRequests.map((sr) => ({
                id: sr.id,
                workOrderNumber: `SR-${sr.id.slice(0, 8).toUpperCase()}`,
                propertyName: sr.propertyName || 'Property',
                unitNumber: sr.unitNumber ? (sr.unitNumber.toLowerCase().includes('unit') ? sr.unitNumber : `Unit ${sr.unitNumber}`) : '',
                issue: sr.title,
                category: sr.category || (sr.title.toLowerCase().includes('hvac') ? 'HVAC' : sr.title.toLowerCase().includes('plumbing') ? 'Plumbing' : 'General'),
                priority: sr.priority === 'Normal' ? 'Medium' : sr.priority || 'Medium',
                status: sr.status === 'Open' || sr.status === 'New' || sr.status === 'Submitted' ? 'New' : sr.status === 'InProgress' || sr.status === 'In Progress' ? 'In Progress' : sr.status === 'Completed' ? 'Completed' : sr.status === 'Closed' ? 'Closed' : sr.status === 'Rejected' ? 'Rejected' : sr.status === 'Assigned' ? 'Assigned' : sr.status || 'New',
                assignedTechnician: sr.assignedVendorName || sr.assignedTechnician || (vendor ? (vendor.contactName || vendor.companyName) : 'Maintenance Staff'),
                dueDate: sr.scheduledDate || (sr.createdAt ? new Date(sr.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
                createdAt: sr.createdAt ? new Date(sr.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                description: sr.description || '',
                estimatedCost: sr.estimatedCost || sr.cost || 0,
                actualCost: sr.cost || 0,
                labourCost: 0,
                materialsCost: 0,
                extraExpenses: 0,
                rejectReason: sr.notes || null,
                resolutionNotes: null,
            }));
            const formattedWorkOrders = workOrders.map((wo, index) => ({
                id: wo.id,
                workOrderNumber: `WO-${1001 + index}`,
                propertyName: wo.property?.name || 'Property',
                unitNumber: 'Unit 101',
                issue: wo.title,
                category: wo.title.toLowerCase().includes('hvac') ? 'HVAC' : wo.title.toLowerCase().includes('plumbing') ? 'Plumbing' : 'General',
                priority: wo.priority === 'Normal' ? 'Medium' : wo.priority || 'Medium',
                status: wo.status === 'Open' || wo.status === 'Submitted' ? 'New' : wo.status === 'InProgress' ? 'In Progress' : wo.status === 'Completed' ? 'Completed' : wo.status === 'Closed' ? 'Closed' : wo.status === 'Rejected' ? 'Rejected' : wo.status === 'Assigned' ? 'Assigned' : wo.status || 'New',
                assignedTechnician: wo.vendor?.contactName || wo.vendor?.companyName || 'Maintenance Staff',
                dueDate: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                createdAt: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                description: wo.description || '',
                estimatedCost: wo.estimatedCost || 0,
                actualCost: wo.actualCost || 0,
                labourCost: wo.labourCost || 0,
                materialsCost: wo.materialsCost || 0,
                extraExpenses: wo.extraExpenses || 0,
                rejectReason: wo.rejectReason || null,
                resolutionNotes: wo.resolutionNotes || null,
            }));
            const combined = [...formattedServiceRequests, ...formattedWorkOrders];
            return (0, apiResponse_1.sendSuccess)({ res, data: combined });
        }
        catch (error) {
            next(error);
        }
    }
    async updateStaffTaskStatus(req, res, next) {
        try {
            const id = req.params.id;
            const { status, actualCost, rejectReason, resolutionNotes, labourCost, materialsCost, extraExpenses } = req.body;
            const statusMap = {
                'Open': 'Open',
                'New': 'Submitted',
                'Submitted': 'Submitted',
                'Approved': 'Approved',
                'Assigned': 'Assigned',
                'Accepted': 'Accepted',
                'InProgress': 'InProgress',
                'In Progress': 'InProgress',
                'In_Progress': 'InProgress',
                'Completed': 'Completed',
                'Rejected': 'Rejected',
                'Cancelled': 'Cancelled',
                'Closed': 'Closed',
                'Returned': 'Returned',
            };
            const mappedStatus = status ? (statusMap[status] ?? status) : undefined;
            const finalLabour = labourCost !== undefined && labourCost !== null ? parseFloat(String(labourCost)) : 0;
            const finalMaterials = materialsCost !== undefined && materialsCost !== null ? parseFloat(String(materialsCost)) : 0;
            const finalExtra = extraExpenses !== undefined && extraExpenses !== null ? parseFloat(String(extraExpenses)) : 0;
            const computedCost = (labourCost !== undefined || materialsCost !== undefined || extraExpenses !== undefined)
                ? (finalLabour + finalMaterials + finalExtra)
                : (actualCost !== undefined && actualCost !== null ? parseFloat(String(actualCost)) : undefined);
            // First check ServiceRequest table
            const existingSr = await database_1.default.serviceRequest.findUnique({ where: { id } });
            if (existingSr) {
                const srStatus = mappedStatus === 'InProgress' ? 'In Progress' : mappedStatus;
                const updatedSr = await database_1.default.serviceRequest.update({
                    where: { id },
                    data: {
                        ...(srStatus && { status: srStatus }),
                        ...(computedCost !== undefined && { cost: computedCost }),
                        ...(rejectReason && { notes: rejectReason }),
                    },
                });
                return (0, apiResponse_1.sendSuccess)({ res, data: updatedSr });
            }
            // Check WorkOrder table
            const existingWo = await database_1.default.workOrder.findUnique({ where: { id } });
            if (existingWo) {
                const order = await database_1.default.workOrder.update({
                    where: { id },
                    data: {
                        ...(mappedStatus && { status: mappedStatus }),
                        ...(computedCost !== undefined && { actualCost: computedCost }),
                        ...(labourCost !== undefined && labourCost !== null && { labourCost: parseFloat(String(labourCost)) }),
                        ...(materialsCost !== undefined && materialsCost !== null && { materialsCost: parseFloat(String(materialsCost)) }),
                        ...(extraExpenses !== undefined && extraExpenses !== null && { extraExpenses: parseFloat(String(extraExpenses)) }),
                        ...(rejectReason && { rejectReason }),
                        ...(resolutionNotes && { resolutionNotes }),
                        ...(mappedStatus === 'Completed' && { completedAt: new Date() }),
                    },
                });
                return (0, apiResponse_1.sendSuccess)({ res, data: order });
            }
            return res.status(404).json({ success: false, error: { message: 'Task not found' } });
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
            const { documentName, documentId, recipientName, recipientEmail, expiresAt } = req.body;
            const signature = await database_1.default.signature.create({
                data: {
                    documentName,
                    documentId,
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
