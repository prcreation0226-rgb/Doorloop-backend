"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function main() {
    const baseUrl = 'https://doorloop-backend-production.up.railway.app/api/v1';
    console.log('Logging in as johncena@gmail.com...');
    let token = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await (0, node_fetch_1.default)(`${baseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'johncena@gmail.com',
                    password: 'admin123'
                }),
                timeout: 10000 // 10s timeout
            });
            const data = await res.json();
            if (data.success) {
                token = data.data.accessToken;
                console.log('Successfully logged in!');
                break;
            }
            else {
                console.log(`Attempt ${attempt} login failed:`, data);
            }
        }
        catch (e) {
            console.log(`Attempt ${attempt} failed with error:`, e.message);
        }
    }
    if (!token) {
        console.error('Failed to get token after 3 attempts.');
        return;
    }
    console.log('Decoded Token Payload:', jsonwebtoken_1.default.decode(token));
    console.log('\nFetching properties using the token...');
    try {
        const res = await (0, node_fetch_1.default)(`${baseUrl}/properties`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        const data = await res.json();
        console.log('Properties API response status:', res.status);
        console.log('Properties returned:', JSON.stringify(data, null, 2));
    }
    catch (e) {
        console.error('Error fetching properties:', e.message);
    }
}
main();
