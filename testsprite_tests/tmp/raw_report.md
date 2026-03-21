
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** ErpGreeHouse
- **Date:** 2026-03-21
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 get dashboard analytics data with valid token
- **Test Code:** [TC001_get_dashboard_analytics_data_with_valid_token.py](./TC001_get_dashboard_analytics_data_with_valid_token.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4b4cca40-e11c-413e-bd43-0eb1b19d746b/7fa37ca9-83d6-4f2e-9e63-8bbf2f9c7881
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 get widget configurations with valid token
- **Test Code:** [TC002_get_widget_configurations_with_valid_token.py](./TC002_get_widget_configurations_with_valid_token.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4b4cca40-e11c-413e-bd43-0eb1b19d746b/cc47c6fe-5887-43b5-846e-072a08c4ef6a
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 list all customers with valid token
- **Test Code:** [TC003_list_all_customers_with_valid_token.py](./TC003_list_all_customers_with_valid_token.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4b4cca40-e11c-413e-bd43-0eb1b19d746b/5e1992c3-d09a-4d2f-8847-35d05a6f02aa
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 create new customer with valid data
- **Test Code:** [TC004_create_new_customer_with_valid_data.py](./TC004_create_new_customer_with_valid_data.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 66, in <module>
  File "<string>", line 45, in test_create_new_customer_with_valid_data
AssertionError: notes mismatch

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4b4cca40-e11c-413e-bd43-0eb1b19d746b/cdbba4b0-b18e-4cac-9358-1e4e2502420e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 update existing customer with valid data
- **Test Code:** [TC005_update_existing_customer_with_valid_data.py](./TC005_update_existing_customer_with_valid_data.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 88, in <module>
  File "<string>", line 58, in test_TC005_update_existing_customer_with_valid_data
  File "<string>", line 44, in create_customer
AssertionError: Failed to create customer, status 400

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4b4cca40-e11c-413e-bd43-0eb1b19d746b/751315dd-2c41-4368-84ac-70ee0e07decf
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 list all products with valid token
- **Test Code:** [TC006_list_all_products_with_valid_token.py](./TC006_list_all_products_with_valid_token.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4b4cca40-e11c-413e-bd43-0eb1b19d746b/c657d200-9c9a-426f-89b6-905ce31b7a48
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 create new product with valid data
- **Test Code:** [TC007_create_new_product_with_valid_data.py](./TC007_create_new_product_with_valid_data.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 53, in <module>
  File "<string>", line 33, in test_create_new_product_with_valid_data
AssertionError: Product creation failed with status 422

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4b4cca40-e11c-413e-bd43-0eb1b19d746b/13a07223-f41f-4ee1-a43c-f171d1ce9a9e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 user login with valid credentials
- **Test Code:** [TC008_user_login_with_valid_credentials.py](./TC008_user_login_with_valid_credentials.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4b4cca40-e11c-413e-bd43-0eb1b19d746b/1554c050-2113-43eb-ae61-5ba4734bd139
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 refresh access token with valid refresh token
- **Test Code:** [TC009_refresh_access_token_with_valid_refresh_token.py](./TC009_refresh_access_token_with_valid_refresh_token.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 35, in <module>
  File "<string>", line 33, in test_refresh_access_token_with_valid_refresh_token
  File "<string>", line 26, in test_refresh_access_token_with_valid_refresh_token
AssertionError: Refresh failed with status 401

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4b4cca40-e11c-413e-bd43-0eb1b19d746b/fe8e56eb-720d-4663-899c-7b011893bad0
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 get analytics summary with valid token
- **Test Code:** [TC010_get_analytics_summary_with_valid_token.py](./TC010_get_analytics_summary_with_valid_token.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 36, in <module>
  File "<string>", line 25, in test_get_analytics_summary_with_valid_token
AssertionError: Analytics summary request failed: {"detail":"Not found"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4b4cca40-e11c-413e-bd43-0eb1b19d746b/b4a08888-42a1-4708-93cb-20f5554ea89b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **50.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---