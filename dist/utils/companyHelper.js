"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getManagerCompanyId = getManagerCompanyId;
exports.autoHealMissingCompanyIds = autoHealMissingCompanyIds;
const database_js_1 = __importDefault(require("../config/database.js"));
async function getManagerCompanyId(req, explicitId) {
    if (explicitId && typeof explicitId === 'string' && explicitId.trim() !== '' && explicitId !== 'null') {
        return explicitId;
    }
    if (req?.user?.companyId) {
        return req.user.companyId;
    }
    // Find manager user with companyId
    const managerUser = await database_js_1.default.user.findFirst({
        where: {
            companyId: { not: null },
        },
        select: { companyId: true },
    });
    if (managerUser?.companyId) {
        return managerUser.companyId;
    }
    // Find first company in DB
    const firstCompany = await database_js_1.default.company.findFirst();
    if (firstCompany) {
        return firstCompany.id;
    }
    // Auto-create default manager company if DB is empty
    const defaultCompany = await database_js_1.default.company.create({
        data: {
            name: 'Apex Property Management',
            code: 'APEX-001',
            contactName: 'Property Manager',
            email: 'manager@apexpm.com',
            phone: '555-0100',
        },
    });
    return defaultCompany.id;
}
async function autoHealMissingCompanyIds() {
    try {
        const defaultCompanyId = await getManagerCompanyId();
        if (!defaultCompanyId)
            return;
        await database_js_1.default.vendor.updateMany({
            where: { companyId: null },
            data: { companyId: defaultCompanyId },
        });
        await database_js_1.default.owner.updateMany({
            where: { companyId: null },
            data: { companyId: defaultCompanyId },
        });
        await database_js_1.default.tenant.updateMany({
            where: { companyId: null },
            data: { companyId: defaultCompanyId },
        });
        await database_js_1.default.user.updateMany({
            where: { companyId: null },
            data: { companyId: defaultCompanyId },
        });
        await database_js_1.default.property.updateMany({
            where: { companyId: null },
            data: { companyId: defaultCompanyId },
        });
        await database_js_1.default.lease.updateMany({
            where: { companyId: null },
            data: { companyId: defaultCompanyId },
        });
        // CompanyUser model has non-nullable companyId
        console.log(`[AutoHeal] Successfully assigned default manager companyId (${defaultCompanyId}) to all existing null records.`);
    }
    catch (error) {
        console.error('[AutoHeal] Failed to assign missing companyIds:', error);
    }
}
