/**
 * Global Setup for E2E Tests
 *
 * This file runs ONCE before all tests.
 * It prepares the test environment with known credentials.
 *
 * SECURITY: Only works when E2E_TEST_MODE=true
 */

import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE = process.env.E2E_API_BASE_URL || 'http://localhost:8000';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'test-secret-key';

export default async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up test environment...');

  try {
    // Check if test API is available
    const pingResponse = await fetch(`${API_BASE}/api/v1/test/ping`, {
      method: 'GET',
      headers: {
        'x-admin-secret': ADMIN_SECRET,
      },
    });

    if (!pingResponse.ok) {
      const error = await pingResponse.text();
      throw new Error(`Test API not available: ${error}. Make sure E2E_TEST_MODE=true`);
    }

    console.log('✅ Test API is available');

    // Bootstrap test data (creates users with known passwords)
    const bootstrapResponse = await fetch(`${API_BASE}/api/v1/test/bootstrap`, {
      method: 'POST',
      headers: {
        'x-admin-secret': ADMIN_SECRET,
        'Content-Type': 'application/json',
      },
    });

    if (!bootstrapResponse.ok) {
      const error = await bootstrapResponse.text();
      throw new Error(`Failed to bootstrap test data: ${error}`);
    }

    const bootstrapResult = await bootstrapResponse.json();
    console.log('✅ Test data bootstrapped:', bootstrapResult);

    // Fetch credentials from database
    const credentialsResponse = await fetch(`${API_BASE}/api/v1/test/credentials`, {
      method: 'GET',
      headers: {
        'x-admin-secret': ADMIN_SECRET,
      },
    });

    let credentialsData: any = {};
    if (credentialsResponse.ok) {
      credentialsData = await credentialsResponse.json();
      console.log('✅ Test credentials loaded from database');
      console.log('');
      console.log('📋 Test Credentials (from DB):');
      for (const [username, data] of Object.entries(credentialsData.credentials || {})) {
        const cred = data as { password: string; role: string };
        console.log(`  ${username} / ${cred.password} (${cred.role})`);
      }
    } else {
      // Fallback to default credentials
      credentialsData = {
        credentials: {
          admin: { username: 'admin', password: 'TestPass123!', role: 'owner' },
          operator: { username: 'operator', password: 'TestPass123!', role: 'operator' },
          manager: { username: 'manager', password: 'TestPass123!', role: 'marketer' },
        },
      };
      console.log('⚠️ Using default test credentials');
    }

    // Save credentials to file for tests to use
    const credentialsFile = path.join(process.cwd(), 'e2e', '.test-credentials.json');
    fs.writeFileSync(credentialsFile, JSON.stringify(credentialsData.credentials, null, 2));
    console.log(`✅ Credentials saved to: ${credentialsFile}`);

    console.log('');
    console.log('⚠️  WARNING: These credentials are for TESTING ONLY!');
    console.log('   Do NOT use in production!');
    console.log('');
    console.log('🚀 Test environment ready!');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}
