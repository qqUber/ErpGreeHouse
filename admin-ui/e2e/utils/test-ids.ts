/**
 * Test ID utilities for consistent E2E testing
 *
 * This file defines test ID patterns that match the actual app components.
 * Based on E2E_TEST_FIX_PLAN.md
 */

export const TestIds = {
  // Common/Auth form elements (matching app's common_input_*_en pattern)
  common: {
    input: {
      username: 'common_input_username_en',
      password: 'common_input_password_en',
      adminKey: 'common_input_admin_key_en',
    },
    button: {
      login: 'common_btn_password_login_en',
      togglePassword: 'common_btn_toggle_password_en',
      recovery: 'common_btn_recovery_en',
    },
  },
  
  // Navigation elements (matching app's admin_nav_* pattern)
  nav: {
    dashboard: 'admin_nav_dashboard_en',
    customers: 'admin_nav_customers_en',
    products: 'admin_nav_products_en',
    pos: 'admin_nav_pos_en',
    marketing: 'admin_nav_marketing_en',
    integrations: 'admin_nav_integrations_en',
    settings: 'admin_nav_settings_en',
    compliance: 'admin_nav_compliance_en',
    analytics: 'admin_nav_analytics_en',
  },
  
  // Dashboard elements
  dashboard: {
    widget: {
      customers: 'admin_widget_customers_en',
      products: 'admin_widget_products_en',
      sales: 'admin_widget_sales_en',
      operational: 'admin_widget_operational_en',
      integrations: 'admin_widget_integrations_en',
      marketing: 'admin_widget_marketing_en',
    },
    button: {
      refresh: 'admin_btn_dashboard_refresh_en',
      export: 'admin_btn_export_csv_en',
      viewAll: 'admin_widget_refresh_export_en',
    },
  },
  
  // Customer management
  customer: {
    button: {
      new: 'admin_btn_new_customer_en',
      search: 'admin_btn_customer_search_en',
      reset: 'admin_btn_customer_reset_en',
      create: 'admin_btn_create_customer_en',
    },
    input: {
      search: 'admin_input_customer_search_en',
      fullname: 'admin_input_customer_fullname_en',
      phone: 'admin_input_customer_phone_en',
      notes: 'admin_input_customer_notes_en',
    },
  },
  
  // Product management
  product: {
    button: {
      reload: 'admin_btn_products_reload_en',
      import: 'admin_btn_products_import_en',
      create: 'admin_btn_create_product_en',
    },
    input: {
      code: 'admin_input_product_code_en',
      name: 'admin_input_product_name_en',
      kind: 'admin_input_product_kind_en',
      price: 'admin_input_product_price_en',
    },
  },
  
  // POS interface
  pos: {
    button: {
      newSale: 'operator_btn_new_sale_en',
      identifyCustomer: 'operator_btn_identify_customer_en',
      catalog: 'operator_btn_catalog_en',
      modePhone: 'operator_btn_mode_phone_en',
      modeName: 'operator_btn_mode_name_en',
      modeQr: 'operator_btn_mode_qr_en',
      identify: 'operator_btn_identify_en',
      reloadProducts: 'operator_btn_reload_products_en',
      addToCart: 'operator_btn_add_to_cart_en',
      completeSale: 'operator_btn_complete_sale_en',
    },
    input: {
      bonus: 'operator_input_bonus_en',
      identify: 'operator_input_identify_en',
    },
  },
  
  // Settings
  settings: {
    button: {
      save: 'settings_btn_save_en',
      cancel: 'settings_btn_cancel_en',
    },
  },
  
  // Operator dashboard
  operator: {
    widget: {
      quickActions: 'operator_widget_quick_actions_en',
      shiftStats: 'operator_widget_shift_stats_en',
      recentTransactions: 'operator_widget_recent_transactions_en',
      emptyState: 'operator_widget_empty_state_en',
    },
    button: {
      firstSale: 'operator_btn_first_sale_en',
      newOperation: 'operator_btn_new_operation_en',
    },
  },
  
  // Manager dashboard
  manager: {
    widget: {
      kpi: 'manager_widget_kpi_en',
      activeCampaigns: 'manager_widget_active_campaigns_en',
      recentEvents: 'manager_widget_recent_events_en',
      salesTrend: 'manager_widget_sales_trend_en',
      topProducts: 'manager_widget_top_products_en',
    },
    button: {
      manageCampaigns: 'manager_btn_manage_campaigns_en',
      viewAllEvents: 'manager_btn_view_all_events_en',
      analytics: 'manager_btn_analytics_en',
    },
  },
} as const;
