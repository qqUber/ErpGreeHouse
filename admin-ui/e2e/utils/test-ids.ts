/**
 * Test ID utilities for consistent E2E testing
 * 
 * CRITICAL: Check actual app test IDs before using!
 * App uses MIXED naming:
 * - Login: WITH _en suffix (common_input_username_en)
 * - Navigation: WITHOUT _en suffix (admin_nav_dashboard)
 * - Dashboard: WITHOUT _en suffix (admin_widget_customers)
 */

export const TestIds = {
  // Common/Auth form elements (WITH _en suffix)
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
    status: 'common_btn_api_status_en',
    logout: 'admin_btn_logout_en',
  },
  
  // Navigation elements (WITHOUT _en suffix)
  nav: {
    dashboard: 'admin_nav_dashboard',
    customers: 'admin_nav_customers',
    products: 'admin_nav_products',
    pos: 'admin_nav_pos',
    marketing: 'admin_nav_marketing',
    integrations: 'admin_nav_integrations',
    settings: 'admin_nav_settings',
    compliance: 'admin_nav_compliance',
    analytics: 'admin_nav_analytics',
  },
  
  // Dashboard elements (WITHOUT _en suffix)
  dashboard: {
    root: 'admin-dashboard',
    title: 'admin-dashboard-title',
    widget: {
      customers: 'admin_widget_customers',
      products: 'admin_widget_products',
      sales: 'admin_widget_sales',
      operational: 'admin_widget_operational_en',
      integrations: 'admin_widget_integrations',
      marketing: 'admin_widget_marketing',
      performance: 'admin_widget_performance_en',
    },
    button: {
      refresh: 'admin_btn_dashboard_refresh_en',
      export: 'admin_btn_export_csv_en',
    },
  },
  
  // Customer management (WITHOUT _en suffix)
  customer: {
    search: 'customers_search_input',
    searchButton: 'customers_search_button',
    clearButton: 'customers_clear_button',
  },
} as const;
