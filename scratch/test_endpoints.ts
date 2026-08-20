import { env } from '../src/config/env';

async function testAllEndpoints() {
  const baseUrl = `http://localhost:${env.PORT || 5000}${env.API_PREFIX || '/api/v1'}`;
  console.log(`Starting API Audit on base URL: ${baseUrl}`);

  // 1. Authenticate to get a token
  let token = '';
  try {
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@apexpm.com',
        password: 'admin123'
      })
    });
    
    if (loginRes.ok) {
      const data: any = await loginRes.json();
      token = data.data?.accessToken || data.data?.token || '';
      console.log('Successfully authenticated as admin@apexpm.com.');
    } else {
      console.error('Failed to authenticate as admin. Status:', loginRes.status);
      const err = await loginRes.text();
      console.error('Error body:', err);
      return;
    }
  } catch (err) {
    console.error('Authentication request failed:', err);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // List of GET endpoints to test
  const getEndpoints = [
    '/health',
    '/properties',
    '/leases',
    '/payments',
    '/tenants',
    '/owners',
    '/vendors',
    '/work-orders',
    '/dashboard/metrics',
    '/dashboard/charts',
    '/accounting/accounts',
    '/accounting/journal-entries',
    '/accounting/general-ledger',
    '/accounting/bank-accounts',
    '/accounting/bank-reconciliation',
    '/superadmin/companies',
    '/superadmin/company-users',
    '/superadmin/plans',
    '/superadmin/invoices',
    '/superadmin/stats',
    '/superadmin/settings',
    '/superadmin/audit-logs',
    '/superadmin/wordpress-inquiries',
    '/invoices',
    '/service-requests',
    '/buildings',
    '/units',
    '/applications',
    '/move-ins',
    '/move-outs',
    '/renewals',
    '/inspection-templates',
    '/inspections',
    '/documents',
    '/integrations'
  ];

  console.log('\n--- Auditing GET Endpoints ---');
  let passedCount = 0;
  let failedCount = 0;

  for (const endpoint of getEndpoints) {
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: endpoint === '/health' ? {} : headers
      });

      if (res.status >= 500) {
        console.error(`❌ [5xx CRITICAL CRASH] GET ${endpoint} failed with status: ${res.status}`);
        const text = await res.text();
        console.error(`Response: ${text.slice(0, 300)}`);
        failedCount++;
      } else if (res.status === 404) {
        console.warn(`⚠️ [404 NOT FOUND] GET ${endpoint} is not implemented or has different path.`);
        failedCount++;
      } else if (res.status === 403 || res.status === 401) {
        console.log(`ℹ️ [Access Restricted] GET ${endpoint} returned ${res.status} (Permission/Auth Required)`);
        passedCount++;
      } else {
        console.log(`✅ [OK] GET ${endpoint} - Status: ${res.status}`);
        passedCount++;
      }
    } catch (err: any) {
      console.error(`❌ [CONNECTION ERROR] GET ${endpoint} request failed:`, err.message);
      failedCount++;
    }
  }

  console.log(`\nAudit Complete: ${passedCount} passed, ${failedCount} failed.`);
}

testAllEndpoints();
