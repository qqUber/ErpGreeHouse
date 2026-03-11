/**
 * Test ID utilities for consistent E2E testing
 *
 * This file defines clean, non-localized data-testid patterns
 * that should be used across all E2E tests.
 */

export const TestIds = {
  // Login form elements
  login: {
    input: {
      username: 'login_input_username',
      password: 'login_input_password',
      adminKey: 'login_input_admin_key',
    },
    button: {
      submit: 'login_btn_submit',
      togglePassword: 'login_btn_toggle_password',
      recover: 'login_btn_recover',
    },
  },

  // Navigation elements
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
      customers: 'dashboard_widget_customers',
      products: 'dashboard_widget_products',
      sales: 'dashboard_widget_sales',
      operational: 'dashboard_widget_operational',
      integrations: 'dashboard_widget_integrations',
      marketing: 'dashboard_widget_marketing',
    },
    button: {
      refresh: 'dashboard_btn_refresh',
      export: 'dashboard_btn_export',
      viewAll: 'dashboard_btn_view_all',
    },
  },

  // Customer management
  customer: {
    button: {
      new: 'customer_btn_new',
      search: 'customer_btn_search',
      reset: 'customer_btn_reset',
      create: 'customer_btn_create',
    },
    input: {
      search: 'customer_input_search',
      fullname: 'customer_input_fullname',
      phone: 'customer_input_phone',
      notes: 'customer_input_notes',
    },
  },

  // Product management
  product: {
    button: {
      reload: 'product_btn_reload',
      import: 'product_btn_import',
      create: 'product_btn_create',
    },
    input: {
      code: 'product_input_code',
      name: 'product_input_name',
      kind: 'product_input_kind',
      price: 'product_input_price',
    },
  },

  // POS interface
  pos: {
    button: {
      newSale: 'pos_btn_new_sale',
      identifyCustomer: 'pos_btn_identify_customer',
      catalog: 'pos_btn_catalog',
      modePhone: 'pos_btn_mode_phone',
      modeName: 'pos_btn_mode_name',
      modeQr: 'pos_btn_mode_qr',
      identify: 'pos_btn_identify',
      reloadProducts: 'pos_btn_reload_products',
      addToCart: 'pos_btn_add_to_cart',
      completeSale: 'pos_btn_complete_sale',
    },
    input: {
      bonus: 'pos_input_bonus',
      identify: 'pos_input_identify',
    },
  },

  // Settings
  settings: {
    button: {
      save: 'settings_btn_save',
      cancel: 'settings_btn_cancel',
    },
  },

  // Common elements
  common: {
    button: {
      save: 'common_btn_save',
      cancel: 'common_btn_cancel',
      delete: 'common_btn_delete',
      edit: 'common_btn_edit',
      add: 'common_btn_add',
      refresh: 'common_btn_refresh',
      export: 'common_btn_export',
      import: 'common_btn_import',
    },
    input: {
      search: 'common_input_search',
    },
  },

  // Operator dashboard
  operator: {
    widget: {
      quickActions: 'operator_widget_quick_actions',
      shiftStats: 'operator_widget_shift_stats',
      recentTransactions: 'operator_widget_recent_transactions',
      emptyState: 'operator_widget_empty_state',
    },
    button: {
      firstSale: 'operator_btn_first_sale',
      newOperation: 'operator_btn_new_operation',
    },
  },

  operatorDashboard: {
    quickActions: 'admin-dashboard-title',
    shiftStats: 'admin_widget_customers_en',
    recentTransactions: 'admin_widget_customers_en',
  },

  // Manager dashboard
  manager: {
    widget: {
      kpi: 'manager_widget_kpi',
      activeCampaigns: 'manager_widget_active_campaigns',
      recentEvents: 'manager_widget_recent_events',
      salesTrend: 'manager_widget_sales_trend',
      topProducts: 'manager_widget_top_products',
    },
    button: {
      manageCampaigns: 'manager_btn_manage_campaigns',
      viewAllEvents: 'manager_btn_view_all_events',
      analytics: 'manager_btn_analytics',
    },
  },
} as const;
