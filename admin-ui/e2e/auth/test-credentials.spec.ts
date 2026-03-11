import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('debug: load test credentials', async ({ request }) => {
  // Test loading test credentials from API
  console.log('Testing test credentials API...');

  const credsResponse = await request.get('http://localhost:8000/api/v1/test/credentials', {
    headers: {
      'x-admin-secret': 'test-secret-key',
    },
  });

  console.log('Status:', credsResponse.status());
  console.log('Headers:', credsResponse.headers());

  if (credsResponse.ok()) {
    const credsData = await credsResponse.json();
    console.log('Credentials:', JSON.stringify(credsData, null, 2));

    // Save to file
    const credentialsFile = path.join(process.cwd(), 'e2e', '.test-credentials.json');
    fs.writeFileSync(credentialsFile, JSON.stringify(credsData.credentials, null, 2));
    console.log('Credentials saved to:', credentialsFile);
  } else {
    console.error('Error:', await credsResponse.text());
  }
});
