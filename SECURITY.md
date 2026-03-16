# Security

If you find a vulnerability, please report it privately to the maintainers.

- Email: diegoezequielliberman@gmail.com
- Expected response: 72 business hours for confirmation.

Do not publish exploits publicly until a patch exists or coordinated disclosure agreement is reached.

## Security Features

### Authentication & Authorization
- **JWT Authentication**: Secure token-based authentication with access/refresh tokens
- **Admin Secrets**: Key-based authentication for development and testing
- **Password Recovery**: Secure recovery mechanism with admin secrets
- **Session Management**: Automatic token refresh and blacklisting on logout

### Data Protection
- **152-FZ Compliance**: Russian data protection law compliance
- **Input Validation**: SQL injection and XSS prevention
- **Rate Limiting**: Protection against abuse and brute force attacks
- **Webhook Validation**: Telegram webhook signature verification

### Development Security
- **Mock Mode**: Safe development without real ERPNext connections
- **Environment Variables**: Secure configuration management
- **Debug Controls**: Configurable debug mode for development

### Production Security
- **HTTPS Ready**: TLS/SSL support for production deployments
- **CORS Configuration**: Cross-origin resource sharing controls
- **Security Headers**: HTTP security headers implementation
- **Audit Logging**: Request and authentication logging

## Security Scanning

### Automated Security Tests
```bash
# Run security tests (from middleware directory)
cd middleware
bandit -r app/
safety check
```

### Code Analysis
- **Bandit**: Python security linter
- **Safety**: Dependency vulnerability scanner
- **Pre-commit hooks**: Automated security checks

## Security Best Practices

### For Contributors

- Do not upload credentials or `.env` files to the repository
- Use vaults or environment variables in CI/CD
- Scan the repo with `git-secrets` or `trufflehog` before publishing
- Follow secure coding practices
- Report security issues privately

### For Deployment

- Change all default passwords and secrets
- Use strong, unique JWT_SECRET_KEY
- Enable HTTPS in production
- Configure proper CORS origins
- Enable rate limiting
- Use PostgreSQL instead of SQLite for production
- Enable audit logging
- Keep dependencies updated
- Regular security updates

### For Development

- Use `.env` file for secrets
- Enable `ERP_MOCK_MODE` for safe development
- Use test Telegram bot token
- Never commit `.env` file
- Review security implications of changes

## Vulnerability Reporting

### Reporting Process

1. **Email**: diegoezequielliberman@gmail.com
2. **Response Time**: Within 72 business hours
3. **Coordination**: We'll work with you on disclosure timeline
4. **Recognition**: Security researchers will be acknowledged

### What to Include

- Vulnerability description
- Steps to reproduce
- Potential impact
- Proof of concept (if applicable)
- Suggested mitigation (if known)

### Disclosure Policy

- Private disclosure preferred
- Coordinated public disclosure
- Security advisory publication
- CVE assignment when appropriate

## Security Configuration

### Environment Variables

| Variable | Purpose | Recommended Setting |
|----------|---------|---------------------|
| `JWT_SECRET_KEY` | JWT token signing | Strong random string |
| `WEBHOOK_SECRET` | Webhook validation | Strong random string |
| `ADMIN_SECRET` | Admin authentication | Strong random string |
| `ENABLE_RATE_LIMITING` | Rate limiting control | `true` |
| `DEBUG_MODE` | Debug information | `false` in production |

### Rate Limiting

- **Default**: 60 requests per minute per IP
- **Authenticated**: 100 requests per minute
- **Admin**: 1000 requests per minute
- **Custom**: Configurable via `RATE_LIMIT_PER_MINUTE`

## Security Headers

The application implements security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

## Compliance

### Data Protection
- **152-FZ**: Russian federal law on personal data
- **GDPR Ready**: European data protection principles
- **Data Minimization**: Collect only necessary data
- **Consent Management**: User consent tracking

### Audit Trail
- **Authentication Events**: Login/logout tracking
- **API Access**: Request logging
- **Data Changes**: Modification tracking
- **Security Events**: Suspicious activity monitoring

---

**Last Updated**: March 13, 2026  
**Security Version**: 1.0
