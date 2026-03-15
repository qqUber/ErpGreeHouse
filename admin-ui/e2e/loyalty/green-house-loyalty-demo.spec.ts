import { expect, test } from '@playwright/test';
import { attachConsole, login, resetTestDatabase } from '../_shared';

/**
 * 🤖 Green House Loyalty Demo – End‑to‑End Test (MVP Flow)
 * 
 * This test covers the complete loyalty program registration flow:
 * 1. Start command and welcome message
 * 2. Privacy consent handling
 * 3. Contact sharing (phone number)
 * 4. Profile data collection
 * 5. Loyalty registration with QR token
 * 6. Virtual card display and usage
 * 7. Marketing menu integration
 * 
 * Architect Recommendations:
 * - Privacy route served securely (HTTPS, GDPR/152-ФЗ compliance)
 * - Token uniqueness and collision handling
 * - Bonus expiry (7 days) enforced in DB/ERP
 * 
 * QA Recommendations:
 * - Welcome message includes explicit privacy link every time
 * - Test both typed number and "Share Contact" button
 * - Verify bonus visible in CRM
 * - Test cashier flow with both QR scan and manual 6-digit entry
 */

test.describe('Green House Loyalty Demo - MVP Flow', () => {
  let testConsole: (() => Promise<void>) | null = null;

  test.beforeEach(async ({ page, context }) => {
    // Setup console logging for debugging
    testConsole = attachConsole(page, test.info());
    
    // Reset database to ensure clean test state
    await resetTestDatabase(page);
    
    // Login as admin to access CRM/verification features
    await login(page, 'admin');
    
    // Navigate to dashboard to verify system status
    await page.goto('/admin/dashboard');
    await expect(page.getByTestId('admin_nav_dashboard')).toBeVisible();
  });

  test.afterEach(async () => {
    // Cleanup console logging
    if (testConsole) {
      await testConsole();
    }
  });

  test('complete loyalty registration flow', async ({ page }) => {
    console.log('🌱 Starting Green House Loyalty Demo E2E Test');
    
    // Step 1: Verify Telegram bot integration is available
    console.log('📋 Step 1: Verify Telegram bot integration');
    await page.goto('/admin/integrations');
    await page.getByTestId('admin_nav_integrations').click();
    await expect(page.getByTestId('admin_nav_integrations')).toHaveAttribute('aria-selected', 'true');
    
    // Check Telegram bot status
    const telegramStatus = await page.getByTestId('telegram_bot_status').isVisible();
    expect(telegramStatus).toBeTruthy();
    
    // Verify webhook endpoint is configured
    const webhookStatus = await page.getByTestId('webhook_status').textContent();
    expect(webhookStatus).toContain('active');
    
    // Step 2: Simulate /start command via API
    console.log('📋 Step 2: Simulate /start command');
    
    // Use test API to simulate Telegram bot interaction
    const startResponse = await page.request.post('/api/v1/test/telegram/start', {
      data: {
        user_id: 'test_user_123',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User'
      }
    });
    
    expect(startResponse.ok()).toBeTruthy();
    const startResult = await startResponse.json();
    
    // Verify welcome message was sent
    expect(startResult.welcome_message).toContain('Welcome');
    expect(startResult.privacy_link).toContain('/privacy');
    expect(startResult.consent_button).toBeTruthy();
    
    // Step 3: Test privacy consent flow
    console.log('📋 Step 3: Test privacy consent flow');
    
    // Verify privacy route is accessible and secure
    const privacyResponse = await page.goto('/privacy');
    expect(privacyResponse?.ok()).toBeTruthy();
    
    // Check privacy page content
    await expect(page.getByText('Privacy Policy')).toBeVisible();
    await expect(page.getByText('GDPR')).toBeVisible();
    await expect(page.getByText('152-ФЗ')).toBeVisible();
    
    // Simulate consent acceptance
    const consentResponse = await page.request.post('/api/v1/test/telegram/consent', {
      data: {
        user_id: 'test_user_123',
        consent: true,
        consent_version: '1.0'
      }
    });
    
    expect(consentResponse.ok()).toBeTruthy();
    const consentResult = await consentResponse.json();
    
    // Verify consent stored in database
    expect(consentResult.consent_stored).toBeTruthy();
    expect(consentResult.consent_id).toBeTruthy();
    
    // Step 4: Contact sharing simulation
    console.log('📋 Step 4: Contact sharing simulation');
    
    // Test phone number sharing (both typed and contact button)
    const phoneTests = [
      { type: 'typed', phone: '+1234567890' },
      { type: 'shared', phone: '+1234567890' }
    ];
    
    for (const phoneTest of phoneTests) {
      const contactResponse = await page.request.post('/api/v1/test/telegram/contact', {
        data: {
          user_id: 'test_user_123',
          phone: phoneTest.phone,
          share_method: phoneTest.type
        }
      });
      
      expect(contactResponse.ok()).toBeTruthy();
      const contactResult = await contactResponse.json();
      
      // Verify phone normalized to E.164 format
      expect(contactResult.phone).toMatch(/^\+\d{1,15}$/);
      expect(contactResult.telegram_id).toBe('test_user_123');
    }
    
    // Step 5: Profile data collection
    console.log('📋 Step 5: Profile data collection');
    
    const profileData = {
      user_id: 'test_user_123',
      name: 'Test User',
      gender: 'male',
      birthday: '1990-01-01',
      email: 'test@example.com',
      city: 'Test City'
    };
    
    const profileResponse = await page.request.post('/api/v1/test/telegram/profile', {
      data: profileData
    });
    
    expect(profileResponse.ok()).toBeTruthy();
    const profileResult = await profileResponse.json();
    
    // Verify profile validation and storage
    expect(profileResult.profile_id).toBeTruthy();
    expect(profileResult.validation_passed).toBeTruthy();
    
    // Step 6: Loyalty registration and QR token generation
    console.log('📋 Step 6: Loyalty registration and QR token generation');
    
    const loyaltyResponse = await page.request.post('/api/v1/test/telegram/loyalty/register', {
      data: {
        user_id: 'test_user_123'
      }
    });
    
    expect(loyaltyResponse.ok()).toBeTruthy();
    const loyaltyResult = await loyaltyResponse.json();
    
    // Verify QR token generation
    expect(loyaltyResult.qr_token).toBeTruthy();
    expect(loyaltyResult.numeric_code).toMatch(/^\d{6}$/);
    expect(loyaltyResult.bonus_applied).toBeTruthy();
    expect(loyaltyResult.bonus_expiry).toBeTruthy();
    
    // Step 7: Verify CRM integration
    console.log('📋 Step 7: Verify CRM integration');
    
    // Navigate to customers to verify loyalty data
    await page.goto('/admin/customers');
    await expect(page.getByTestId('admin_nav_customers')).toHaveAttribute('aria-selected', 'true');
    
    // Search for the test user
    await page.getByTestId('admin_input_customer_search_en').fill('test_user_123');
    await page.getByTestId('admin_btn_customer_search_en').click();
    
    // Verify customer appears with loyalty data
    await expect(page.getByText('Test User')).toBeVisible();
    await expect(page.getByText('+1234567890')).toBeVisible();
    
    // Check loyalty bonus is visible
    const customerLoyaltyBonus = await page.getByTestId('customer_loyalty_bonus').textContent();
    expect(customerLoyaltyBonus).toContain('bonus');
    
    // Step 8: Virtual card functionality
    console.log('📋 Step 8: Virtual card functionality');
    
    // Request virtual card
    const virtualCardResponse = await page.request.post('/api/v1/test/telegram/virtual-card', {
      data: {
        user_id: 'test_user_123'
      }
    });
    
    expect(virtualCardResponse.ok()).toBeTruthy();
    const virtualCardResult = await virtualCardResponse.json();
    
    // Verify virtual card data
    expect(virtualCardResult.qr_code).toBeTruthy();
    expect(virtualCardResult.numeric_code).toMatch(/^\d{6}$/);
    expect(virtualCardResult.card_status).toBe('active');
    
    // Step 9: POS integration test (demo transaction)
    console.log('📋 Step 9: POS integration test');
    
    // Navigate to POS for cashier flow testing
    await page.goto('/admin/pos');
    await expect(page.getByTestId('admin_nav_pos')).toHaveAttribute('aria-selected', 'true');
    
    // Test QR code identification
    await page.getByTestId('operator_btn_mode_qr_en').click();
    await page.getByTestId('operator_input_identify_en').fill(virtualCardResult.numeric_code);
    await page.getByTestId('operator_btn_identify_en').click();
    
    // Verify customer identified
    await expect(page.getByText('Test User')).toBeVisible();
    await expect(page.getByText('Loyalty Card')).toBeVisible();
    
    // Simulate demo transaction
    await page.getByTestId('operator_select_product_en').first().click();
    await page.getByTestId('operator_btn_add_to_cart_en').click();
    await page.getByTestId('operator_btn_complete_sale_en').click();
    
    // Verify transaction completed with loyalty bonus
    await expect(page.getByText('Transaction Complete')).toBeVisible();
    const loyaltyApplied = await page.getByTestId('loyalty_bonus_applied').isVisible();
    expect(loyaltyApplied).toBeTruthy();
    
    // Step 10: Marketing menu integration
    console.log('📋 Step 10: Marketing menu integration');
    
    // Test marketing channel link
    const marketingResponse = await page.request.post('/api/v1/test/telegram/marketing', {
      data: {
        user_id: 'test_user_123',
        action: 'show_menu'
      }
    });
    
    expect(marketingResponse.ok()).toBeTruthy();
    const marketingResult = await marketingResponse.json();
    
    // Verify marketing menu items
    expect(marketingResult.channel_link).toBeTruthy();
    expect(marketingResult.menu_items).toContain('FAQ');
    expect(marketingResult.menu_items).toContain('Vacancies');
    expect(marketingResult.menu_items).toContain('Promotions');
    
    // Verify CRM campaign triggers
    await page.goto('/admin/marketing');
    await expect(page.getByTestId('admin_nav_marketing')).toHaveAttribute('aria-selected', 'true');
    
    // Check for triggered campaigns
    const campaignStatus = await page.getByTestId('campaign_status').textContent();
    expect(campaignStatus).toContain('active');
    
    console.log('✅ Green House Loyalty Demo E2E Test Completed Successfully');
  });

  test('architectural compliance verification', async ({ page }) => {
    console.log('🏗️ Architectural Compliance Verification');
    
    // Verify HTTPS compliance for privacy route
    const privacyResponse = await page.request.get('/privacy');
    expect(privacyResponse.ok()).toBeTruthy();
    
    // Check security headers
    const privacyHeaders = privacyResponse.headers();
    if ((new URL(page.url())).protocol === 'https:') {
      expect(privacyHeaders['strict-transport-security']).toBeTruthy();
    }
    expect(privacyHeaders['x-content-type-options']).toBeTruthy();
    
    // Verify consent versioning and audit trail
    const consentAuditResponse = await page.request.get('/api/v1/test/consent/audit');
    expect(consentAuditResponse.ok()).toBeTruthy();
    const auditData = await consentAuditResponse.json();
    
    expect(auditData.versioning_enabled).toBeTruthy();
    expect(auditData.audit_trail_available).toBeTruthy();
    
    // Verify token uniqueness handling
    const tokenCollisionResponse = await page.request.post('/api/v1/test/token/collision-test', {
      data: { simulate_collision: true }
    });
    expect(tokenCollisionResponse.ok()).toBeTruthy();
    const collisionResult = await tokenCollisionResponse.json();
    
    expect(collisionResult.collision_handled).toBeTruthy();
    expect(collisionResult.unique_token_generated).toBeTruthy();
    
    // Verify bonus expiry enforcement
    const bonusExpiryResponse = await page.request.get('/api/v1/test/bonus/expiry-check');
    expect(bonusExpiryResponse.ok()).toBeTruthy();
    const expiryData = await bonusExpiryResponse.json();
    
    expect(expiryData.expiry_enforced).toBeTruthy();
    expect(expiryData.db_constraints_active).toBeTruthy();
    
    console.log('✅ Architectural Compliance Verified');
  });

  test('data integrity and validation', async ({ page }) => {
    console.log('🔍 Data Integrity and Validation Tests');
    
    // Test phone number normalization
    const phoneTests = [
      { input: '+1 (555) 123-4567', expected: '+15551234567' },
      { input: '5551234567', expected: '+15551234567' },
      { input: '+44 20 7946 0958', expected: '+442079460958' }
    ];
    
    for (const phoneTest of phoneTests) {
      const normalizeResponse = await page.request.post('/api/v1/test/phone/normalize', {
        data: { phone: phoneTest.input }
      });
      
      expect(normalizeResponse.ok()).toBeTruthy();
      const result = await normalizeResponse.json();
      expect(result.normalized_phone).toBe(phoneTest.expected);
    }
    
    // Test profile validation rules
    const validationTests = [
      { field: 'email', value: 'invalid-email', should_fail: true },
      { field: 'email', value: 'valid@example.com', should_fail: false },
      { field: 'birthday', value: '1990-02-30', should_fail: true }, // Invalid date
      { field: 'birthday', value: '1990-01-01', should_fail: false },
      { field: 'name', value: '', should_fail: true }, // Empty name
      { field: 'name', value: 'Valid Name', should_fail: false }
    ];
    
    for (const validationTest of validationTests) {
      const validationResponse = await page.request.post('/api/v1/test/profile/validate', {
        data: {
          field: validationTest.field,
          value: validationTest.value
        }
      });
      
      expect(validationResponse.ok()).toBeTruthy();
      const result = await validationResponse.json();
      
      if (validationTest.should_fail) {
        expect(result.valid).toBeFalsy();
        expect(result.error_message).toBeTruthy();
      } else {
        expect(result.valid).toBeTruthy();
      }
    }
    
    console.log('✅ Data Integrity and Validation Tests Completed');
  });
});
