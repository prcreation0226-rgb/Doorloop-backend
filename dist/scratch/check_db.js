"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
async function main() {
    console.log('--- DB STATE CHECK ---');
    const companies = await database_1.default.company.findMany();
    console.log('\nCOMPANIES in DB:');
    companies.forEach(c => console.log(`- ID: ${c.id} | Name: ${c.name}`));
    const users = await database_1.default.user.findMany({ include: { role: true } });
    console.log('\nUSERS in DB:');
    users.forEach(u => console.log(`- Email: ${u.email} | Name: ${u.firstName} ${u.lastName} | CompanyId: ${u.companyId} | Role: ${u.role?.name}`));
    const properties = await database_1.default.property.findMany();
    console.log('\nPROPERTIES in DB:');
    properties.forEach(p => console.log(`- ID: ${p.id} | Name: ${p.name} | CompanyId: ${p.companyId}`));
}
main().catch(console.error).finally(() => database_1.default.$disconnect());
