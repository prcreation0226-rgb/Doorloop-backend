"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeNumberSchema = safeNumberSchema;
exports.safeDateSchema = safeDateSchema;
const zod_1 = require("zod");
function safeNumberSchema(inner = zod_1.z.number({ invalid_type_error: 'Must be a valid number' })) {
    return zod_1.z.preprocess((val) => {
        if (val === '' || val === undefined || val === null)
            return undefined;
        const num = Number(val);
        return isNaN(num) || !isFinite(num) ? val : num;
    }, inner);
}
function safeDateSchema(inner = zod_1.z.date({ invalid_type_error: 'Must be a valid date' })) {
    return zod_1.z.preprocess((val) => {
        if (val === '' || val === undefined || val === null)
            return undefined;
        if (val instanceof Date)
            return val;
        if (typeof val === 'string' || typeof val === 'number') {
            const d = new Date(val);
            return isNaN(d.getTime()) ? val : d;
        }
        return val;
    }, inner);
}
