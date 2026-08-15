"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.secondaryService = exports.SecondaryService = void 0;
const database_1 = __importDefault(require("../config/database"));
class SecondaryService {
    // Announcements
    async getAnnouncements(companyId) {
        return database_1.default.announcement.findMany({
            where: companyId ? { companyId } : {},
            orderBy: { createdAt: 'desc' },
        });
    }
    async createAnnouncement(data, companyId) {
        return database_1.default.announcement.create({
            data: {
                title: data.title,
                content: data.content,
                category: data.category || 'General',
                isPinned: data.isPinned || false,
                companyId,
            },
        });
    }
    // Insurance Policies
    async getInsurancePolicies(companyId) {
        return database_1.default.insurancePolicy.findMany({
            where: companyId ? { companyId } : {},
            include: { tenant: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createInsurancePolicy(data, companyId) {
        return database_1.default.insurancePolicy.create({
            data: {
                tenantId: data.tenantId,
                policyNumber: data.policyNumber,
                provider: data.provider,
                coverageAmount: data.coverageAmount,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                companyId,
            },
        });
    }
    // Promotions
    async getPromotions(companyId) {
        return database_1.default.promotion.findMany({
            where: companyId ? { companyId } : {},
            orderBy: { createdAt: 'desc' },
        });
    }
    async createPromotion(data, companyId) {
        return database_1.default.promotion.create({
            data: {
                code: data.code,
                discount: data.discount,
                duration: data.duration,
                maxUses: data.maxUses || 100,
                companyId,
            },
        });
    }
    // Notifications
    async getNotifications(companyId) {
        return database_1.default.notification.findMany({
            where: companyId ? { companyId } : {},
            orderBy: { createdAt: 'desc' },
        });
    }
    async markNotificationRead(id, companyId) {
        if (companyId) {
            const check = await database_1.default.notification.findFirst({ where: { id, companyId } });
            if (!check)
                throw new Error('Notification not found.');
        }
        return database_1.default.notification.update({
            where: { id },
            data: { read: true },
        });
    }
    // Documents
    async getDocuments(companyId) {
        return database_1.default.document.findMany({
            where: companyId ? { companyId } : {},
            orderBy: { createdAt: 'desc' },
        });
    }
    async createDocument(data, companyId) {
        return database_1.default.document.create({
            data: {
                name: data.name,
                category: data.category || 'General',
                fileUrl: data.fileUrl,
                fileSize: data.fileSize || '1.5 MB',
                uploadedBy: data.uploadedBy || 'Property Manager',
                companyId,
            },
        });
    }
    // AI Assistant Chat Response based on live DB metrics (Scoped by companyId)
    async processAiChat(prompt, companyId) {
        const propertyCount = await database_1.default.property.count({
            where: companyId ? { companyId } : {},
        });
        const unitCount = await database_1.default.unit.count({
            where: companyId ? { property: { companyId } } : {},
        });
        const occupiedUnits = await database_1.default.unit.count({
            where: {
                status: 'Occupied',
                ...(companyId ? { property: { companyId } } : {}),
            },
        });
        const tenantCount = await database_1.default.tenant.count({
            where: companyId ? { companyId } : {},
        });
        const occupancyRate = unitCount > 0 ? Math.round((occupiedUnits / unitCount) * 100) : 0;
        const queryLower = prompt.toLowerCase();
        let responseText = `I am your WhatsLandlord ERP AI Assistant. Currently, your portfolio consists of ${propertyCount} properties, ${unitCount} total units (${occupancyRate}% occupancy), and ${tenantCount} active tenants. How can I further assist with your property management operations?`;
        if (queryLower.includes('occupancy') || queryLower.includes('units')) {
            responseText = `Portfolio Occupancy Analysis: You have ${unitCount} total units across ${propertyCount} properties. Current occupied units: ${occupiedUnits} (${occupancyRate}% occupancy rate).`;
        }
        else if (queryLower.includes('tenant') || queryLower.includes('resident')) {
            responseText = `Tenant Overview: There are currently ${tenantCount} active tenants registered in your company.`;
        }
        else if (queryLower.includes('revenue') || queryLower.includes('financial') || queryLower.includes('expense')) {
            responseText = `Financial Summary: All transactions, rent payments, and chart of accounts are recorded live in your double-entry accounting ledger.`;
        }
        await database_1.default.aiChatLog.create({
            data: {
                prompt,
                response: responseText,
                companyId,
            },
        });
        return { prompt, response: responseText };
    }
}
exports.SecondaryService = SecondaryService;
exports.secondaryService = new SecondaryService();
