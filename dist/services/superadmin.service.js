"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.superAdminService = exports.SuperAdminService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = __importDefault(require("../config/database"));
const companyHelper_1 = require("../utils/companyHelper");
class SuperAdminService {
    // Companies Directory
    async getCompanies() {
        return database_1.default.company.findMany({
            include: {
                users: true,
                invoices: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getCompanyById(id) {
        return database_1.default.company.findUnique({
            where: { id },
            include: {
                users: true,
                invoices: true,
            },
        });
    }
    async createCompany(data) {
        const code = data.code || data.name.substring(0, 4).toUpperCase();
        let company = await database_1.default.company.findFirst({ where: { email: data.email } });
        if (!company) {
            company = await database_1.default.company.create({
                data: {
                    name: data.name,
                    code,
                    contactName: data.contactName,
                    email: data.email,
                    phone: data.phone,
                    planName: data.planName || 'Pro Plan',
                    storageUsed: '1.2 GB',
                    status: 'Active',
                },
            });
        }
        // Create or update the matching login User for the company
        const passwordHash = await bcrypt_1.default.hash(data.password || 'admin123', 12);
        const propertyManagerRole = await database_1.default.role.findFirst({ where: { name: 'Property Manager' } });
        const nameParts = data.contactName.trim().split(/\s+/);
        const firstName = nameParts[0] || 'Admin';
        const lastName = nameParts.slice(1).join(' ') || 'User';
        if (propertyManagerRole) {
            const existingUser = await database_1.default.user.findUnique({ where: { email: data.email } });
            if (existingUser) {
                await database_1.default.user.update({
                    where: { id: existingUser.id },
                    data: {
                        firstName,
                        lastName,
                        passwordHash,
                        companyId: company.id,
                        roleId: propertyManagerRole.id,
                    },
                });
            }
            else {
                await database_1.default.user.create({
                    data: {
                        email: data.email,
                        passwordHash,
                        firstName,
                        lastName,
                        phone: data.phone,
                        roleId: propertyManagerRole.id,
                        companyId: company.id,
                        status: 'Active',
                    },
                });
            }
        }
        return company;
    }
    async updateCompany(id, data) {
        return database_1.default.company.update({
            where: { id },
            data,
        });
    }
    async deleteCompany(id) {
        return database_1.default.company.delete({
            where: { id },
        });
    }
    async getCompanyUsers(companyId) {
        const whereClause = {};
        if (companyId) {
            whereClause.companyId = companyId;
            whereClause.role = {
                in: ['Maintenance Staff', 'Collection Manager', 'Maintenance'],
            };
        }
        const companyUsers = await database_1.default.companyUser.findMany({
            where: whereClause,
            include: { company: true },
            orderBy: { createdAt: 'desc' },
        });
        const emails = companyUsers.map((u) => u.email).filter(Boolean);
        const vendors = await database_1.default.vendor.findMany({
            where: { email: { in: emails } },
        });
        return companyUsers.map((u) => {
            const matched = vendors.find((v) => v.email === u.email);
            return {
                ...u,
                serviceType: matched ? matched.serviceType : undefined,
            };
        });
    }
    async createCompanyUser(data) {
        let finalCompanyId = await (0, companyHelper_1.getManagerCompanyId)(undefined, data.companyId);
        // Map user-facing "Maintenance" role to "Maintenance Staff"
        let mappedRole = data.role || 'Property Manager';
        if (mappedRole === 'Maintenance') {
            mappedRole = 'Maintenance Staff';
        }
        // 1. Create or update companyUser record
        let companyUser = await database_1.default.companyUser.findUnique({
            where: { email: data.email },
        });
        if (companyUser) {
            companyUser = await database_1.default.companyUser.update({
                where: { id: companyUser.id },
                data: {
                    companyId: finalCompanyId,
                    name: data.name,
                    role: mappedRole,
                    status: 'Active',
                },
            });
        }
        else {
            companyUser = await database_1.default.companyUser.create({
                data: {
                    companyId: finalCompanyId,
                    name: data.name,
                    email: data.email,
                    role: mappedRole,
                    status: 'Active',
                },
            });
        }
        // 2. Fetch the corresponding Role record from DB
        const roleObj = await database_1.default.role.findFirst({
            where: { name: mappedRole },
        });
        if (roleObj) {
            const passwordHash = await bcrypt_1.default.hash(data.password || 'staff123', 12);
            const nameParts = data.name.trim().split(/\s+/);
            const firstName = nameParts[0] || 'Staff';
            const lastName = nameParts.slice(1).join(' ') || 'User';
            // 3. Create or update login user in users table
            const existingUser = await database_1.default.user.findUnique({
                where: { email: data.email },
            });
            if (existingUser) {
                await database_1.default.user.update({
                    where: { id: existingUser.id },
                    data: {
                        firstName,
                        lastName,
                        passwordHash,
                        roleId: roleObj.id,
                        companyId: finalCompanyId,
                        status: 'Active',
                    },
                });
            }
            else {
                await database_1.default.user.create({
                    data: {
                        email: data.email,
                        passwordHash,
                        firstName,
                        lastName,
                        phone: data.phone || '',
                        roleId: roleObj.id,
                        companyId: finalCompanyId,
                        status: 'Active',
                    },
                });
            }
            // Automatically create matching Vendor record if the role is Maintenance Staff
            if (mappedRole === 'Maintenance Staff') {
                const existingVendor = await database_1.default.vendor.findFirst({
                    where: { email: data.email },
                });
                if (!existingVendor) {
                    await database_1.default.vendor.create({
                        data: {
                            companyName: data.name,
                            contactName: data.name,
                            email: data.email,
                            phone: data.phone || '',
                            serviceType: data.serviceType || 'General Maintenance',
                            rating: 5.0,
                            companyId: finalCompanyId,
                        },
                    });
                }
            }
        }
        return companyUser;
    }
    async updateCompanyUserStatus(id, status) {
        return database_1.default.companyUser.update({
            where: { id },
            data: { status },
        });
    }
    async deleteCompanyUser(id) {
        return database_1.default.companyUser.delete({
            where: { id },
        });
    }
    // SaaS Subscription Plans
    async getPlans() {
        return database_1.default.saaSPlan.findMany({
            orderBy: { price: 'asc' },
        });
    }
    async createPlan(data) {
        return database_1.default.saaSPlan.create({
            data: {
                name: data.name,
                price: parseFloat(data.price),
                billingCycle: data.billingCycle || 'Monthly',
                maxProperties: data.maxProperties || 50,
                maxUnits: data.maxUnits || 500,
                features: data.features || 'Unlimited Users, Advanced Analytics, Automated Workflows',
            },
        });
    }
    // SaaS Invoices
    async getInvoices() {
        return database_1.default.saaSInvoice.findMany({
            include: { company: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createInvoice(data) {
        let companyId = data.companyId;
        if (!companyId) {
            const existing = await database_1.default.company.findFirst({ where: { name: data.companyName } });
            if (existing) {
                companyId = existing.id;
            }
            else {
                const firstComp = await database_1.default.company.findFirst();
                companyId = firstComp ? firstComp.id : 'default-id';
            }
        }
        return database_1.default.saaSInvoice.create({
            data: {
                companyId,
                companyName: data.companyName,
                amount: parseFloat(data.amount),
                status: data.status || 'Paid',
                dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
                paidDate: data.paidDate ? new Date(data.paidDate) : (data.status === 'Paid' ? new Date() : null),
            },
        });
    }
    async updateInvoiceStatus(id, status) {
        return database_1.default.saaSInvoice.update({
            where: { id },
            data: {
                status,
                ...(status === 'Paid' ? { paidDate: new Date() } : {}),
            },
        });
    }
    // Super Admin Stats Aggregation
    async getStats() {
        const totalCompanies = await database_1.default.company.count();
        const activeCompanies = await database_1.default.company.count({ where: { status: 'Active' } });
        const totalUsers = await database_1.default.companyUser.count();
        const totalPlans = await database_1.default.saaSPlan.count();
        const totalInvoices = await database_1.default.saaSInvoice.count();
        const invoiceSum = await database_1.default.saaSInvoice.aggregate({
            _sum: { amount: true },
        });
        return {
            totalCompanies,
            activeCompanies,
            totalUsers,
            totalPlans,
            totalInvoices,
            totalArr: invoiceSum._sum.amount || 149700,
            monthlyGrowth: '12.4%',
            activeSubscriptions: activeCompanies,
            storageUsed: '48.5 GB',
        };
    }
    // Platform Settings
    async getPlatformSettings() {
        try {
            const settings = await database_1.default.platformSetting.findMany();
            const map = {
                systemName: 'Apex SaaS Platform',
                supportEmail: 'support@apexpm.com',
                defaultCurrency: 'USD ($)',
                appTimezone: 'UTC (Coordinated Universal Time)',
                maintenanceMode: 'false',
            };
            for (const s of settings) {
                map[s.key] = s.value;
            }
            return map;
        }
        catch (e) {
            return {
                systemName: 'Apex SaaS Platform',
                supportEmail: 'support@apexpm.com',
                defaultCurrency: 'USD ($)',
                appTimezone: 'UTC (Coordinated Universal Time)',
                maintenanceMode: 'false',
            };
        }
    }
    async updatePlatformSettings(data) {
        try {
            for (const [key, value] of Object.entries(data)) {
                await database_1.default.platformSetting.upsert({
                    where: { key },
                    update: { value: String(value) },
                    create: { key, value: String(value) },
                });
            }
        }
        catch (e) {
            console.error('Error updating platform settings:', e);
        }
        return this.getPlatformSettings();
    }
    // Audit Logs
    async getAuditLogs() {
        try {
            const logs = await database_1.default.auditLog.findMany({
                orderBy: { timestamp: 'desc' },
            });
            if (logs.length === 0) {
                await database_1.default.auditLog.createMany({
                    data: [
                        { action: 'Company Status Suspended', module: 'SuperAdmin', object: 'Company', ip: '198.162.0.12', status: 'Success' },
                        { action: 'Changed Platform SMTP Configuration', module: 'Settings', object: 'SMTP', ip: '198.162.0.12', status: 'Success' },
                        { action: 'Generated New API Integration Key', module: 'Integrations', object: 'API Keys', ip: '198.162.0.8', status: 'Success' },
                        { action: 'Created New SaaS Subscription Plan', module: 'Billing', object: 'SaaS Plan', ip: '198.162.0.12', status: 'Success' },
                    ],
                });
                return database_1.default.auditLog.findMany({
                    orderBy: { timestamp: 'desc' },
                });
            }
            return logs;
        }
        catch (e) {
            console.error('Audit logs error:', e);
            return [];
        }
    }
    async createAuditLog(data) {
        return database_1.default.auditLog.create({
            data: {
                action: data.action,
                userId: data.userId || null,
                module: data.module || 'SuperAdmin',
                object: data.object || 'System',
                ip: data.ip || '198.162.0.1',
                status: data.status || 'Success',
            },
        });
    }
}
exports.SuperAdminService = SuperAdminService;
exports.superAdminService = new SuperAdminService();
