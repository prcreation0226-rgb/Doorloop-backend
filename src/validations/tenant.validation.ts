import { z } from 'zod';

const tenantStatusEnum = z.enum(['Active', 'Inactive', 'Pending']);

export const createTenantSchema = z.object({
  body: z.object({
    firstName: z.string({ required_error: 'First name is required' }).trim().min(1, 'First name is required').max(100),
    lastName: z.string({ required_error: 'Last name is required' }).trim().min(1, 'Last name is required').max(100),
    email: z.string({ required_error: 'Email is required' }).trim().email('Invalid email address format').max(255),
    phone: z.string({ required_error: 'Phone number is required' }).trim().min(1, 'Phone number is required').max(30),
    unitId: z.string().uuid('Invalid Unit ID format').optional().nullable(),
    status: tenantStatusEnum.default('Pending'),
    password: z.string().min(6, 'Password must be at least 6 characters').optional().nullable().or(z.literal('')),
  }),
});

export const updateTenantSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid tenant ID format'),
  }),
  body: z.object({
    firstName: z.string().trim().min(1, 'First name cannot be empty').max(100).optional(),
    lastName: z.string().trim().min(1, 'Last name cannot be empty').max(100).optional(),
    email: z.string().trim().email('Invalid email address format').max(255).optional(),
    phone: z.string().trim().min(1, 'Phone number cannot be empty').max(30).optional(),
    unitId: z.string().uuid('Invalid Unit ID format').optional().nullable(),
    status: tenantStatusEnum.optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional().nullable().or(z.literal('')),
  }),
});
