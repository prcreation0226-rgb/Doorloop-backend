"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const tenantContext_js_1 = require("../utils/tenantContext.js");
const prismaRaw = new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
const modelsWithCompanyId = new Set([
    'User', 'Owner', 'Property', 'Building', 'Unit', 'Tenant', 'Lease', 'RentPayment', 'Violation',
    'MoveIn', 'MoveOut', 'WorkOrder', 'StaffProfile', 'AuditLog', 'Invoice', 'Charge', 'Deposit',
    'InsurancePolicy', 'PaymentPlan', 'ScreeningReport', 'Announcement', 'Promotion', 'Notification',
    'Document', 'InspectionTemplate', 'Inspection', 'InspectionRoom', 'InspectionItem'
]);
exports.prisma = prismaRaw.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const context = tenantContext_js_1.tenantContext.getStore();
                if (!context) {
                    return query(args);
                }
                const { companyId, role, tenantId, ownerId, staffId } = context;
                // Super Admin bypasses company filtering
                if (role === 'Super Admin') {
                    return query(args);
                }
                const updatedArgs = (args || {});
                updatedArgs.where = updatedArgs.where || {};
                // 1. Pre-verify single-record queries to avoid Prisma unique where clause constraints
                if (['findUnique', 'update', 'delete', 'upsert'].includes(operation)) {
                    if (companyId && modelsWithCompanyId.has(model)) {
                        const exists = await prismaRaw[model.toLowerCase()].findFirst({
                            where: { ...updatedArgs.where, companyId },
                        });
                        if (!exists) {
                            if (operation === 'findUnique') {
                                return null;
                            }
                            throw new Error(`Record not found or access denied for model ${model}`);
                        }
                    }
                }
                // 2. Enforce Company ID isolation for general queries
                if (companyId && modelsWithCompanyId.has(model)) {
                    updatedArgs.where.companyId = companyId;
                }
                // 3. Enforce Role-based isolation
                const roleLower = (role || '').toLowerCase();
                if (roleLower.includes('tenant') || roleLower.includes('resident')) {
                    if (tenantId) {
                        if (model === 'Tenant') {
                            updatedArgs.where.id = tenantId;
                        }
                        else if (model === 'Lease') {
                            updatedArgs.where.tenantId = tenantId;
                        }
                        else if (model === 'Invoice') {
                            updatedArgs.where.tenantId = tenantId;
                        }
                        else if (model === 'RentPayment') {
                            updatedArgs.where.lease = { tenantId };
                        }
                        else if (model === 'Document') {
                            updatedArgs.where.tenantId = tenantId;
                        }
                        else if (model === 'WorkOrder') {
                            updatedArgs.where.tenantId = tenantId;
                        }
                    }
                }
                else if (roleLower.includes('owner') || roleLower.includes('landlord')) {
                    if (ownerId) {
                        if (model === 'Owner') {
                            updatedArgs.where.id = ownerId;
                        }
                        else if (model === 'Property') {
                            updatedArgs.where.ownerId = ownerId;
                        }
                        else if (model === 'Building') {
                            updatedArgs.where.property = { ownerId };
                        }
                        else if (model === 'Unit') {
                            updatedArgs.where.property = { ownerId };
                        }
                        else if (model === 'Invoice') {
                            updatedArgs.where.property = { ownerId };
                        }
                        else if (model === 'Document') {
                            updatedArgs.where.ownerId = ownerId;
                        }
                        else if (model === 'WorkOrder') {
                            updatedArgs.where.property = { ownerId };
                        }
                    }
                }
                else if (roleLower.includes('maintenance') || roleLower.includes('staff')) {
                    if (staffId) {
                        if (model === 'WorkOrder') {
                            updatedArgs.where.assignedStaffId = staffId;
                        }
                    }
                }
                // 4. Auto-inject companyId on create operations
                if (companyId && (operation === 'create' || operation === 'createMany')) {
                    if (modelsWithCompanyId.has(model)) {
                        if (operation === 'create') {
                            updatedArgs.data = updatedArgs.data || {};
                            updatedArgs.data.companyId = companyId;
                        }
                        else if (operation === 'createMany') {
                            if (Array.isArray(updatedArgs.data)) {
                                updatedArgs.data = updatedArgs.data.map((item) => ({
                                    ...item,
                                    companyId,
                                }));
                            }
                            else if (updatedArgs.data) {
                                updatedArgs.data.companyId = companyId;
                            }
                        }
                    }
                }
                return query(updatedArgs);
            },
        },
    },
});
exports.default = exports.prisma;
