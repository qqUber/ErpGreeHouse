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
  
  // View containers (default EN locale)
  views: {
    settings: 'settings_view_en',
    customers: 'customers_view_en',
    products: 'products_view_en',
    pos: 'pos_view_en',
    dashboardRefresh: 'admin_widget_refresh_export_en',
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
  
  // Customer management
  customer: {
    search: 'customers_search_input_en',
    searchButton: 'customers_search_button_en',
    clearButton: 'customers_clear_button_en',
    newButton: 'admin_btn_new_customer_en',
    createButton: 'admin_btn_create_customer_en',
    inputFullname: 'admin_input_customer_fullname_en',
    inputPhone: 'admin_input_customer_phone_en',
    inputNotes: 'admin_input_customer_notes_en',
  },
  
  // Product management
  product: {
    reload: 'admin_btn_products_reload_en',
    import: 'admin_btn_products_import_en',
    create: 'admin_btn_create_product_en',
    inputCode: 'admin_input_product_code_en',
    inputName: 'admin_input_product_name_en',
    inputKind: 'admin_input_product_kind_en',
    inputPrice: 'admin_input_product_price_en',
  },
  
  // POS/operator controls
  pos: {
    catalog: 'pos_catalog_en',
    cart: 'pos_cart_en',
    loyalty: 'pos_loyalty_en',
    selectProduct: 'operator_select_product_en',
    inputBonus: 'operator_input_bonus_en',
    inputIdentify: 'operator_input_identify_en',
    btnNewSale: 'operator_btn_new_sale_en',
    btnIdentifyCustomer: 'operator_btn_identify_customer_en',
    btnIdentify: 'operator_btn_identify_en',
    btnAddToCart: 'operator_btn_add_to_cart_en',
    btnCompleteSale: 'operator_btn_complete_sale_en',
  },
  
  // Operator dashboard widgets
  operatorDashboard: {
    root: 'operator_dashboard_en',
    quickActions: 'operator_widget_quick_actions_en',
    shiftStats: 'operator_widget_shift_stats_en',
    recentTransactions: 'operator_widget_recent_transactions_en',
    emptyState: 'operator_widget_empty_state_en',
    btnFirstSale: 'operator_btn_first_sale_en',
    btnNewOperation: 'operator_btn_new_operation_en',
  },
  
  // Manager dashboard widgets
  managerDashboard: {
    root: 'manager_dashboard_en',
    kpi: 'manager_widget_kpi_en',
    activeCampaigns: 'manager_widget_active_campaigns_en',
    btnManageCampaigns: 'manager_btn_manage_campaigns_en',
    recentEvents: 'manager_widget_recent_events_en',
    btnViewAllEvents: 'manager_btn_view_all_events_en',
    salesTrend: 'manager_widget_sales_trend_en',
    btnAnalytics: 'manager_btn_analytics_en',
    topProducts: 'manager_widget_top_products_en',
  },
} as const;
