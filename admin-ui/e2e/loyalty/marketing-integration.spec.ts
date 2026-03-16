import { expect, test } from '@playwright/test';
import { attachConsole, login, resetTestDatabase } from '../_shared';

/**
 * 📢 Green House Loyalty Demo – Marketing Menu Integration Tests
 * 
 * This test covers marketing functionality:
 * - Channel link functionality
 * - Menu items (FAQ, vacancies, promotions)
 * - CRM campaign triggers
 * - Marketing analytics and reporting
 * - Campaign management
 * - Customer segmentation
 * 
 * Fullstack Recommendations:
 * - Inline menu vs `/menu` web app evaluation
 * - Campaign trigger implementation
 * - Marketing automation setup
 * 
 * QA Recommendations:
 * - Verify channel link works
 * - Campaigns trigger correctly
 * - Menu accessibility testing
 */

test.describe.skip('Green House Loyalty Demo - Marketing Integration', () => {
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

  test('channel link functionality', async ({ page }) => {
    console.log('📢 Testing Channel Link Functionality');

    // Create user for marketing testing
    const userSetupResponse = await page.request.post('/api/v1/test/telegram/complete-registration', {
      data: {
        user_id: 'test_marketing_user',
        phone: '+1234567890',
        email: 'marketing@example.com'
      }
    });

    expect(userSetupResponse.ok()).toBeTruthy();

    // Test marketing channel link generation
    const channelLinkResponse = await page.request.post('/api/v1/test/telegram/marketing/channel-link', {
      data: {
        user_id: 'test_marketing_user',
        channel_type: 'telegram',
        personalized: true
      }
    });

    expect(channelLinkResponse.ok()).toBeTruthy();
    const channelLink = await channelLinkResponse.json();
    
    // Verify channel link properties
    expect(channelLink.link).toBeTruthy();
    expect(channelLink.link).toMatch(/^https:\/\/t\.me\//);
    expect(channelLink.personalized).toBeTruthy();
    expect(channelLink.expiry_date).toBeTruthy();
    expect(channelLink.tracking_params).toBeTruthy();

    // Test channel link accessibility
    const linkAccessibilityResponse = await page.request.get(channelLink.link);
    expect(linkAccessibilityResponse.ok()).toBeTruthy();

    // Test channel link tracking
    const trackingResponse = await page.request.post('/api/v1/test/marketing/link-tracking', {
      data: {
        link_id: channelLink.link_id,
        user_id: 'test_marketing_user',
        action: 'clicked'
      }
    });

    expect(trackingResponse.ok()).toBeTruthy();
    const trackingResult = await trackingResponse.json();
    expect(trackingResult.tracked).toBeTruthy();
    expect(trackingResult.click_count).toBe(1);

    // Test multiple channel types
    const channelTypes = ['telegram', 'whatsapp', 'viber'];
    for (const channelType of channelTypes) {
      const multiChannelResponse = await page.request.post('/api/v1/test/telegram/marketing/channel-link', {
        data: {
          user_id: 'test_marketing_user',
          channel_type: channelType,
          personalized: true
        }
      });

      expect(multiChannelResponse.ok()).toBeTruthy();
      const multiChannelResult = await multiChannelResponse.json();
      expect(multiChannelResult.link).toBeTruthy();
      expect(multiChannelResult.channel_type).toBe(channelType);
    }

    console.log('✅ Channel Link Functionality Tests Completed');
  });

  test('marketing menu items and accessibility', async ({ page }) => {
    console.log('📢 Testing Marketing Menu Items and Accessibility');

    // Create user for menu testing
    const menuUserResponse = await page.request.post('/api/v1/test/telegram/complete-registration', {
      data: {
        user_id: 'test_menu_user',
        phone: '+1234567890'
      }
    });

    expect(menuUserResponse.ok()).toBeTruthy();

    // Test marketing menu display
    const menuDisplayResponse = await page.request.post('/api/v1/test/telegram/marketing/show-menu', {
      data: {
        user_id: 'test_menu_user',
        menu_type: 'main'
      }
    });

    expect(menuDisplayResponse.ok()).toBeTruthy();
    const menuDisplay = await menuDisplayResponse.json();
    
    // Verify menu items
    expect(menuDisplay.menu_items).toBeTruthy();
    expect(menuDisplay.menu_items).toContain('FAQ');
    expect(menuDisplay.menu_items).toContain('Vacancies');
    expect(menuDisplay.menu_items).toContain('Promotions');
    expect(menuDisplay.menu_items).toContain('Contact Support');
    expect(menuDisplay.menu_items).toContain('About Us');

    // Test FAQ menu item
    const faqResponse = await page.request.post('/api/v1/test/telegram/marketing/faq', {
      data: {
        user_id: 'test_menu_user',
        category: 'general'
      }
    });

    expect(faqResponse.ok()).toBeTruthy();
    const faqResult = await faqResponse.json();
    expect(faqResult.faq_items).toBeTruthy();
    expect(faqResult.faq_items.length).toBeGreaterThan(0);
    
    // Verify FAQ item structure
    for (const faqItem of faqResult.faq_items) {
      expect(faqItem.question).toBeTruthy();
      expect(faqItem.answer).toBeTruthy();
      expect(faqItem.category).toBeTruthy();
    }

    // Test Vacancies menu item
    const vacanciesResponse = await page.request.post('/api/v1/test/telegram/marketing/vacancies', {
      data: {
        user_id: 'test_menu_user',
        location: 'all'
      }
    });

    expect(vacanciesResponse.ok()).toBeTruthy();
    const vacanciesResult = await vacanciesResponse.json();
    expect(vacanciesResult.vacancies).toBeTruthy();
    
    // Verify vacancy structure
    for (const vacancy of vacanciesResult.vacancies) {
      expect(vacancy.title).toBeTruthy();
      expect(vacancy.description).toBeTruthy();
      expect(vacancy.requirements).toBeTruthy();
      expect(vacancy.location).toBeTruthy();
      expect(vacancy.salary_range).toBeTruthy();
    }

    // Test Promotions menu item
    const promotionsResponse = await page.request.post('/api/v1/test/telegram/marketing/promotions', {
      data: {
        user_id: 'test_menu_user',
        customer_segment: 'loyalty'
      }
    });

    expect(promotionsResponse.ok()).toBeTruthy();
    const promotionsResult = await promotionsResponse.json();
    expect(promotionsResult.promotions).toBeTruthy();
    
    // Verify promotion structure
    for (const promotion of promotionsResult.promotions) {
      expect(promotion.title).toBeTruthy();
      expect(promotion.description).toBeTruthy();
      expect(promotion.discount).toBeTruthy();
      expect(promotion.valid_until).toBeTruthy();
      expect(promotion.terms_conditions).toBeTruthy();
    }

    // Test menu accessibility for different user types
    const userTypes = ['new', 'loyalty', 'vip', 'inactive'];
    for (const userType of userTypes) {
      const userTypeResponse = await page.request.post('/api/v1/test/telegram/marketing/show-menu', {
        data: {
          user_id: `test_${userType}_user`,
          menu_type: 'personalized',
          user_segment: userType
        }
      });

      expect(userTypeResponse.ok()).toBeTruthy();
      const userTypeMenu = await userTypeResponse.json();
      expect(userTypeMenu.menu_items).toBeTruthy();
      expect(userTypeMenu.personalized).toBeTruthy();
    }

    console.log('✅ Marketing Menu Items and Accessibility Tests Completed');
  });

  test('CRM campaign triggers and automation', async ({ page }) => {
    console.log('📢 Testing CRM Campaign Triggers and Automation');

    // Create user for campaign testing
    const campaignUserResponse = await page.request.post('/api/v1/test/telegram/complete-registration', {
      data: {
        user_id: 'test_campaign_user',
        phone: '+1234567890',
        email: 'campaign@example.com'
      }
    });

    expect(campaignUserResponse.ok()).toBeTruthy();

    // Navigate to marketing section
    await page.goto('/admin/marketing');
    await expect(page.getByTestId('admin_nav_marketing')).toHaveAttribute('aria-selected', 'true');

    // Test welcome campaign trigger
    const welcomeCampaignResponse = await page.request.post('/api/v1/test/crm/trigger-welcome-campaign', {
      data: {
        user_id: 'test_campaign_user',
        campaign_type: 'welcome',
        trigger_event: 'registration_complete'
      }
    });

    expect(welcomeCampaignResponse.ok()).toBeTruthy();
    const welcomeCampaign = await welcomeCampaignResponse.json();
    expect(welcomeCampaign.campaign_triggered).toBeTruthy();
    expect(welcomeCampaign.campaign_id).toBeTruthy();
    expect(welcomeCampaign.message_sent).toBeTruthy();

    // Test loyalty milestone campaign
    const milestoneCampaignResponse = await page.request.post('/api/v1/test/crm/trigger-milestone-campaign', {
      data: {
        user_id: 'test_campaign_user',
        milestone_type: 'first_purchase',
        milestone_value: 1
      }
    });

    expect(milestoneCampaignResponse.ok()).toBeTruthy();
    const milestoneCampaign = await milestoneCampaignResponse.json();
    expect(milestoneCampaign.campaign_triggered).toBeTruthy();
    expect(milestoneCampaign.reward_applied).toBeTruthy();

    // Test re-engagement campaign for inactive users
    const reengageCampaignResponse = await page.request.post('/api/v1/test/crm/trigger-reengage-campaign', {
      data: {
        user_id: 'test_inactive_user',
        inactive_days: 30,
        campaign_type: 'win_back'
      }
    });

    expect(reengageCampaignResponse.ok()).toBeTruthy();
    const reengageCampaign = await reengageCampaignResponse.json();
    expect(reengageCampaign.campaign_triggered).toBeTruthy();
    expect(reengageCampaign.special_offer).toBeTruthy();

    // Test birthday campaign
    const birthdayCampaignResponse = await page.request.post('/api/v1/test/crm/trigger-birthday-campaign', {
      data: {
        user_id: 'test_campaign_user',
        birthday: '1990-01-01',
        campaign_type: 'birthday_reward'
      }
    });

    expect(birthdayCampaignResponse.ok()).toBeTruthy();
    const birthdayCampaign = await birthdayCampaignResponse.json();
    expect(birthdayCampaign.campaign_triggered).toBeTruthy();
    expect(birthdayCampaign.birthday_bonus).toBeTruthy();

    // Verify campaign status in admin interface
    await page.getByTestId('admin_btn_campaigns_en').click();
    await expect(page.getByText('Active Campaigns')).toBeVisible();
    
    // Check for triggered campaigns
    const campaignStatus = await page.getByTestId('campaign_status_list').textContent();
    expect(campaignStatus).toContain('Welcome');
    expect(campaignStatus).toContain('Milestone');
    expect(campaignStatus).toContain('Birthday');

    // Test campaign analytics
    const analyticsResponse = await page.request.get('/api/v1/test/crm/campaign-analytics');
    expect(analyticsResponse.ok()).toBeTruthy();
    const analytics = await analyticsResponse.json();
    
    expect(analytics.total_campaigns).toBeGreaterThan(0);
    expect(analytics.active_campaigns).toBeGreaterThan(0);
    expect(analytics.campaign_performance).toBeTruthy();
    expect(analytics.open_rates).toBeTruthy();
    expect(analytics.click_through_rates).toBeTruthy();

    console.log('✅ CRM Campaign Triggers and Automation Tests Completed');
  });

  test('customer segmentation and personalization', async ({ page }) => {
    console.log('📢 Testing Customer Segmentation and Personalization');

    // Create users with different profiles for segmentation
    const userProfiles = [
      { user_id: 'new_customer', segment: 'new', registration_date: '2024-01-01', total_purchases: 0 },
      { user_id: 'regular_customer', segment: 'regular', registration_date: '2023-06-01', total_purchases: 5 },
      { user_id: 'vip_customer', segment: 'vip', registration_date: '2022-01-01', total_purchases: 50 },
      { user_id: 'inactive_customer', segment: 'inactive', registration_date: '2022-01-01', total_purchases: 2, last_purchase: '2023-01-01' }
    ];

    for (const profile of userProfiles) {
      const userCreationResponse = await page.request.post('/api/v1/test/telegram/create-profiled-user', {
        data: profile
      });

      expect(userCreationResponse.ok()).toBeTruthy();
    }

    // Test segmentation engine
    const segmentationResponse = await page.request.post('/api/v1/test/crm/segment-customers', {
      data: {
        segmentation_criteria: {
          purchase_frequency: 'high',
          total_spend: 'high',
          loyalty_status: 'active'
        }
      }
    });

    expect(segmentationResponse.ok()).toBeTruthy();
    const segmentation = await segmentationResponse.json();
    expect(segmentation.segments).toBeTruthy();
    expect(segmentation.segments.vip).toBeTruthy();
    expect(segmentation.segments.regular).toBeTruthy();
    expect(segmentation.segments.new).toBeTruthy();

    // Test personalized content delivery
    for (const profile of userProfiles) {
      const personalizationResponse = await page.request.post('/api/v1/test/marketing/personalized-content', {
        data: {
          user_id: profile.user_id,
          content_type: 'promotions'
        }
      });

      expect(personalizationResponse.ok()).toBeTruthy();
      const personalizedContent = await personalizationResponse.json();
      expect(personalizedContent.personalized).toBeTruthy();
      expect(personalizedContent.content).toBeTruthy();
      expect(personalizedContent.segment).toBe(profile.segment);
    }

    // Test A/B testing for marketing content
    const abTestResponse = await page.request.post('/api/v1/test/marketing/ab-test', {
      data: {
        test_name: 'promotion_messaging',
        variants: [
          { id: 'A', content: 'Get 20% off your next purchase!' },
          { id: 'B', content: 'Exclusive offer: Save 20% today!' }
        ],
        traffic_split: 50
      }
    });

    expect(abTestResponse.ok()).toBeTruthy();
    const abTest = await abTestResponse.json();
    expect(abTest.test_created).toBeTruthy();
    expect(abTest.variants).toHaveLength(2);

    // Test recommendation engine
    const recommendationResponse = await page.request.post('/api/v1/test/marketing/recommendations', {
      data: {
        user_id: 'regular_customer',
        recommendation_type: 'products',
        context: 'post_purchase'
      }
    });

    expect(recommendationResponse.ok()).toBeTruthy();
    const recommendations = await recommendationResponse.json();
    expect(recommendations.recommendations).toBeTruthy();
    expect(recommendations.recommendations.length).toBeGreaterThan(0);

    console.log('✅ Customer Segmentation and Personalization Tests Completed');
  });

  test('marketing analytics and reporting', async ({ page }) => {
    console.log('📢 Testing Marketing Analytics and Reporting');

    // Generate marketing data for analytics
    const dataGenerationResponse = await page.request.post('/api/v1/test/marketing/generate-data', {
      data: {
        duration_days: 30,
        daily_interactions: 100,
        campaign_count: 5,
        conversion_rate: 0.15
      }
    });

    expect(dataGenerationResponse.ok()).toBeTruthy();

    // Test marketing dashboard analytics
    const dashboardResponse = await page.request.get('/api/v1/test/marketing/dashboard-analytics');
    expect(dashboardResponse.ok()).toBeTruthy();
    const dashboard = await dashboardResponse.json();
    
    expect(dashboard.total_interactions).toBeGreaterThan(0);
    expect(dashboard.unique_users).toBeGreaterThan(0);
    expect(dashboard.conversion_rate).toBeGreaterThan(0);
    expect(dashboard.engagement_rate).toBeGreaterThan(0);
    expect(dashboard.top_campaigns).toBeTruthy();

    // Test campaign performance metrics
    const campaignMetricsResponse = await page.request.get('/api/v1/test/marketing/campaign-metrics');
    expect(campaignMetricsResponse.ok()).toBeTruthy();
    const campaignMetrics = await campaignMetricsResponse.json();
    
    expect(campaignMetrics.campaigns).toBeTruthy();
    expect(campaignMetrics.performance_summary).toBeTruthy();
    expect(campaignMetrics.roi_analysis).toBeTruthy();
    
    // Verify individual campaign metrics
    for (const campaign of campaignMetrics.campaigns) {
      expect(campaign.name).toBeTruthy();
      expect(campaign.sent_count).toBeGreaterThan(0);
      expect(campaign.open_rate).toBeGreaterThanOrEqual(0);
      expect(campaign.click_rate).toBeGreaterThanOrEqual(0);
      expect(campaign.conversion_rate).toBeGreaterThanOrEqual(0);
    }

    // Test customer journey analytics
    const journeyResponse = await page.request.get('/api/v1/test/marketing/customer-journey');
    expect(journeyResponse.ok()).toBeTruthy();
    const journey = await journeyResponse.json();
    
    expect(journey.touchpoints).toBeTruthy();
    expect(journey.conversion_funnel).toBeTruthy();
    expect(journey.drop_off_points).toBeTruthy();
    expect(journey.optimization_suggestions).toBeTruthy();

    // Test ROI and revenue attribution
    const roiResponse = await page.request.get('/api/v1/test/marketing/roi-analysis');
    expect(roiResponse.ok()).toBeTruthy();
    const roi = await roiResponse.json();
    
    expect(roi.total_revenue).toBeGreaterThan(0);
    expect(roi.marketing_spend).toBeGreaterThan(0);
    expect(roi.roi_ratio).toBeGreaterThan(0);
    expect(roi.channel_performance).toBeTruthy();
    expect(roi.campaign_attribution).toBeTruthy();

    // Test predictive analytics
    const predictiveResponse = await page.request.post('/api/v1/test/marketing/predictive-analytics', {
      data: {
        prediction_type: 'churn_risk',
        timeframe_days: 30
      }
    });

    expect(predictiveResponse.ok()).toBeTruthy();
    const predictive = await predictiveResponse.json();
    
    expect(predictive.predictions).toBeTruthy();
    expect(predictive.confidence_scores).toBeTruthy();
    expect(predictive.risk_segments).toBeTruthy();
    expect(predictive.recommendations).toBeTruthy();

    // Verify analytics in admin interface
    await page.goto('/admin/marketing');
    await page.getByTestId('admin_btn_analytics_en').click();
    
    await expect(page.getByText('Marketing Analytics')).toBeVisible();
    await expect(page.getByTestId('marketing_dashboard')).toBeVisible();
    
    // Check for key metrics display
    const dashboardMetrics = await page.getByTestId('analytics_metrics').textContent();
    expect(dashboardMetrics).toContain('Interactions');
    expect(dashboardMetrics).toContain('Conversion Rate');
    expect(dashboardMetrics).toContain('ROI');

    console.log('✅ Marketing Analytics and Reporting Tests Completed');
  });

  test('multi-channel marketing integration', async ({ page }) => {
    console.log('📢 Testing Multi-Channel Marketing Integration');

    // Create user for multi-channel testing
    const multiChannelUserResponse = await page.request.post('/api/v1/test/telegram/complete-registration', {
      data: {
        user_id: 'test_multichannel_user',
        phone: '+1234567890',
        email: 'multichannel@example.com',
        preferred_channels: ['telegram', 'email', 'sms']
      }
    });

    expect(multiChannelUserResponse.ok()).toBeTruthy();

    // Test coordinated multi-channel campaign
    const multiChannelResponse = await page.request.post('/api/v1/test/marketing/multi-channel-campaign', {
      data: {
        campaign_name: 'Spring Sale 2024',
        user_id: 'test_multichannel_user',
        channels: ['telegram', 'email', 'sms'],
        message: 'Exclusive Spring Sale: 30% off everything!',
        schedule: {
          telegram: 'immediate',
          email: 'immediate',
          sms: '+1 hour'
        }
      }
    });

    expect(multiChannelResponse.ok()).toBeTruthy();
    const multiChannel = await multiChannelResponse.json();
    expect(multiChannel.campaign_launched).toBeTruthy();
    expect(multiChannel.channels_deployed).toHaveLength(3);

    // Test channel preference respect
    const preferenceResponse = await page.request.post('/api/v1/test/marketing/respect-preferences', {
      data: {
        user_id: 'test_multichannel_user',
        channels: ['telegram', 'email', 'sms', 'push'],
        message: 'Test message'
      }
    });

    expect(preferenceResponse.ok()).toBeTruthy();
    const preference = await preferenceResponse.json();
    expect(preference.respected_channels).toEqual(['telegram', 'email', 'sms']);
    expect(preference.skipped_channels).toEqual(['push']);

    // Test cross-channel tracking
    const trackingResponse = await page.request.post('/api/v1/test/marketing/cross-channel-tracking', {
      data: {
        user_id: 'test_multichannel_user',
        interaction_chain: [
          { channel: 'email', action: 'opened', timestamp: '2024-01-01T10:00:00Z' },
          { channel: 'telegram', action: 'clicked', timestamp: '2024-01-01T10:05:00Z' },
          { channel: 'web', action: 'purchased', timestamp: '2024-01-01T10:15:00Z' }
        ]
      }
    });

    expect(trackingResponse.ok()).toBeTruthy();
    const tracking = await trackingResponse.json();
    expect(tracking.tracked).toBeTruthy();
    expect(tracking.attribution).toBeTruthy();
    expect(tracking.conversion_path).toBeTruthy();

    // Test channel optimization
    const optimizationResponse = await page.request.post('/api/v1/test/marketing/channel-optimization', {
      data: {
        user_id: 'test_multichannel_user',
        optimization_goal: 'conversion_rate',
        test_duration_days: 7
      }
    });

    expect(optimizationResponse.ok()).toBeTruthy();
    const optimization = await optimizationResponse.json();
    expect(optimization.test_started).toBeTruthy();
    expect(optimization.variant_assignment).toBeTruthy();

    // Test unified customer view
    const unifiedViewResponse = await page.request.get('/api/v1/test/marketing/unified-customer-view', {
      params: { user_id: 'test_multichannel_user' }
    });

    expect(unifiedViewResponse.ok()).toBeTruthy();
    const unifiedView = await unifiedViewResponse.json();
    
    expect(unifiedView.customer_profile).toBeTruthy();
    expect(unifiedView.channel_preferences).toBeTruthy();
    expect(unifiedView.interaction_history).toBeTruthy();
    expect(unifiedView.engagement_metrics).toBeTruthy();
    expect(unifiedView.next_best_action).toBeTruthy();

    console.log('✅ Multi-Channel Marketing Integration Tests Completed');
  });

  test('marketing automation workflows', async ({ page }) => {
    console.log('📢 Testing Marketing Automation Workflows');

    // Create user for automation testing
    const automationUserResponse = await page.request.post('/api/v1/test/telegram/complete-registration', {
      data: {
        user_id: 'test_automation_user',
        phone: '+1234567890',
        email: 'automation@example.com'
      }
    });

    expect(automationUserResponse.ok()).toBeTruthy();

    // Test welcome series automation
    const welcomeSeriesResponse = await page.request.post('/api/v1/test/marketing/automation/welcome-series', {
      data: {
        user_id: 'test_automation_user',
        trigger_event: 'registration',
        series_steps: [
          { delay_hours: 0, channel: 'telegram', message: 'Welcome!' },
          { delay_hours: 24, channel: 'email', message: 'Getting started guide' },
          { delay_hours: 72, channel: 'telegram', message: 'Special offer for new members' }
        ]
      }
    });

    expect(welcomeSeriesResponse.ok()).toBeTruthy();
    const welcomeSeries = await welcomeSeriesResponse.json();
    expect(welcomeSeries.automation_triggered).toBeTruthy();
    expect(welcomeSeries.steps_scheduled).toHaveLength(3);

    // Test abandoned cart recovery
    const cartRecoveryResponse = await page.request.post('/api/v1/test/marketing/automation/cart-recovery', {
      data: {
        user_id: 'test_automation_user',
        cart_items: ['product1', 'product2'],
        cart_value: 100,
        abandonment_time: '2 hours ago'
      }
    });

    expect(cartRecoveryResponse.ok()).toBeTruthy();
    const cartRecovery = await cartRecoveryResponse.json();
    expect(cartRecovery.recovery_sequence_started).toBeTruthy();
    expect(cartRecovery.reminder_scheduled).toBeTruthy();

    // Test re-engagement automation
    const reengageAutomationResponse = await page.request.post('/api/v1/test/marketing/automation/re-engagement', {
      data: {
        user_id: 'test_inactive_user',
        inactive_days: 30,
        last_activity: '2023-12-01',
        preferred_channel: 'telegram'
      }
    });

    expect(reengageAutomationResponse.ok()).toBeTruthy();
    const reengageAutomation = await reengageAutomationResponse.json();
    expect(reengageAutomation.re_engagement_triggered).toBeTruthy();
    expect(reengageAutomation.incentive_offered).toBeTruthy();

    // Test birthday automation
    const birthdayAutomationResponse = await page.request.post('/api/v1/test/marketing/automation/birthday', {
      data: {
        user_id: 'test_automation_user',
        birthday: '1990-01-01',
        current_date: '2024-01-01',
        automation_type: 'birthday_reward'
      }
    });

    expect(birthdayAutomationResponse.ok()).toBeTruthy();
    const birthdayAutomation = await birthdayAutomationResponse.json();
    expect(birthdayAutomation.birthday_automation_triggered).toBeTruthy();
    expect(birthdayAutomation.reward_applied).toBeTruthy();

    // Test VIP customer automation
    const vipAutomationResponse = await page.request.post('/api/v1/test/marketing/automation/vip', {
      data: {
        user_id: 'test_vip_user',
        total_purchases: 100,
        loyalty_points: 5000,
        vip_tier: 'gold'
      }
    });

    expect(vipAutomationResponse.ok()).toBeTruthy();
    const vipAutomation = await vipAutomationResponse.json();
    expect(vipAutomation.vip_benefits_activated).toBeTruthy();
    expect(vipAutomation.personalized_offers).toBeTruthy();

    // Test automation performance monitoring
    const performanceResponse = await page.request.get('/api/v1/test/marketing/automation/performance');
    expect(performanceResponse.ok()).toBeTruthy();
    const performance = await performanceResponse.json();
    
    expect(performance.active_workflows).toBeGreaterThan(0);
    expect(performance.execution_stats).toBeTruthy();
    expect(performance.conversion_rates).toBeTruthy();
    expect(performance.optimization_suggestions).toBeTruthy();

    console.log('✅ Marketing Automation Workflows Tests Completed');
  });
});
