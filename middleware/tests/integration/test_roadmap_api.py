import importlib
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    db_path = tmp_path / 'crm_roadmap_test.db'
    monkeypatch.setenv('CRM_DB_PATH', str(db_path))
    monkeypatch.setenv('ADMIN_SECRET', 'test-admin')
    monkeypatch.setenv('CORS_ORIGINS', 'http://localhost:5173')
    monkeypatch.setenv('AUTO_SEED_DATA', 'false')

    from app import main as main_module

    importlib.reload(main_module)
    with TestClient(main_module.app) as c:
        yield c


def test_roadmap_phase_endpoints_smoke(client: TestClient) -> None:
    headers = {'x-admin-secret': 'test-admin'}

    # Create customer for referral flow
    identify = client.post('/api/v1/identify/phone', json={'phone': '89991230000'}, headers=headers)
    assert identify.status_code == 200
    customer_id = int(identify.json()['customer_id'])

    # Phase 1: loyalty tiers API
    tiers = client.get('/api/v1/loyalty/tiers', headers=headers)
    assert tiers.status_code == 200
    assert isinstance(tiers.json().get('items', []), list)

    # Phase 2: referrals + analytics
    create_ref = client.post(
        '/api/v1/referrals',
        json={'referrer_id': customer_id, 'referred_phone': '+79991230001'},
        headers=headers,
    )
    assert create_ref.status_code == 200
    assert create_ref.json().get('referral_code')

    referral_analytics = client.get('/api/v1/analytics/referrals', headers=headers)
    assert referral_analytics.status_code == 200

    # Create product for rewards (phase 3)
    product = client.post(
        '/api/v1/products',
        json={
            'code': 'RW-001',
            'name': 'Reward Latte',
            'kind': 'coffee',
            'price': 200,
            'active': 1,
        },
        headers=headers,
    )
    assert product.status_code in (200, 201)
    product_id = int(product.json().get('id') or product.json().get('product_id') or 1)

    certificate = client.post(
        '/api/v1/certificates',
        json={'type': 'fixed_amount', 'value': 500, 'sender_id': customer_id},
        headers=headers,
    )
    assert certificate.status_code == 200
    cert_code = certificate.json()['code']
    assert cert_code.startswith('CERT-') or len(cert_code) >= 4

    reward = client.post(
        '/api/v1/rewards',
        json={'product_id': product_id, 'points_cost': 100, 'active': 1},
        headers=headers,
    )
    assert reward.status_code == 200

    rewards = client.get('/api/v1/rewards', headers=headers)
    assert rewards.status_code == 200

    # Phase 4: reviews
    reviews = client.get('/api/v1/reviews', headers=headers)
    assert reviews.status_code == 200

    # Phase 5: news
    news = client.post(
        '/api/v1/news',
        json={'title': 'Promo', 'body': 'Promo body', 'type': 'promotion'},
        headers=headers,
    )
    assert news.status_code == 200
    article_id = int(news.json()['id'])

    publish = client.post(f'/api/v1/news/{article_id}/publish', headers=headers)
    assert publish.status_code == 200

    # Phase 6: metrics and alerts
    metric = client.post(
        '/api/v1/employees/metrics',
        json={'employee_id': 1, 'metric_type': 'registrations', 'value': 3, 'period': '2026-04'},
        headers=headers,
    )
    assert metric.status_code == 200

    fraud_scan = client.post('/api/v1/phase6/fraud-scan', headers=headers)
    assert fraud_scan.status_code == 200

    # Utility: customer import endpoint
    csv_payload = 'phone,full_name\n+79991230011,Import Customer\n'
    import_resp = client.post(
        '/api/v1/customers/import',
        files={'file': ('customers.csv', csv_payload, 'text/csv')},
        headers=headers,
    )
    assert import_resp.status_code == 200
    assert import_resp.json()['total'] >= 1
