import { expect, test } from '@playwright/test';
import { login, resetTestDatabase, attachConsole } from '../_shared';

/**
 * 📱 Green House Loyalty Demo – Virtual Card & QR Code Tests
 * 
 * This test covers virtual card functionality:
 * - QR code generation and validation
 * - Numeric code entry and verification
 * - Card regeneration after deletion
 * - POS cashier flow testing
 * - Card security and anti-fraud measures
 * - Card status management
 * 
 * Architect Recommendations:
 * - Should QR regeneration be possible after deletion?
 * - Token uniqueness and collision handling
 * - Card security measures implementation
 * 
 * QA Recommendations:
 * - Test cashier flow with both QR scan and manual 6-digit entry
 * - Verify card display and usability
 * - Test card security features
 */

test.describe('Green House Loyalty Demo - Virtual Card & QR Code', () => {
  let testConsole: (() => Promise<void>) | null = null;

  test.beforeEach(async ({ page }) => {
    testConsole = attachConsole(page, test.info());
    await resetTestDatabase(page);
    await login(page, 'admin');
  });

  test.afterEach(async () => {
    if (testConsole) {
      await testConsole();
    }
  });

  test('QR code generation and validation', async ({ page }) => {
    console.log('📱 Testing QR Code Generation and Validation');

    // Create user and register for loyalty
    const userRegistrationResponse = await page.request.post('/api/v1/test/telegram/complete-registration', {
      data: {
        user_id: 'test_qr_user',
        phone: '+1234567890',
        email: 'qruser@example.com'
      }
    });

    expect(userRegistrationResponse.ok()).toBeTruthy();

    // Generate virtual card with QR code
    const qrGenerationResponse = await page.request.post('/api/v1/test/telegram/virtual-card/generate', {
      data: {
        user_id: 'test_qr_user',
        card_type: 'loyalty'
      }
    });

    expect(qrGenerationResponse.ok()).toBeTruthy();
    const qrResult = await qrGenerationResponse.json();
    
    // Verify QR code generation
    expect(qrResult.qr_code).toBeTruthy();
    expect(qrResult.qr_code_format).toBe('base64_png');
    expect(qrResult.qr_data).toBeTruthy();
    expect(qrResult.numeric_code).toMatch(/^\d{6}$/);
    expect(qrResult.card_id).toBeTruthy();
    expect(qrResult.expiry_date).toBeTruthy();
    expect(qrResult.security_features).toBeTruthy();

    // Verify QR code contains expected data
    const qrValidationResponse = await page.request.post('/api/v1/test/qr/validate', {
      data: {
        qr_data: qrResult.qr_data
      }
    });

    expect(qrValidationResponse.ok()).toBeTruthy();
    const validation = await qrValidationResponse.json();
    expect(validation.valid).toBeTruthy();
    expect(validation.user_id).toBe('test_qr_user');
    expect(validation.card_id).toBe(qrResult.card_id);
    expect(validation.card_status).toBe('active');

    // Test QR code security features
    const securityCheckResponse = await page.request.post('/api/v1/test/qr/security-check', {
      data: {
        qr_data: qrResult.qr_data,
        check_timestamp: true,
        check_signature: true,
        check_integrity: true
      }
    });

    expect(securityCheckResponse.ok()).toBeTruthy();
    const securityCheck = await securityCheckResponse.json();
    expect(securityCheck.timestamp_valid).toBeTruthy();
    expect(securityCheck.signature_valid).toBeTruthy();
    expect(securityCheck.integrity_valid).toBeTruthy();
    expect(securityCheck.not_expired).toBeTruthy();

    console.log('✅ QR Code Generation and Validation Tests Completed');
  });

  test('numeric code entry and verification', async ({ page }) => {
    console.log('📱 Testing Numeric Code Entry and Verification');

    // Generate virtual card
    const cardGenerationResponse = await page.request.post('/api/v1/test/telegram/virtual-card/generate', {
      data: {
        user_id: 'test_numeric_user',
        card_type: 'loyalty'
      }
    });

    expect(cardGenerationResponse.ok()).toBeTruthy();
    const cardResult = await cardGenerationResponse.json();
    const numericCode = cardResult.numeric_code;

    // Test numeric code validation
    const numericValidationResponse = await page.request.post('/api/v1/test/numeric/validate', {
      data: {
        numeric_code: numericCode
      }
    });

    expect(numericValidationResponse.ok()).toBeTruthy();
    const numericValidation = await numericValidationResponse.json();
    expect(numericValidation.valid).toBeTruthy();
    expect(numericValidation.user_id).toBe('test_numeric_user');
    expect(numericValidation.card_id).toBe(cardResult.card_id);

    // Test invalid numeric codes
    const invalidCodes = [
      '12345',           // Too short
      '12345678',        // Too long
      'abcdefg',         // Non-numeric
      '000000',          // All zeros (likely invalid)
      '999999',          // All nines (likely invalid)
      ''                 // Empty
    ];

    for (const invalidCode of invalidCodes) {
      const invalidResponse = await page.request.post('/api/v1/test/numeric/validate', {
        data: {
          numeric_code: invalidCode
        }
      });

      expect(invalidResponse.ok()).toBeTruthy();
      const invalidResult = await invalidResponse.json();
      expect(invalidResult.valid).toBeFalsy();
      expect(invalidResult.error_code).toBeTruthy();
    }

    // Test numeric code format validation
    const formatTestResponse = await page.request.post('/api/v1/test/numeric/format-check', {
      data: {
        numeric_code: numericCode
      }
    });

    expect(formatTestResponse.ok()).toBeTruthy();
    const formatResult = await formatTestResponse.json();
    expect(formatResult.valid_format).toBeTruthy();
    expect(formatResult.checksum_valid).toBeTruthy();
    expect(formatResult.not_expired).toBeTruthy();

    console.log('✅ Numeric Code Entry and Verification Tests Completed');
  });

  test('POS cashier flow with QR and manual entry', async ({ page }) => {
    console.log('📱 Testing POS Cashier Flow');

    // Setup user with virtual card
    const setupResponse = await page.request.post('/api/v1/test/telegram/complete-setup', {
      data: {
        user_id: 'test_pos_user',
        phone: '+1234567890',
        generate_card: true
      }
    });

    expect(setupResponse.ok()).toBeTruthy();
    const setupResult = await setupResponse.json();
    const qrData = setupResult.qr_data;
    const numericCode = setupResult.numeric_code;

    // Navigate to POS interface
    await page.goto('/admin/pos');
    await expect(page.getByTestId('admin_nav_pos')).toHaveAttribute('aria-selected', 'true');

    // Test QR code identification flow
    console.log('Testing QR Code Identification');
    
    await page.getByTestId('operator_btn_mode_qr_en').click();
    await expect(page.getByText('QR Scanner')).toBeVisible();
    
    // Simulate QR code scan
    await page.getByTestId('operator_input_identify_en').fill(qrData);
    await page.getByTestId('operator_btn_identify_en').click();

    // Verify customer identification
    await expect(page.getByText('Customer Identified')).toBeVisible();
    await expect(page.getByText('test_pos_user')).toBeVisible();
    await expect(page.getByText('Loyalty Card')).toBeVisible();
    await expect(page.getByTestId('customer_loyalty_status')).toHaveText('Active');

    // Verify loyalty bonus display
    const loyaltyBonus = await page.getByTestId('customer_loyalty_bonus').textContent();
    expect(loyaltyBonus).toBeTruthy();
    expect(loyaltyBonus).toContain('points');

    // Test manual numeric code entry flow
    console.log('Testing Manual Numeric Code Entry');
    
    // Clear previous identification
    await page.getByTestId('operator_btn_clear_customer_en').click();
    
    await page.getByTestId('operator_btn_mode_phone_en').click();
    await expect(page.getByText('Phone/Code Entry')).toBeVisible();
    
    // Enter numeric code
    await page.getByTestId('operator_input_identify_en').fill(numericCode);
    await page.getByTestId('operator_btn_identify_en').click();

    // Verify customer identification via numeric code
    await expect(page.getByText('Customer Identified')).toBeVisible();
    await expect(page.getByText('test_pos_user')).toBeVisible();
    await expect(page.getByText('Loyalty Card')).toBeVisible();

    // Test transaction with loyalty
    console.log('Testing Transaction with Loyalty');
    
    // Add product to cart
    await page.getByTestId('operator_select_product_en').first().click();
    await page.getByTestId('operator_btn_add_to_cart_en').click();
    
    // Verify loyalty bonus applied
    const cartBonus = await page.getByTestId('cart_loyalty_bonus').textContent();
    expect(cartBonus).toBeTruthy();
    
    // Complete transaction
    await page.getByTestId('operator_btn_complete_sale_en').click();
    
    // Verify transaction completion
    await expect(page.getByText('Transaction Complete')).toBeVisible();
    await expect(page.getByText('Loyalty Bonus Applied')).toBeVisible();
    
    // Verify receipt shows loyalty information
    const receiptLoyalty = await page.getByTestId('receipt_loyalty_info').textContent();
    expect(receiptLoyalty).toBeTruthy();
    expect(receiptLoyalty).toContain('bonus');

    console.log('✅ POS Cashier Flow Tests Completed');
  });

  test('card regeneration after deletion', async ({ page }) => {
    console.log('📱 Testing Card Regeneration After Deletion');

    // Generate initial card
    const initialCardResponse = await page.request.post('/api/v1/test/telegram/virtual-card/generate', {
      data: {
        user_id: 'test_regenerate_user',
        card_type: 'loyalty'
      }
    });

    expect(initialCardResponse.ok()).toBeTruthy();
    const initialCard = await initialCardResponse.json();
    const initialCardId = initialCard.card_id;

    // Delete the card
    const deleteCardResponse = await page.request.post('/api/v1/test/telegram/virtual-card/delete', {
      data: {
        user_id: 'test_regenerate_user',
        card_id: initialCardId,
        deletion_reason: 'user_request'
      }
    });

    expect(deleteCardResponse.ok()).toBeTruthy();
    const deleteResult = await deleteCardResponse.json();
    expect(deleteResult.card_deleted).toBeTruthy();
    expect(deleteResult.deletion_recorded).toBeTruthy();

    // Verify card is no longer valid
    const invalidCardResponse = await page.request.post('/api/v1/test/qr/validate', {
      data: {
        qr_data: initialCard.qr_data
      }
    });

    expect(invalidCardResponse.ok()).toBeTruthy();
    const invalidResult = await invalidCardResponse.json();
    expect(invalidResult.valid).toBeFalsy();
    expect(invalidResult.error_code).toBe('CARD_DELETED');

    // Generate new card
    const regeneratedCardResponse = await page.request.post('/api/v1/test/telegram/virtual-card/generate', {
      data: {
        user_id: 'test_regenerate_user',
        card_type: 'loyalty',
        reason: 'regeneration'
      }
    });

    expect(regeneratedCardResponse.ok()).toBeTruthy();
    const regeneratedCard = await regeneratedCardResponse.json();

    // Verify new card is different from old card
    expect(regeneratedCard.card_id).not.toBe(initialCardId);
    expect(regeneratedCard.qr_data).not.toBe(initialCard.qr_data);
    expect(regeneratedCard.numeric_code).not.toBe(initialCard.numeric_code);

    // Verify new card is valid
    const newCardValidationResponse = await page.request.post('/api/v1/test/qr/validate', {
      data: {
        qr_data: regeneratedCard.qr_data
      }
    });

    expect(newCardValidationResponse.ok()).toBeTruthy();
    const newValidation = await newCardValidationResponse.json();
    expect(newValidation.valid).toBeTruthy();
    expect(newValidation.user_id).toBe('test_regenerate_user');

    // Verify card history is maintained
    const historyResponse = await page.request.get('/api/v1/test/telegram/virtual-card/history', {
      params: { user_id: 'test_regenerate_user' }
    });

    expect(historyResponse.ok()).toBeTruthy();
    const history = await historyResponse.json();
    expect(history.card_history).toHaveLength(2);
    expect(history.card_history[0].card_id).toBe(initialCardId);
    expect(history.card_history[0].status).toBe('deleted');
    expect(history.card_history[1].card_id).toBe(regeneratedCard.card_id);
    expect(history.card_history[1].status).toBe('active');

    console.log('✅ Card Regeneration After Deletion Tests Completed');
  });

  test('card security and anti-fraud measures', async ({ page }) => {
    console.log('📱 Testing Card Security and Anti-Fraud Measures');

    // Generate card for security testing
    const securityCardResponse = await page.request.post('/api/v1/test/telegram/virtual-card/generate', {
      data: {
        user_id: 'test_security_user',
        card_type: 'loyalty'
      }
    });

    expect(securityCardResponse.ok()).toBeTruthy();
    const securityCard = await securityCardResponse.json();

    // Test rate limiting on card validation attempts
    console.log('Testing Rate Limiting');
    
    const rapidAttempts = [];
    for (let i = 0; i < 10; i++) {
      rapidAttempts.push(
        page.request.post('/api/v1/test/qr/validate', {
          data: {
            qr_data: securityCard.qr_data + 'invalid' // Invalid data
          }
        })
      );
    }

    const rapidResponses = await Promise.all(rapidAttempts);
    
    let rateLimitedCount = 0;
    for (const response of rapidResponses) {
      const result = await response.json();
      if (result.rate_limited) {
        rateLimitedCount++;
      }
    }
    
    expect(rateLimitedCount).toBeGreaterThan(0);

    // Test geographic location validation
    const geoTestResponse = await page.request.post('/api/v1/test/qr/geo-validation', {
      data: {
        qr_data: securityCard.qr_data,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          country: 'US'
        }
      }
    });

    expect(geoTestResponse.ok()).toBeTruthy();
    const geoResult = await geoTestResponse.json();
    expect(geoResult.location_valid).toBeTruthy();

    // Test suspicious location detection
    const suspiciousGeoResponse = await page.request.post('/api/v1/test/qr/geo-validation', {
      data: {
        qr_data: securityCard.qr_data,
        location: {
          latitude: 0,
          longitude: 0,
          country: 'XX' // Invalid country
        }
      }
    });

    expect(suspiciousGeoResponse.ok()).toBeTruthy();
    const suspiciousResult = await suspiciousGeoResponse.json();
    expect(suspiciousResult.location_suspicious).toBeTruthy();
    expect(suspiciousResult.additional_verification_required).toBeTruthy();

    // Test concurrent usage detection
    const concurrentUsageResponse = await page.request.post('/api/v1/test/qr/concurrent-usage', {
      data: {
        qr_data: securityCard.qr_data,
        simulate_concurrent: true,
        locations: [
          { latitude: 40.7128, longitude: -74.0060 },
          { latitude: 51.5074, longitude: -0.1278 }
        ]
      }
    });

    expect(concurrentUsageResponse.ok()).toBeTruthy();
    const concurrentResult = await concurrentUsageResponse.json();
    expect(concurrentResult.concurrent_usage_detected).toBeTruthy();
    expect(concurrentResult.card_temporarily_locked).toBeTruthy();

    // Test card lock/unlock functionality
    const lockStatusResponse = await page.request.get('/api/v1/test/telegram/virtual-card/lock-status', {
      params: { user_id: 'test_security_user' }
    });

    expect(lockStatusResponse.ok()).toBeTruthy();
    const lockStatus = await lockStatusResponse.json();
    expect(lockStatus.locked).toBeTruthy();
    expect(lockStatus.lock_reason).toContain('concurrent_usage');

    // Unlock card for legitimate use
    const unlockResponse = await page.request.post('/api/v1/test/telegram/virtual-card/unlock', {
      data: {
        user_id: 'test_security_user',
        unlock_reason: 'false_positive_resolved',
        admin_override: true
      }
    });

    expect(unlockResponse.ok()).toBeTruthy();
    const unlockResult = await unlockResponse.json();
    expect(unlockResult.card_unlocked).toBeTruthy();
    expect(unlockResult.unlock_recorded).toBeTruthy();

    console.log('✅ Card Security and Anti-Fraud Measures Tests Completed');
  });

  test('card status management', async ({ page }) => {
    console.log('📱 Testing Card Status Management');

    // Generate card for status testing
    const statusCardResponse = await page.request.post('/api/v1/test/telegram/virtual-card/generate', {
      data: {
        user_id: 'test_status_user',
        card_type: 'loyalty'
      }
    });

    expect(statusCardResponse.ok()).toBeTruthy();
    const statusCard = await statusCardResponse.json();

    // Test initial status
    const initialStatusResponse = await page.request.get('/api/v1/test/telegram/virtual-card/status', {
      params: { card_id: statusCard.card_id }
    });

    expect(initialStatusResponse.ok()).toBeTruthy();
    const initialStatus = await initialStatusResponse.json();
    expect(initialStatus.status).toBe('active');
    expect(initialStatus.activated_at).toBeTruthy();

    // Test card suspension
    const suspendResponse = await page.request.post('/api/v1/test/telegram/virtual-card/suspend', {
      data: {
        card_id: statusCard.card_id,
        suspension_reason: 'suspicious_activity',
        duration_days: 7
      }
    });

    expect(suspendResponse.ok()).toBeTruthy();
    const suspendResult = await suspendResponse.json();
    expect(suspendResult.card_suspended).toBeTruthy();
    expect(suspendResult.suspension_end_date).toBeTruthy();

    // Verify suspended status
    const suspendedStatusResponse = await page.request.get('/api/v1/test/telegram/virtual-card/status', {
      params: { card_id: statusCard.card_id }
    });

    expect(suspendedStatusResponse.ok()).toBeTruthy();
    const suspendedStatus = await suspendedStatusResponse.json();
    expect(suspendedStatus.status).toBe('suspended');
    expect(suspendedStatus.suspension_reason).toBe('suspicious_activity');

    // Test card validation while suspended
    const suspendedValidationResponse = await page.request.post('/api/v1/test/qr/validate', {
      data: {
        qr_data: statusCard.qr_data
      }
    });

    expect(suspendedValidationResponse.ok()).toBeTruthy();
    const suspendedValidation = await suspendedValidationResponse.json();
    expect(suspendedValidation.valid).toBeFalsy();
    expect(suspendedValidation.error_code).toBe('CARD_SUSPENDED');

    // Test card reactivation
    const reactivateResponse = await page.request.post('/api/v1/test/telegram/virtual-card/reactivate', {
      data: {
        card_id: statusCard.card_id,
        reactivation_reason: 'investigation_completed'
      }
    });

    expect(reactivateResponse.ok()).toBeTruthy();
    const reactivateResult = await reactivateResponse.json();
    expect(reactivateResult.card_reactivated).toBeTruthy();

    // Verify reactivated status
    const reactivatedStatusResponse = await page.request.get('/api/v1/test/telegram/virtual-card/status', {
      params: { card_id: statusCard.card_id }
    });

    expect(reactivatedStatusResponse.ok()).toBeTruthy();
    const reactivatedStatus = await reactivatedStatusResponse.json();
    expect(reactivatedStatus.status).toBe('active');
    expect(reactivatedStatus.reactivated_at).toBeTruthy();

    // Test card expiration
    const expireResponse = await page.request.post('/api/v1/test/telegram/virtual-card/expire', {
      data: {
        card_id: statusCard.card_id,
        expiration_reason: 'card_replacement'
      }
    });

    expect(expireResponse.ok()).toBeTruthy();
    const expireResult = await expireResponse.json();
    expect(expireResult.card_expired).toBeTruthy();

    // Verify expired status
    const expiredStatusResponse = await page.request.get('/api/v1/test/telegram/virtual-card/status', {
      params: { card_id: statusCard.card_id }
    });

    expect(expiredStatusResponse.ok()).toBeTruthy();
    const expiredStatus = await expiredStatusResponse.json();
    expect(expiredStatus.status).toBe('expired');
    expect(expiredStatus.expired_at).toBeTruthy();

    console.log('✅ Card Status Management Tests Completed');
  });

  test('card analytics and reporting', async ({ page }) => {
    console.log('📱 Testing Card Analytics and Reporting');

    // Generate multiple cards for analytics testing
    const cardIds = [];
    for (let i = 0; i < 5; i++) {
      const cardResponse = await page.request.post('/api/v1/test/telegram/virtual-card/generate', {
        data: {
          user_id: `test_analytics_user_${i}`,
          card_type: 'loyalty'
        }
      });

      expect(cardResponse.ok()).toBeTruthy();
      const cardResult = await cardResponse.json();
      cardIds.push(cardResult.card_id);
    }

    // Simulate card usage
    for (const cardId of cardIds) {
      await page.request.post('/api/v1/test/telegram/virtual-card/usage', {
        data: {
          card_id: cardId,
          usage_type: 'transaction',
          amount: 100,
          location: 'store_a'
        }
      });
    }

    // Test card usage analytics
    const analyticsResponse = await page.request.get('/api/v1/test/analytics/card-usage');
    expect(analyticsResponse.ok()).toBeTruthy();
    const analytics = await analyticsResponse.json();
    
    expect(analytics.total_cards).toBeGreaterThanOrEqual(5);
    expect(analytics.active_cards).toBeGreaterThanOrEqual(5);
    expect(analytics.total_transactions).toBeGreaterThanOrEqual(5);
    expect(analytics.usage_by_location).toBeTruthy();
    expect(analytics.usage_trends).toBeTruthy();

    // Test card performance metrics
    const performanceResponse = await page.request.get('/api/v1/test/analytics/card-performance');
    expect(performanceResponse.ok()).toBeTruthy();
    const performance = await performanceResponse.json();
    
    expect(performance.average_transactions_per_card).toBeTruthy();
    expect(performance.card_success_rate).toBeGreaterThan(0.95);
    expect(performance.qr_scan_success_rate).toBeGreaterThan(0.95);
    expect(performance.numeric_entry_success_rate).toBeGreaterThan(0.95);

    // Test fraud detection metrics
    const fraudMetricsResponse = await page.request.get('/api/v1/test/analytics/fraud-metrics');
    expect(fraudMetricsResponse.ok()).toBeTruthy();
    const fraudMetrics = await fraudMetricsResponse.json();
    
    expect(fraudMetrics.suspicious_activities_detected).toBeTruthy();
    expect(fraudMetrics.false_positive_rate).toBeLessThan(0.05);
    expect(fraudMetrics.blocked_attempts).toBeTruthy();
    expect(fraudMetrics.investigations_opened).toBeTruthy();

    console.log('✅ Card Analytics and Reporting Tests Completed');
  });
});
