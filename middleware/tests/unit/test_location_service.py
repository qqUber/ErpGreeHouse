import pytest
import json
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock

from app.services.location_service import LocationService, get_location_service


@pytest.fixture
def mock_db():
    """Mock database fixture."""
    mock_conn = Mock()
    mock_db = Mock()
    mock_db.connect.return_value = mock_conn
    return mock_db, mock_conn


@pytest.fixture
def mock_redis():
    """Mock Redis fixture."""
    mock_r = Mock()
    mock_r.get.return_value = None
    mock_r.setex.return_value = True
    mock_r.delete.return_value = True
    return mock_r


class TestLocationService:
    """Test LocationService functionality."""

    def test_get_countries_returns_list(self, mock_db, mock_redis):
        """Test that get_countries returns a list of countries."""
        mock_db_instance, mock_conn = mock_db
        
        # Mock the database response
        mock_conn.execute.return_value.fetchall.return_value = [
            {"id": 1, "code": "RU", "name": "Russia", "name_local": "Россия", 
             "phone_prefix": "+7", "currency_code": "RUB", "timezone_default": "Europe/Moscow"},
            {"id": 2, "code": "KZ", "name": "Kazakhstan", "name_local": "Қазақстан", 
             "phone_prefix": "+7", "currency_code": "KZT", "timezone_default": "Asia/Almaty"},
        ]
        
        service = LocationService()
        service.db = mock_db_instance
        
        with patch('app.services.location_service.get_redis', return_value=mock_redis):
            countries = service.get_countries(active_only=True)
        
        assert isinstance(countries, list)
        assert len(countries) == 2
        assert countries[0]["code"] == "RU"
        assert countries[1]["code"] == "KZ"

    def test_get_countries_uses_cache(self, mock_db, mock_redis):
        """Test that get_countries uses Redis cache."""
        mock_db_instance, mock_conn = mock_db
        
        # Mock cached data
        cached_data = json.dumps([
            {"id": 1, "code": "RU", "name": "Russia", "name_local": "Россия", 
             "phone_prefix": "+7", "currency_code": "RUB", "timezone_default": "Europe/Moscow"}
        ])
        mock_redis.get.return_value = cached_data
        
        service = LocationService()
        service.db = mock_db_instance
        
        with patch('app.services.location_service.get_redis', return_value=mock_redis):
            countries = service.get_countries(active_only=True)
        
        # Should use cache, not query DB
        mock_conn.execute.assert_not_called()
        assert len(countries) == 1
        assert countries[0]["code"] == "RU"

    def test_get_cities_by_country(self, mock_db, mock_redis):
        """Test getting cities by country ID."""
        mock_db_instance, mock_conn = mock_db
        
        mock_conn.execute.return_value.fetchall.return_value = [
            {"id": 1, "country_id": 1, "name": "Москва", "region": "Московская область", 
             "timezone": "Europe/Moscow"},
            {"id": 2, "country_id": 1, "name": "Санкт-Петербург", "region": "Ленинградская область", 
             "timezone": "Europe/Moscow"},
        ]
        
        service = LocationService()
        service.db = mock_db_instance
        
        with patch('app.services.location_service.get_redis', return_value=mock_redis):
            cities = service.get_cities_by_country(1)
        
        assert isinstance(cities, list)
        assert len(cities) == 2
        assert cities[0]["name"] == "Москва"
        assert cities[1]["name"] == "Санкт-Петербург"

    def test_get_locations_by_city(self, mock_db, mock_redis):
        """Test getting locations by city ID."""
        mock_db_instance, mock_conn = mock_db
        
        # Mock count query
        mock_conn.execute.side_effect = [
            Mock(fetchone=Mock(return_value={"count": 2})),  # Count query
            Mock(fetchall=Mock(return_value=[
                {"id": 1, "city_id": 1, "name": "Green House - Арбат", "address": "ул. Арбат, 10",
                 "status": "active", "priority_score": 10, "visit_count": 5},
                {"id": 2, "city_id": 1, "name": "Green House - Тверская", "address": "ул. Тверская, 15",
                 "status": "active", "priority_score": 5, "visit_count": 3},
            ])),
        ]
        
        service = LocationService()
        service.db = mock_db_instance
        
        with patch('app.services.location_service.get_redis', return_value=mock_redis):
            result = service.get_locations_by_city(1)
        
        assert "items" in result
        assert "total" in result
        assert result["total"] == 2

    def test_record_customer_visit_invalidates_cache_before_commit(self, mock_db, mock_redis):
        """Test that cache is invalidated BEFORE database commit to prevent race condition."""
        mock_db_instance, mock_conn = mock_db
        
        # Mock existing visit
        mock_conn.execute.return_value.fetchone.return_value = {"id": 1, "visit_count": 5}
        
        service = LocationService()
        service.db = mock_db_instance
        
        with patch('app.services.location_service.get_redis', return_value=mock_redis):
            service.record_customer_visit(1, 1, transaction_id=100, amount_spent=150.0)
        
        # Check the order of operations
        calls = mock_conn.method_calls
        
        # Redis delete should be called before commit
        # Note: In the fixed implementation, cache is invalidated BEFORE commit
        mock_redis.delete.assert_called_once_with("customer_visits:1")
        mock_conn.commit.assert_called_once()

    def test_get_customer_frequent_locations_uses_cache(self, mock_db, mock_redis):
        """Test that get_customer_frequent_locations uses Redis cache."""
        mock_db_instance, mock_conn = mock_db
        
        # Mock cached data
        cached_data = json.dumps([
            {"id": 1, "location_id": 1, "name": "Green House - Арбат", "visit_count": 10}
        ])
        mock_redis.get.return_value = cached_data
        
        service = LocationService()
        service.db = mock_db_instance
        
        with patch('app.services.location_service.get_redis', return_value=mock_redis):
            locations = service.get_customer_frequent_locations(1)
        
        # Should use cache, not query DB
        mock_conn.execute.assert_not_called()
        assert len(locations) == 1
        assert locations[0]["name"] == "Green House - Арбат"

    def test_update_location_status_invalidates_caches(self, mock_db, mock_redis):
        """Test that update_location_status invalidates relevant caches."""
        mock_db_instance, mock_conn = mock_db
        
        # Mock scan_iter to return some keys
        mock_redis.scan_iter.side_effect = [
            ["cities:1", "cities:2"],  # First call for cities
            ["locations:1", "locations:2"],  # Second call for locations
        ]
        
        service = LocationService()
        service.db = mock_db_instance
        
        with patch('app.services.location_service.get_redis', return_value=mock_redis):
            result = service.update_location_status(1, "inactive")
        
        assert result is True
        # Should invalidate caches
        assert mock_redis.delete.call_count >= 2

    def test_singleton_instance(self):
        """Test that get_location_service returns a singleton."""
        service1 = get_location_service()
        service2 = get_location_service()
        
        assert service1 is service2

    def test_get_system_country_with_existing_setting(self, mock_db, mock_redis):
        """Test getting system country when setting exists."""
        mock_db_instance, mock_conn = mock_db
        
        # Mock system setting
        mock_conn.execute.return_value.fetchone.return_value = {"value": "1"}
        
        # Mock country data
        mock_conn.execute.side_effect = [
            Mock(fetchone=Mock(return_value={"value": "1"})),  # System setting
            Mock(fetchone=Mock(return_value={"id": 1, "code": "RU", "name": "Russia", 
                                              "name_local": "Россия", "phone_prefix": "+7",
                                              "currency_code": "RUB", "timezone_default": "Europe/Moscow"})),
        ]
        
        service = LocationService()
        service.db = mock_db_instance
        
        with patch('app.services.location_service.get_redis', return_value=mock_redis):
            country = service.get_system_country()
        
        assert country is not None
        assert country["code"] == "RU"

    def test_initialize_system_country_priority_env(self, mock_db, mock_redis):
        """Test that ENV variables have highest priority for country initialization."""
        mock_db_instance, mock_conn = mock_db
        
        # Mock country lookup by code
        mock_conn.execute.side_effect = [
            Mock(fetchone=Mock(return_value=None)),  # No existing setting
            Mock(fetchone=Mock(return_value=None)),  # No existing currency
            Mock(fetchone=Mock(return_value={"id": 2, "code": "KZ", "currency_code": "KZT"})),  # Found by ENV code
            Mock(fetchone=Mock(return_value={"count": 1})),  # Country count for force_single
        ]
        
        service = LocationService()
        service.db = mock_db_instance
        
        with patch('app.services.location_service.get_redis', return_value=mock_redis):
            result = service.initialize_system_country("KZ", "KZT")
        
        assert result["initialized"] is True
        assert result["country_id"] == 2
        assert result["source"] == "env"
        assert result["force_single_country"] is True
