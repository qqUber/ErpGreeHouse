
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** ErpGreeHouse
- **Date:** 2026-03-24
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 get dashboard analytics data with valid token
- **Test Code:** [TC001_get_dashboard_analytics_data_with_valid_token.py](./TC001_get_dashboard_analytics_data_with_valid_token.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a29cc22a-dd21-40e5-a1cb-6356b77afc00/57f93c15-8f7b-4ff9-bb99-bb2f1f00a036
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 get widget configurations with valid token
- **Test Code:** [TC002_get_widget_configurations_with_valid_token.py](./TC002_get_widget_configurations_with_valid_token.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a29cc22a-dd21-40e5-a1cb-6356b77afc00/3a83dfe2-15ba-4ff9-be7f-5610625e548d
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 list all customers with valid token
- **Test Code:** [TC003_list_all_customers_with_valid_token.py](./TC003_list_all_customers_with_valid_token.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a29cc22a-dd21-40e5-a1cb-6356b77afc00/0a400345-9e1e-4a83-a648-3a78d5b4d972
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 create new customer with valid data
- **Test Code:** [TC004_create_new_customer_with_valid_data.py](./TC004_create_new_customer_with_valid_data.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 39, in test_create_new_customer_with_valid_data
  File "/var/task/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 400 Client Error: Bad Request for url: http://localhost:8000/api/v1/customers

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 55, in <module>
  File "<string>", line 41, in test_create_new_customer_with_valid_data
AssertionError: Create customer request failed: 400 Client Error: Bad Request for url: http://localhost:8000/api/v1/customers

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a29cc22a-dd21-40e5-a1cb-6356b77afc00/8a2c6f53-3414-46f9-9294-82f2169017eb
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 update existing customer with valid data
- **Test Code:** [TC005_update_existing_customer_with_valid_data.py](./TC005_update_existing_customer_with_valid_data.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 77, in <module>
  File "<string>", line 22, in test_update_existing_customer_with_valid_data
AssertionError: No access token returned from login

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a29cc22a-dd21-40e5-a1cb-6356b77afc00/5c6e02e9-5673-4415-bfca-c01abbee1290
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 list all products with valid token
- **Test Code:** [TC006_list_all_products_with_valid_token.py](./TC006_list_all_products_with_valid_token.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a29cc22a-dd21-40e5-a1cb-6356b77afc00/0e0e0971-5b83-4d6a-a7e8-6649318d1d06
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 create new product with valid data
- **Test Code:** [TC007_create_new_product_with_valid_data.py](./TC007_create_new_product_with_valid_data.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 65, in <module>
  File "<string>", line 42, in test_create_new_product_with_valid_data
AssertionError: Unexpected status code 422

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a29cc22a-dd21-40e5-a1cb-6356b77afc00/d40cd7cc-8ac6-45ba-a7fa-704f08e08f4f
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 user login with valid credentials
- **Test Code:** [TC008_user_login_with_valid_credentials.py](./TC008_user_login_with_valid_credentials.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a29cc22a-dd21-40e5-a1cb-6356b77afc00/c4b1350f-ccb7-41d7-82d6-892c1a353059
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 refresh access token with valid refresh token
- **Test Code:** [TC009_refresh_access_token_with_valid_refresh_token.py](./TC009_refresh_access_token_with_valid_refresh_token.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 39, in <module>
  File "<string>", line 23, in test_refresh_access_token_with_valid_refresh_token
AssertionError: Refresh token missing or invalid in login response

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a29cc22a-dd21-40e5-a1cb-6356b77afc00/6b95dd6e-7a85-444c-828b-d28285f2106e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 get analytics summary with valid token
- **Test Code:** [TC010_get_analytics_summary_with_valid_token.py](./TC010_get_analytics_summary_with_valid_token.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/a29cc22a-dd21-40e5-a1cb-6356b77afc00/cf07b5e1-557c-46b8-8ae9-8aacfca7e7fc
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **60.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---