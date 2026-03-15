import { expect, test } from '@playwright/test';
import { login, resetTestDatabase, attachConsole } from '../_shared';

/**
 * 🔒 Green House Loyalty Demo – Consent & Privacy Compliance Tests
 * 
 * This test covers privacy compliance requirements:
 * - GDPR/152-ФЗ compliance verification
 * - Consent versioning and audit trail
 * - Data retention and deletion policies
 * - Privacy policy accessibility
 * - Consent withdrawal handling
 * - Data export functionality
 * 
 * Architect Recommendations:
 * - Research privacy compliance (GDPR/152-ФЗ) for consent flows
 * - Implement proper consent versioning
 * - Ensure audit trail completeness
 * 
 * QA Recommendations:
 * - Should welcome message include explicit privacy link every time?
 * - What happens if user refuses consent? Is deletion enforced?
 */

test.describe('Green House Loyalty Demo - Privacy Compliance', () => {
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

  test('GDPR and 152-ФЗ compliance verification', async ({ page }) => {
    console.log('🔒 Testing GDPR and 152-ФЗ Compliance');

    // Verify privacy policy page accessibility and content
    await page.goto('/privacy');
    await expect(page.getByText('Privacy Policy')).toBeVisible();
    
    // Check for required compliance elements
    await expect(page.getByText('GDPR')).toBeVisible();
    await expect(page.getByText('152-ФЗ')).toBeVisible();
    await expect(page.getByText('Data Processing')).toBeVisible();
    await expect(page.getByText('User Rights')).toBeVisible();
    
    // Verify legal basis for processing
    await expect(page.getByText('Legal Basis')).toBeVisible();
    await expect(page.getByText('Consent')).toBeVisible();
    
    // Check data retention policies
    await expect(page.getByText('Data Retention')).toBeVisible();
    await expect(page.getByText('Storage Period')).toBeVisible();
    
    // Verify contact information for data protection officer
    await expect(page.getByText('Data Protection Officer')).toBeVisible();
    await expect(page.getByText('Contact Information')).toBeVisible();

    // Test secure HTTPS serving
    const response = await page.request.get('/privacy');
    expect(response.ok()).toBeTruthy();
    expect(response.url()).toMatch(/^https:\/\//);
    
    // Verify security headers
    const headers = response.headers();
    expect(headers['strict-transport-security']).toBeTruthy();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBeTruthy();

    console.log('✅ GDPR and 152-ФЗ Compliance Verified');
  });

  test('consent versioning and audit trail', async ({ page }) => {
    console.log('🔒 Testing Consent Versioning and Audit Trail');

    // Create initial consent with version 1.0
    const consentV1Response = await page.request.post('/api/v1/test/telegram/consent', {
      data: {
        user_id: 'test_consent_versioning',
        consent: true,
        consent_version: '1.0',
        consent_text: 'Initial consent text version 1.0'
      }
    });

    expect(consentV1Response.ok()).toBeTruthy();
    const v1Result = await consentV1Response.json();
    expect(v1Result.consent_stored).toBeTruthy();
    expect(v1Result.consent_version).toBe('1.0');
    expect(v1Result.consent_id).toBeTruthy();

    // Update consent with version 2.0
    const consentV2Response = await page.request.post('/api/v1/test/telegram/consent', {
      data: {
        user_id: 'test_consent_versioning',
        consent: true,
        consent_version: '2.0',
        consent_text: 'Updated consent text version 2.0 with additional clauses'
      }
    });

    expect(consentV2Response.ok()).toBeTruthy();
    const v2Result = await consentV2Response.json();
    expect(v2Result.consent_stored).toBeTruthy();
    expect(v2Result.consent_version).toBe('2.0');
    expect(v2Result.previous_consent_archived).toBeTruthy();

    // Verify audit trail completeness
    const auditResponse = await page.request.get('/api/v1/test/consent/audit-trail', {
      params: { user_id: 'test_consent_versioning' }
    });

    expect(auditResponse.ok()).toBeTruthy();
    const auditData = await auditResponse.json();
    
    expect(auditData.audit_entries).toHaveLength(2);
    expect(auditData.audit_entries[0].version).toBe('1.0');
    expect(auditData.audit_entries[1].version).toBe('2.0');
    
    // Verify audit trail contains required fields
    for (const entry of auditData.audit_entries) {
      expect(entry.timestamp).toBeTruthy();
      expect(entry.user_id).toBe('test_consent_versioning');
      expect(entry.consent_given).toBeTruthy();
      expect(entry.ip_address).toBeTruthy();
      expect(entry.user_agent).toBeTruthy();
    }

    // Test consent history retrieval
    const historyResponse = await page.request.get('/api/v1/test/consent/history', {
      params: { user_id: 'test_consent_versioning' }
    });

    expect(historyResponse.ok()).toBeTruthy();
    const historyData = await historyResponse.json();
    expect(historyData.current_version).toBe('2.0');
    expect(historyData.previous_versions).toHaveLength(1);
    expect(historyData.previous_versions[0].version).toBe('1.0');

    console.log('✅ Consent Versioning and Audit Trail Tests Completed');
  });

  test('consent refusal and data deletion enforcement', async ({ page }) => {
    console.log('🔒 Testing Consent Refusal and Data Deletion');

    // Test consent refusal
    const refusalResponse = await page.request.post('/api/v1/test/telegram/consent', {
      data: {
        user_id: 'test_consent_refusal',
        consent: false,
        consent_version: '1.0'
      }
    });

    expect(refusalResponse.ok()).toBeTruthy();
    const refusalResult = await refusalResponse.json();
    expect(refusalResult.consent_refused).toBeTruthy();
    expect(refusalResult.data_deletion_scheduled).toBeTruthy();

    // Verify user data is not processed after refusal
    const profileResponse = await page.request.post('/api/v1/test/telegram/profile', {
      data: {
        user_id: 'test_consent_refusal',
        name: 'Test User',
        email: 'test@example.com'
      }
    });

    expect(profileResponse.ok()).toBeTruthy();
    const profileResult = await profileResponse.json();
    expect(profileResult.success).toBeFalsy();
    expect(profileResult.error_code).toBe('CONSENT_REQUIRED');
    expect(profileResult.data_not_stored).toBeTruthy();

    // Verify data deletion enforcement
    const deletionStatusResponse = await page.request.get('/api/v1/test/data/deletion-status', {
      params: { user_id: 'test_consent_refusal' }
    });

    expect(deletionStatusResponse.ok()).toBeTruthy();
    const deletionStatus = await deletionStatusResponse.json();
    expect(deletionStatus.deletion_enforced).toBeTruthy();
    expect(deletionStatus.all_data_removed).toBeTruthy();

    // Test partial data scenario (user gave consent for some features but not others)
    const partialConsentResponse = await page.request.post('/api/v1/test/telegram/consent', {
      data: {
        user_id: 'test_partial_consent',
        consent: {
          marketing: false,
          analytics: true,
          loyalty: true
        },
        consent_version: '1.0'
      }
    });

    expect(partialConsentResponse.ok()).toBeTruthy();
    const partialResult = await partialConsentResponse.json();
    expect(partialResult.partial_consent).toBeTruthy();
    expect(partialResult.processing_scope).toEqual(['analytics', 'loyalty']);
    expect(partialResult.excluded_scope).toEqual(['marketing']);

    console.log('✅ Consent Refusal and Data Deletion Tests Completed');
  });

  test('data retention and deletion policies', async ({ page }) => {
    console.log('🔒 Testing Data Retention and Deletion Policies');

    // Create user with data
    const userDataResponse = await page.request.post('/api/v1/test/telegram/complete-registration', {
      data: {
        user_id: 'test_data_retention',
        phone: '+1234567890',
        email: 'retention@example.com',
        profile_data: {
          name: 'Test User',
          birthday: '1990-01-01',
          city: 'Test City'
        }
      }
    });

    expect(userDataResponse.ok()).toBeTruthy();

    // Verify retention periods are set
    const retentionCheckResponse = await page.request.get('/api/v1/test/data/retention-info', {
      params: { user_id: 'test_data_retention' }
    });

    expect(retentionCheckResponse.ok()).toBeTruthy();
    const retentionInfo = await retentionCheckResponse.json();
    
    expect(retentionInfo.retention_periods).toBeTruthy();
    expect(retentionInfo.retention_periods.personal_data).toBe('7_years');
    expect(retentionInfo.retention_periods.analytics_data).toBe('2_years');
    expect(retentionInfo.retention_periods.marketing_consent).toBe('until_withdrawn');

    // Test automatic deletion of expired data
    const autoDeletionResponse = await page.request.post('/api/v1/test/data/auto-deletion', {
      data: {
        simulate_expiry: true,
        data_type: 'analytics'
      }
    });

    expect(autoDeletionResponse.ok()).toBeTruthy();
    const deletionResult = await autoDeletionResponse.json();
    expect(deletionResult.expired_data_identified).toBeTruthy();
    expect(deletionResult.deletion_executed).toBeTruthy();
    expect(deletionResult.deleted_records).toBeGreaterThan(0);

    // Test right to be forgotten (explicit deletion request)
    const rtbfResponse = await page.request.post('/api/v1/test/data/right-to-be-forgotten', {
      data: {
        user_id: 'test_data_retention',
        deletion_reason: 'user_request',
        confirmation: true
      }
    });

    expect(rtbfResponse.ok()).toBeTruthy();
    const rtbfResult = await rtbfResponse.json();
    expect(rtbfResult.deletion_initiated).toBeTruthy();
    expect(rtbfResult.all_systems_notified).toBeTruthy();
    expect(rtbfResult.backup_deletion_scheduled).toBeTruthy();

    // Verify data is actually deleted
    const verificationResponse = await page.request.get('/api/v1/test/data/user-exists', {
      params: { user_id: 'test_data_retention' }
    });

    expect(verificationResponse.ok()).toBeTruthy();
    const verificationResult = await verificationResponse.json();
    expect(verificationResult.user_exists).toBeFalsy();
    expect(verificationResult.all_data_removed).toBeTruthy();

    console.log('✅ Data Retention and Deletion Policy Tests Completed');
  });

  test('data export functionality', async ({ page }) => {
    console.log('🔒 Testing Data Export Functionality');

    // Create comprehensive user data
    const comprehensiveDataResponse = await page.request.post('/api/v1/test/telegram/comprehensive-data', {
      data: {
        user_id: 'test_data_export',
        consent: true,
        contact: {
          phone: '+1234567890',
          email: 'export@example.com'
        },
        profile: {
          name: 'Export Test User',
          gender: 'female',
          birthday: '1985-05-15',
          city: 'Export City'
        },
        loyalty: {
          registered: true,
          bonus_points: 500,
          transactions: 10
        },
        marketing: {
          consent: true,
          campaigns_participated: 3
        }
      }
    });

    expect(comprehensiveDataResponse.ok()).toBeTruthy();

    // Test data export request
    const exportRequestResponse = await page.request.post('/api/v1/test/data/export-request', {
      data: {
        user_id: 'test_data_export',
        format: 'json',
        include_all_data: true
      }
    });

    expect(exportRequestResponse.ok()).toBeTruthy();
    const exportRequest = await exportRequestResponse.json();
    expect(exportRequest.export_initiated).toBeTruthy();
    expect(exportRequest.export_id).toBeTruthy();
    expect(exportRequest.estimated_completion).toBeTruthy();

    // Wait for export completion (simulated)
    await page.waitForTimeout(1000);

    // Retrieve exported data
    const exportDataResponse = await page.request.get('/api/v1/test/data/export-download', {
      params: { export_id: exportRequest.export_id }
    });

    expect(exportDataResponse.ok()).toBeTruthy();
    const exportData = await exportDataResponse.json();
    
    // Verify exported data completeness
    expect(exportData.user_data).toBeTruthy();
    expect(exportData.user_data.personal_information).toBeTruthy();
    expect(exportData.user_data.consent_records).toBeTruthy();
    expect(exportData.user_data.loyalty_data).toBeTruthy();
    expect(exportData.user_data.transaction_history).toBeTruthy();
    expect(exportData.user_data.marketing_interactions).toBeTruthy();

    // Verify data format compliance
    expect(exportData.format).toBe('json');
    expect(exportData.export_timestamp).toBeTruthy();
    expect(exportData.data_version).toBeTruthy();

    // Test export in different formats
    const formats = ['csv', 'xml'];
    for (const format of formats) {
      const formatExportResponse = await page.request.post('/api/v1/test/data/export-request', {
        data: {
          user_id: 'test_data_export',
          format: format,
          include_all_data: true
        }
      });

      expect(formatExportResponse.ok()).toBeTruthy();
      const formatResult = await formatExportResponse.json();
      expect(formatResult.export_initiated).toBeTruthy();
      expect(formatResult.format).toBe(format);
    }

    console.log('✅ Data Export Functionality Tests Completed');
  });

  test('consent withdrawal and processing updates', async ({ page }) => {
    console.log('🔒 Testing Consent Withdrawal and Processing Updates');

    // Initial consent for all processing
    const initialConsentResponse = await page.request.post('/api/v1/test/telegram/consent', {
      data: {
        user_id: 'test_consent_withdrawal',
        consent: {
          marketing: true,
          analytics: true,
          loyalty: true,
          profiling: true
        },
        consent_version: '1.0'
      }
    });

    expect(initialConsentResponse.ok()).toBeTruthy();

    // Process user data with full consent
    const processDataResponse = await page.request.post('/api/v1/test/telegram/process-data', {
      data: {
        user_id: 'test_consent_withdrawal',
        operations: ['marketing_campaign', 'analytics_tracking', 'loyalty_bonus', 'profiling']
      }
    });

    expect(processDataResponse.ok()).toBeTruthy();
    const processResult = await processDataResponse.json();
    expect(processResult.all_operations_successful).toBeTruthy();

    // Withdraw marketing consent
    const withdrawalResponse = await page.request.post('/api/v1/test/telegram/consent-withdraw', {
      data: {
        user_id: 'test_consent_withdrawal',
        withdrawn_consent: ['marketing', 'profiling'],
        withdrawal_reason: 'user_preference',
        consent_version: '1.1'
      }
    });

    expect(withdrawalResponse.ok()).toBeTruthy();
    const withdrawalResult = await withdrawalResponse.json();
    expect(withdrawalResult.consent_updated).toBeTruthy();
    expect(withdrawalResult.processing_stopped).toBeTruthy();
    expect(withdrawalResult.affected_systems).toContain('marketing');
    expect(withdrawalResult.affected_systems).toContain('profiling');

    // Verify processing updates after withdrawal
    const updatedProcessingResponse = await page.request.post('/api/v1/test/telegram/process-data', {
      data: {
        user_id: 'test_consent_withdrawal',
        operations: ['marketing_campaign', 'analytics_tracking', 'loyalty_bonus', 'profiling']
      }
    });

    expect(updatedProcessingResponse.ok()).toBeTruthy();
    const updatedResult = await updatedProcessingResponse.json();
    expect(updatedResult.successful_operations).toEqual(['analytics_tracking', 'loyalty_bonus']);
    expect(updatedResult.blocked_operations).toEqual(['marketing_campaign', 'profiling']);
    expect(updatedResult.blocked_operations[0].reason).toBe('CONSENT_WITHDRAWN');

    // Verify data cleanup for withdrawn consent
    const cleanupResponse = await page.request.get('/api/v1/test/data/cleanup-status', {
      params: { user_id: 'test_consent_withdrawal' }
    });

    expect(cleanupResponse.ok()).toBeTruthy();
    const cleanupResult = await cleanupResponse.json();
    expect(cleanupResult.marketing_data_removed).toBeTruthy();
    expect(cleanupResult.profiling_data_removed).toBeTruthy();
    expect(cleanupResult.loyalty_data_preserved).toBeTruthy();
    expect(cleanupResult.analytics_data_preserved).toBeTruthy();

    console.log('✅ Consent Withdrawal and Processing Updates Tests Completed');
  });

  test('privacy policy updates and user notification', async ({ page }) => {
    console.log('🔒 Testing Privacy Policy Updates and User Notification');

    // Create user with existing consent
    const existingUserResponse = await page.request.post('/api/v1/test/telegram/complete-registration', {
      data: {
        user_id: 'test_policy_update',
        consent_version: '1.0',
        consent_text: 'Original privacy policy text'
      }
    });

    expect(existingUserResponse.ok()).toBeTruthy();

    // Update privacy policy
    const policyUpdateResponse = await page.request.post('/api/v1/test/privacy/policy-update', {
      data: {
        new_version: '2.0',
        update_summary: 'Added new data processing activities and updated retention periods',
        changes: [
          'Added analytics processing',
          'Extended data retention from 5 to 7 years',
          'Added cookie policy section'
        ],
        effective_date: '2024-12-01'
      }
    });

    expect(policyUpdateResponse.ok()).toBeTruthy();
    const updateResult = await policyUpdateResponse.json();
    expect(updateResult.policy_updated).toBeTruthy();
    expect(updateResult.users_notified).toBeTruthy();

    // Verify user notification system
    const notificationResponse = await page.request.get('/api/v1/test/notifications/pending', {
      params: { user_id: 'test_policy_update' }
    });

    expect(notificationResponse.ok()).toBeTruthy();
    const notifications = await notificationResponse.json();
    expect(notifications.pending_notifications).toHaveLength(1);
    expect(notifications.pending_notifications[0].type).toBe('privacy_policy_update');
    expect(notifications.pending_notifications[0].new_version).toBe('2.0');

    // Test user response to policy update
    const userResponse = await page.request.post('/api/v1/test/telegram/policy-update-response', {
      data: {
        user_id: 'test_policy_update',
        response: 'accept',
        new_consent_version: '2.0'
      }
    });

    expect(userResponse.ok()).toBeTruthy();
    const responseResult = await userResponse.json();
    expect(responseResult.consent_updated).toBeTruthy();
    expect(responseResult.new_consent_version).toBe('2.0');

    // Test user rejection of policy update
    const rejectionResponse = await page.request.post('/api/v1/test/telegram/policy-update-response', {
      data: {
        user_id: 'test_policy_update_reject',
        response: 'reject',
        new_consent_version: '2.0'
      }
    });

    expect(rejectionResponse.ok()).toBeTruthy();
    const rejectionResult = await rejectionResponse.json();
    expect(rejectionResult.consent_rejected).toBeTruthy();
    expect(rejectionResult.data_deletion_scheduled).toBeTruthy();

    console.log('✅ Privacy Policy Updates and User Notification Tests Completed');
  });
});
