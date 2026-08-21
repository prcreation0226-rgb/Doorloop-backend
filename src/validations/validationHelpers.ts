import { z } from 'zod';

export function safeNumberSchema(inner: z.ZodTypeAny = z.number({ invalid_type_error: 'Must be a valid number' })) {
  return z.preprocess((val) => {
    if (val === '' || val === undefined || val === null) return undefined;
    const num = Number(val);
    return isNaN(num) || !isFinite(num) ? val : num;
  }, inner);
}

export function safeDateSchema(inner: z.ZodTypeAny = z.date({ invalid_type_error: 'Must be a valid date' })) {
  return z.preprocess((val) => {
    if (val === '' || val === undefined || val === null) return undefined;
    if (val instanceof Date) return val;
    if (typeof val === 'string' || typeof val === 'number') {
      const d = new Date(val);
      return isNaN(d.getTime()) ? val : d;
    }
    return val;
  }, inner);
}
