import { test } from '@playwright/test';

test('debug: test login API directly', async ({ request }) => {
  // Test login API
  const apiBase = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8000';
  const loginResponse = await request.post(`${apiBase}/api/v1/public/auth/login`, {
    data: {
      username: 'admin',
      password: 'TestPass123!',
    },
  });

  console.log('Login status:', loginResponse.status());

  if (loginResponse.ok()) {
    const loginData = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    const headers = loginResponse.headers();
    console.log('Response headers:', headers);

    if (headers['set-cookie']) {
      console.log('Cookies:', headers['set-cookie']);
    }
  } else {
    const errorText = await loginResponse.text();
    console.error('Login failed:', errorText);
  }

  // Test public status endpoint
  const statusResponse = await request.get(`${apiBase}/api/v1/public/status`);
  console.log('Status endpoint status:', statusResponse.status());

  if (statusResponse.ok()) {
    const statusData = await statusResponse.json();
    console.log('Status response:', JSON.stringify(statusData, null, 2));
  }

  // Test test credentials endpoint
  const credsResponse = await request.get(`${apiBase}/api/v1/test/credentials`, {
    headers: {
      'x-admin-secret': 'test-secret-key',
    },
  });

  console.log('Test credentials status:', credsResponse.status());

  if (credsResponse.ok()) {
    const credsData = await credsResponse.json();
    console.log('Test credentials:', JSON.stringify(credsData, null, 2));
  } else {
    const errorText = await credsResponse.text();
    console.error('Test credentials failed:', errorText);
  }
});
