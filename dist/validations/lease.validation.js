"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLeaseSchema = exports.createLeaseSchema = void 0;
const zod_1 = require("zod");
const validationHelpers_1 = require("./validationHelpers");
const leaseStatusEnum = zod_1.z.enum([
    'Draft',
    'Pending_Move_In',
    'Active',
    'Pending',
    'Expired',
    'Terminated',
    'Ended',
    'Cancelled',
]);
exports.createLeaseSchema = zod_1.z.object({
    body: zod_1.z.object({
        tenantId: zod_1.z.string({ required_error: 'Tenant ID is required' }).uuid('Invalid tenant ID format'),
        propertyId: zod_1.z.string({ required_error: 'Property ID is required' }).uuid('Invalid property ID format'),
        unitId: zod_1.z.string({ required_error: 'Unit ID is required' }).uuid('Invalid unit ID format'),
        startDate: (0, validationHelpers_1.safeDateSchema)(),
        endDate: (0, validationHelpers_1.safeDateSchema)(),
        rentAmount: (0, validationHelpers_1.safeNumberSchema)(zod_1.z.number().min(0, 'Rent amount cannot be negative')),
        depositAmount: (0, validationHelpers_1.safeNumberSchema)(zod_1.z.number().min(0, 'Deposit amount cannot be negative')),
    }).refine((data) => {
        const start = data.startDate;
        const end = data.endDate;
        return start < end;
    }, {
        message: 'Start Date must be before End Date',
        path: ['endDate'],
    }),
});
exports.updateLeaseSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid lease ID format'),
    }),
    body: zod_1.z.object({
        status: leaseStatusEnum.optional(),
        endDate: (0, validationHelpers_1.safeDateSchema)().optional(),
    }),
});
