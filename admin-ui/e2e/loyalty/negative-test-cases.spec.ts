import { expect, test } from '@playwright/test';
import { attachConsole, login, resetTestDatabase } from '../_shared';

/**
 * 🚫 Green House Loyalty Demo – Negative Test Cases
 * 
 * This test covers error scenarios and edge cases:
 * - Invalid input handling
 * - Expired bonuses
 * - Disabled users
 * - Network failures
 * - Duplicate registrations
 * - Security violations
 * 
 * QA Recommendations:
 * - Define negative test cases for invalid input, expired bonus, disabled user
 * - Test error handling and user feedback
 * - Verify system recovery from failures
 */

test.describe.skip('Green House Loyalty Demo - Negative Tests', () => {
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

  test('invalid input handling', async ({ page }) => {
    console.log('🚫 Testing Invalid Input Handling');

    // Test invalid phone numbers
    const invalidPhones = [
      'abc123',           // Non-numeric
      '123',              // Too short
      '1234567890123456', // Too long
      '+0',               // Invalid country code
      ''                  // Empty
    ];

    for (const invalidPhone of invalidPhones) {
      const response = await page.request.post('/api/v1/test/telegram/contact', {
        data: {
          user_id: 'test_invalid_phone',
          phone: invalidPhone,
          share_method: 'typed'
        }
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.success).toBeFalsy();
      expect(result.error_code).toBe('INVALID_PHONE');
      expect(result.error_message).toBeTruthy();
    }

    // Test invalid email addresses
    const invalidEmails = [
      'invalid-email',
      '@domain.com',
      'user@',
      'user..name@domain.com',
      ''
    ];

    for (const invalidEmail of invalidEmails) {
      const response = await page.request.post('/api/v1/test/telegram/profile', {
        data: {
          user_id: 'test_invalid_email',
          email: invalidEmail,
          name: 'Test User'
        }
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.validation_passed).toBeFalsy();
      expect(result.field_errors).toContain('email');
    }

    // Test invalid dates
    const invalidDates = [
      '1990-02-30', // Invalid date
      '2025-13-01', // Invalid month
      '1990-01-32', // Invalid day
      'future-date-2025', // Future date
      ''            // Empty date
    ];

    for (const invalidDate of invalidDates) {
      const response = await page.request.post('/api/v1/test/telegram/profile', {
        data: {
          user_id: 'test_invalid_date',
          birthday: invalidDate,
          name: 'Test User'
        }
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.validation_passed).toBeFalsy();
      expect(result.field_errors).toContain('birthday');
    }

    console.log('✅ Invalid Input Handling Tests Completed');
  });

  test('expired bonus scenarios', async ({ page }) => {
    console.log('🚫 Testing Expired Bonus Scenarios');

    // Create a user with expired bonus
    const expiredBonusResponse = await page.request.post('/api/v1/test/telegram/expired-bonus-setup', {
      data: {
        user_id: 'test_expired_bonus',
        bonus_expiry_days: -1 // Expired yesterday
      }
    });

    expect(expiredBonusResponse.ok()).toBeTruthy();

    // Try to use expired bonus
    const useExpiredBonusResponse = await page.request.post('/api/v1/test/telegram/use-bonus', {
      data: {
        user_id: 'test_expired_bonus',
        bonus_amount: 100
      }
    });

    expect(useExpiredBonusResponse.ok()).toBeTruthy();
    const result = await useExpiredBonusResponse.json();
    expect(result.success).toBeFalsy();
    expect(result.error_code).toBe('BONUS_EXPIRED');
    expect(result.error_message).toContain('expired');

    // Verify expired bonus handling in POS
    await page.goto('/admin/pos');
    await expect(page.getByTestId('admin_nav_pos')).toHaveAttribute('aria-selected', 'true');

    // Try to identify customer with expired bonus
    await page.getByTestId('operator_btn_mode_phone_en').click();
    await page.getByTestId('operator_input_identify_en').fill('test_expired_bonus');
    await page.getByTestId('operator_btn_identify_en').click();

    // Should show expired bonus warning
    await expect(page.getByText('Bonus Expired')).toBeVisible();
    await expect(page.getByText('Bonus cannot be used')).toBeVisible();

    console.log('✅ Expired Bonus Scenarios Tests Completed');
  });

  test('disabled user handling', async ({ page }) => {
    console.log('🚫 Testing Disabled User Handling');

    // Create a disabled user
    const disabledUserResponse = await page.request.post('/api/v1/test/telegram/disabled-user-setup', {
      data: {
        user_id: 'test_disabled_user',
        status: 'disabled',
        reason: 'violation'
      }
    });

    expect(disabledUserResponse.ok()).toBeTruthy();

    // Try to start registration with disabled user
    const startResponse = await page.request.post('/api/v1/test/telegram/start', {
      data: {
        user_id: 'test_disabled_user',
        username: 'disableduser',
        first_name: 'Disabled',
        last_name: 'User'
      }
    });

    expect(startResponse.ok()).toBeTruthy();
    const result = await startResponse.json();
    expect(result.access_denied).toBeTruthy();
    expect(result.error_code).toBe('USER_DISABLED');
    expect(result.error_message).toContain('disabled');

    // Try to process consent for disabled user
    const consentResponse = await page.request.post('/api/v1/test/telegram/consent', {
      data: {
        user_id: 'test_disabled_user',
        consent: true
      }
    });

    expect(consentResponse.ok()).toBeTruthy();
    const consentResult = await consentResponse.json();
    expect(consentResult.success).toBeFalsy();
    expect(consentResult.error_code).toBe('USER_DISABLED');

    console.log('✅ Disabled User Handling Tests Completed');
  });

  test('duplicate registration prevention', async ({ page }) => {
    console.log('🚫 Testing Duplicate Registration Prevention');

    // Complete first registration
    const firstRegistration = await page.request.post('/api/v1/test/telegram/complete-registration', {
      data: {
        user_id: 'test_duplicate_user',
        phone: '+1234567890',
        email: 'duplicate@example.com'
      }
    });

    expect(firstRegistration.ok()).toBeTruthy();
    const firstResult = await firstRegistration.json();
    expect(firstResult.success).toBeTruthy();
    expect(firstResult.loyalty_id).toBeTruthy();

    // Try to register same phone number with different user
    const duplicatePhoneResponse = await page.request.post('/api/v1/test/telegram/complete-registration', {
      data: {
        user_id: 'test_duplicate_user_2',
        phone: '+1234567890', // Same phone
        email: 'different@example.com'
      }
    });

    expect(duplicatePhoneResponse.ok()).toBeTruthy();
    const duplicatePhoneResult = await duplicatePhoneResponse.json();
    expect(duplicatePhoneResult.success).toBeFalsy();
    expect(duplicatePhoneResult.error_code).toBe('PHONE_ALREADY_REGISTERED');

    // Try to register same email with different user
    const duplicateEmailResponse = await page.request.post('/api/v1/test/telegram/complete-registration', {
      data: {
        user_id: 'test_duplicate_user_3',
        phone: '+1987654321',
        email: 'duplicate@example.com' // Same email
      }
    });

    expect(duplicateEmailResponse.ok()).toBeTruthy();
    const duplicateEmailResult = await duplicateEmailResponse.json();
    expect(duplicateEmailResult.success).toBeFalsy();
    expect(duplicateEmailResult.error_code).toBe('EMAIL_ALREADY_REGISTERED');

    console.log('✅ Duplicate Registration Prevention Tests Completed');
  });

  test('security violation tests', async ({ page }) => {
    console.log('🚫 Testing Security Violation Handling');

    // Test SQL injection attempts
    const sqlInjectionAttempts = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users --"
    ];

    for (const injectionAttempt of sqlInjectionAttempts) {
      const response = await page.request.post('/api/v1/test/telegram/profile', {
        data: {
          user_id: injectionAttempt,
          name: injectionAttempt,
          email: injectionAttempt + '@test.com'
        }
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.validation_passed).toBeFalsy();
      expect(result.security_violation).toBeTruthy();
    }

    // Test XSS attempts
    const xssAttempts = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')">',
      '"><script>alert("xss")</script>'
    ];

    for (const xssAttempt of xssAttempts) {
      const response = await page.request.post('/api/v1/test/telegram/profile', {
        data: {
          user_id: 'test_xss',
          name: xssAttempt,
          email: 'xss@test.com'
        }
      });

      expect(response.ok()).toBeTruthy();
      const result = await response.json();
      expect(result.validation_passed).toBeFalsy();
      expect(result.security_violation).toBeTruthy();
    }

    // Test rate limiting
    const rapidRequests = [];
    for (let i = 0; i < 10; i++) {
      rapidRequests.push(
        page.request.post('/api/v1/test/telegram/start', {
          data: {
            user_id: `test_rate_limit_${i}`,
            username: `user${i}`,
            first_name: 'Test',
            last_name: 'User'
          }
        })
      );
    }

    const responses = await Promise.all(rapidRequests);
    
    // Some requests should be rate limited
    let rateLimitedCount = 0;
    for (const response of responses) {
      const result = await response.json();
      if (result.rate_limited) {
        rateLimitedCount++;
      }
    }
    
    expect(rateLimitedCount).toBeGreaterThan(0);

    console.log('✅ Security Violation Tests Completed');
  });

  test('network failure recovery', async ({ page }) => {
    console.log('🚫 Testing Network Failure Recovery');

    // Simulate webhook failure during registration
    const webhookFailureResponse = await page.request.post('/api/v1/test/telegram/webhook-failure', {
      data: {
        simulate_failure: true,
        failure_point: 'consent_storage'
      }
    });

    expect(webhookFailureResponse.ok()).toBeTruthy();
    const failureResult = await webhookFailureResponse.json();
    expect(failureResult.failure_simulated).toBeTruthy();

    // Verify system recovers and retries
    const recoveryResponse = await page.request.post('/api/v1/test/telegram/recovery-test', {
      data: {
        user_id: 'test_recovery',
        retry_failed_operation: true
      }
    });

    expect(recoveryResponse.ok()).toBeTruthy();
    const recoveryResult = await recoveryResponse.json();
    expect(recoveryResult.operation_retried).toBeTruthy();
    expect(recoveryResult.success).toBeTruthy();

    // Test database transaction rollback on failure
    const transactionFailureResponse = await page.request.post('/api/v1/test/telegram/transaction-failure', {
      data: {
        simulate_failure: true,
        failure_point: 'profile_update'
      }
    });

    expect(transactionFailureResponse.ok()).toBeTruthy();
    const transactionResult = await transactionFailureResponse.json();
    expect(transactionResult.transaction_rolled_back).toBeTruthy();
    expect(transactionResult.data_integrity_maintained).toBeTruthy();

    console.log('✅ Network Failure Recovery Tests Completed');
  });

  test('concurrent registration conflicts', async ({ page }) => {
    console.log('🚫 Testing Concurrent Registration Conflicts');

    // Simulate concurrent registrations for same user
    const concurrentRequests = [];
    for (let i = 0; i < 5; i++) {
      concurrentRequests.push(
        page.request.post('/api/v1/test/telegram/loyalty/register', {
          data: {
            user_id: 'test_concurrent_user',
            request_id: i
          }
        })
      );
    }

    const responses = await Promise.all(concurrentRequests);
    
    // Only one should succeed, others should fail with conflict
    let successCount = 0;
    let conflictCount = 0;

    for (const response of responses) {
      const result = await response.json();
      if (result.success) {
        successCount++;
      } else if (result.error_code === 'CONCURRENT_REGISTRATION') {
        conflictCount++;
      }
    }

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(4);

    // Verify data consistency after conflict resolution
    const consistencyCheckResponse = await page.request.get('/api/v1/test/consistency/check', {
      params: { user_id: 'test_concurrent_user' }
    });

    expect(consistencyCheckResponse.ok()).toBeTruthy();
    const consistencyResult = await consistencyCheckResponse.json();
    expect(consistencyResult.data_consistent).toBeTruthy();
    expect(consistencyResult.duplicate_records).toBe(0);

    console.log('✅ Concurrent Registration Conflicts Tests Completed');
  });
});
