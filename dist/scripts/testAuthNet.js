"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env from backend root
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const authorizeNet_service_1 = require("../services/authorizeNet.service");
async function runTest() {
    console.log('--- Authorize.Net Integration Test ---');
    console.log('Env Mode:', process.env.AUTHORIZE_NET_ENV);
    console.log('API Login ID:', process.env.AUTHORIZE_NET_API_LOGIN_ID);
    console.log('Transaction Key Length:', process.env.AUTHORIZE_NET_TRANSACTION_KEY?.length || 0);
    if (!process.env.AUTHORIZE_NET_API_LOGIN_ID || process.env.AUTHORIZE_NET_API_LOGIN_ID === '5n8X9kKz2') {
        console.log('\n⚠️ WARNING: Using dummy simulated credentials. Please replace them in your backend `.env` file first.');
    }
    try {
        console.log('\nRequesting Hosted Payment Page Token from Authorize.Net...');
        const result = await authorizeNet_service_1.authorizeNetService.getHostedPaymentToken({
            amount: 200.00,
            planName: 'Pro Plan',
            description: 'SaaS Subscription Integration Test',
        });
        console.log('\nResponse Received:');
        console.log('- Token:', result.token);
        console.log('- Hosted URL:', result.hostedUrl);
        if (result.token.startsWith('HOSTED-TOKEN-SIM-')) {
            console.log('\nℹ️ Simulated/offline token returned (falling back because dummy/simulated keys are still active).');
        }
        else {
            console.log('\n✅ Connection Successful! A real Authorize.Net Sandbox token was fetched successfully.');
        }
    }
    catch (err) {
        console.error('\n❌ Connection Error: Failed to fetch hosted payment page token:', err);
    }
}
runTest();
