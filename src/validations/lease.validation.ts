import { z } from 'zod';
import { safeNumberSchema, safeDateSchema } from './validationHelpers';

const leaseStatusEnum = z.enum([
  'Draft',
  'Pending_Move_In',
  'Active',
  'Pending',
  'Expired',
  'Terminated',
  'Ended',
  'Cancelled',
]);

export const createLeaseSchema = z.object({
  body: z.object({
    tenantId: z.string({ required_error: 'Tenant ID is required' }).uuid('Invalid tenant ID format'),
    propertyId: z.string({ required_error: 'Property ID is required' }).uuid('Invalid property ID format'),
    unitId: z.string({ required_error: 'Unit ID is required' }).uuid('Invalid unit ID format'),
    startDate: safeDateSchema(),
    endDate: safeDateSchema(),
    rentAmount: safeNumberSchema(z.number().min(0, 'Rent amount cannot be negative')),
    depositAmount: safeNumberSchema(z.number().min(0, 'Deposit amount cannot be negative')),
  }).refine((data) => {
    const start = data.startDate as Date;
    const end = data.endDate as Date;
    return start < end;
  }, {
    message: 'Start Date must be before End Date',
    path: ['endDate'],
  }),
});

export const updateLeaseSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid lease ID format'),
  }),
  body: z.object({
    status: leaseStatusEnum.optional(),
    endDate: safeDateSchema().optional(),
  }),
});
