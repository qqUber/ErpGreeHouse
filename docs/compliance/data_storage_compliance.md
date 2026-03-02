# Data Storage Compliance for 152-FZ

## Overview

This document outlines the data storage compliance requirements for the ErpGreeHouse system under Russian Federal Law No. 152-FZ "On Personal Data".

## Key Requirements

### 1. Data Localization

All personal data of Russian citizens must be stored, processed, and transmitted within the territory of the Russian Federation.

### 2. Data Storage Requirements

- **Database**: PostgreSQL 15 must be hosted within Russian borders
- **Cache**: Redis cache must be hosted within Russian borders
- **Backups**: Database backups must be stored within Russian borders

### 3. Data Protection Measures

- Encryption at rest for all personal data
- Encryption in transit for all data transmissions
- Access controls to prevent unauthorized access
- Regular security audits and penetration testing

## Production Environment Configuration

### Docker Compose Configuration

The production environment uses Docker Compose to deploy all services. The configuration ensures that all data storage components are located within Russian borders.

#### Database (PostgreSQL 15)

```yaml
postgres:
  image: postgres:15-alpine
  restart: always
  environment:
    - POSTGRES_USER=${DB_USER:-postgres}
    - POSTGRES_PASSWORD=${DB_PASSWORD:?DB_PASSWORD is required}
    - POSTGRES_DB=${DB_NAME:-telegram_crm}
  volumes:
    - postgres-data:/var/lib/postgresql/data
    - postgres-backups:/backups
  networks:
    - erp_net
  # Data Localization Compliance (152-FZ):
  # - База данных размещается на территории РФ
  # - Резервные копии хранятся локально в томе postgres-backups
```

#### Cache (Redis)

```yaml
redis-queue:
  image: redis:8.0-alpine
  restart: always
  command: ["redis-server", "--save", "900", "1", "--save", "300", "10", "--save", "60", "10000"]
  volumes:
    - redis-queue-data:/data
  networks:
    - erp_net
  # Data Localization Compliance (152-FZ):
  # - Redis кэш размещается на территории РФ
  # - Данные кэша не передаются за границу
```

### Environment Configuration

The following environment variables must be configured for production:

```bash
# Production Environment Configuration
ENVIRONMENT=production
DEBUG_MODE=false
TEST_MODE=false

# Database Configuration (PostgreSQL)
DB_USER=postgres
DB_PASSWORD=your-db-password-here
DB_NAME=telegram_crm
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}

# Redis Configuration
REDIS_URL=redis://redis-queue:6379/1

# JWT Configuration (CRITICAL for production)
JWT_SECRET_KEY=your-secure-jwt-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30
```

## Compliance Verification

### Verification Script

A compliance verification script is available at `scripts/verify_compliance.py`. This script checks that all data storage components are configured correctly.

#### Usage

```bash
cd scripts
python verify_compliance.py
```

#### Output

The script will generate a compliance report that includes:

- Database location check
- Cache location check
- Backup storage location check
- Configuration validation

### Manual Verification

1. Check that the production environment is deployed within Russian borders
2. Verify that all data storage components are running locally
3. Check that backups are stored within Russian borders
4. Review configuration files for compliance settings

## Data Backup and Retention

### Backup Configuration

The production environment is configured to take regular backups of the PostgreSQL database. Backups are stored in the `postgres-backups` volume.

### Retention Policy

- Daily backups are retained for 30 days
- Weekly backups are retained for 12 weeks
- Monthly backups are retained for 12 months

### Backup Procedure

```bash
# Create a manual backup
docker exec -t <postgres-container-id> pg_dump -U <db-user> <db-name> > backup.sql

# Restore from backup
cat backup.sql | docker exec -i <postgres-container-id> psql -U <db-user> -d <db-name>
```

## Incident Response

### Data Breach Notification

In the event of a data breach, the following steps must be taken:

1. Immediately notify the Russian Federal Service for Supervision of Communications, Information Technology and Mass Media (Roskomnadzor)
2. Notify affected individuals within 72 hours
3. Conduct a thorough investigation of the breach
4. Implement measures to prevent future breaches

### Data Breach Response Plan

1. **Detection and Analysis**: Identify the breach and determine its scope
2. **Containment**: Isolate affected systems to prevent further damage
3. **Eradication**: Remove the cause of the breach
4. **Recovery**: Restore systems to normal operations
5. **Notification**: Notify relevant authorities and affected individuals
6. **Post-Incident Analysis**: Review the incident and update security measures

## Audit and Compliance

### Regular Audits

- Quarterly security audits
- Annual penetration testing
- Monthly compliance checks

### Documentation

- All compliance-related changes must be documented
- Regular reviews of compliance documentation
- Maintenance of audit logs

## Contact Information

For questions about data storage compliance, contact the compliance team at compliance@erpgrhouse.ru.