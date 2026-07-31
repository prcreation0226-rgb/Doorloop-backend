"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
async function main() {
    console.log('--- DB SCREENINGS AND TENANTS ---');
    const tenants = await database_1.default.tenant.findMany({
        include: {
            screeningReports: true
        }
    });
    console.log('\nTENANTS & THEIR SCREENINGS:');
    tenants.forEach(t => {
        console.log(`- Tenant: ${t.firstName} ${t.lastName} | Email: ${t.email} | Status: ${t.status} | CompanyId: ${t.companyId}`);
        t.screeningReports.forEach(sr => {
            console.log(`   * Screening Report: ID ${sr.id} | Status: ${sr.status} | Credit: ${sr.creditScore}`);
        });
    });
}
main().catch(console.error).finally(() => database_1.default.$disconnect());
