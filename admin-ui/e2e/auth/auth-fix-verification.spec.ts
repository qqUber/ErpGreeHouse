import { test, expect } from '@playwright/test';
import { TestCredentials } from '../e2e/_shared';

test.describe('Authentication Fix Verification', () => {
  test('should not inject test-secret-key into Authorization header', async ({ page }) => {
    // Intercept all network requests to verify headers
    const requests: any[] = [];
    page.on('request', (request) => {
      const headers = request.headers();
      requests.push({
        url: request.url(),
        headers: headers,
        timestamp: Date.now()
      });
    });

    // Navigate to login page
    await page.goto('/admin/login');
    
    // Set test-secret-key in localStorage (simulating the problematic scenario)
    await page.evaluate(() => {
      localStorage.setItem('admin_session_token', 'test-secret-key');
    });
    
    // Navigate to a protected page that would trigger API calls
    await page.goto('/admin/dashboard');
    
    // Wait for any API calls to complete
    await page.waitForTimeout(2000);
    
    // Filter API requests (exclude static assets)
    const apiRequests = requests.filter(req => 
      req.url.includes('/api/') && 
      !req.url.match(/\.(js|css|png|jpg|svg|ico)$/)
    );
    
    // Verify that no request has Authorization header with test-secret-key
    for (const request of apiRequests) {
      const authHeader = request.headers['authorization'];
      const xAdminSecret = request.headers['x-admin-secret'];
      
      console.log(`Request to ${request.url}:`);
      console.log(`  Authorization: ${authHeader || 'not set'}`);
      console.log(`  x-admin-secret: ${xAdminSecret ? 'present' : 'not set'}`);
      
      // Authorization header should NOT contain test-secret-key
      if (authHeader) {
        expect(authHeader).not.toContain('test-secret-key');
        expect(authHeader).not.toBe('Bearer test-secret-key');
      }
      
      // x-admin-secret header should still be present for legacy compatibility
      if (xAdminSecret) {
        expect(xAdminSecret).toBe('test-secret-key');
      }
    }
    
    // Verify that at least one API request was made with proper headers
    expect(apiRequests.length).toBeGreaterThan(0);
    
    // Verify that x-admin-secret is present in requests (legacy compatibility)
    const hasXAdminSecret = apiRequests.some(req => req.headers['x-admin-secret'] === 'test-secret-key');
    expect(hasXAdminSecret).toBeTruthy();
  });

  test('should inject proper JWT token into Authorization header', async ({ page }) => {
    // Intercept all network requests to verify headers
    const requests: any[] = [];
    page.on('request', (request) => {
      const headers = request.headers();
      requests.push({
        url: request.url(),
        headers: headers,
        timestamp: Date.now()
      });
    });

    // Navigate to login page
    await page.goto('/admin/login');
    
    // Set a proper JWT token in localStorage
    const validJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    await page.evaluate((token) => {
      localStorage.setItem('admin_session_token', token);
    }, validJwtToken);
    
    // Navigate to a protected page that would trigger API calls
    await page.goto('/admin/dashboard');
    
    // Wait for any API calls to complete
    await page.waitForTimeout(2000);
    
    // Filter API requests (exclude static assets)
    const apiRequests = requests.filter(req => 
      req.url.includes('/api/') && 
      !req.url.match(/\.(js|css|png|jpg|svg|ico)$/)
    );
    
    // Verify that requests have proper Authorization header with JWT token
    for (const request of apiRequests) {
      const authHeader = request.headers['authorization'];
      const xAdminSecret = request.headers['x-admin-secret'];
      
      console.log(`Request to ${request.url}:`);
      console.log(`  Authorization: ${authHeader || 'not set'}`);
      console.log(`  x-admin-secret: ${xAdminSecret ? 'present' : 'not set'}`);
      
      // Authorization header should contain the JWT token
      if (authHeader) {
        expect(authHeader).toContain('Bearer');
        expect(authHeader).toContain(validJwtToken);
      }
      
      // x-admin-secret header should also contain the JWT token for legacy compatibility
      if (xAdminSecret) {
        expect(xAdminSecret).toBe(validJwtToken);
      }
    }
    
    // Verify that at least one API request was made with proper headers
    expect(apiRequests.length).toBeGreaterThan(0);
  });

  test('should handle authentication flow without 401 errors', async ({ page }) => {
    // Clear any existing tokens
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Navigate to login page
    await page.goto('/admin/login');
    
    // Fill in login form with test credentials
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/admin/dashboard', { timeout: 10000 });
    
    // Verify dashboard loaded successfully (no 401 errors)
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Verify that API calls on dashboard work without 401 errors
    await page.waitForTimeout(3000); // Wait for API calls to complete
    
    // Check for any error messages that might indicate 401 issues
    const errorMessages = await page.locator('.error-message, .alert-error, [role="alert"]').count();
    expect(errorMessages).toBe(0);
    
    // Verify that the user can navigate to other protected pages
    await page.click('a[href*="/admin/customers"]');
    await page.waitForURL('/admin/customers', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Customers');
  });
});