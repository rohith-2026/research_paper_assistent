# Security Policy

## Supported Versions

Security updates are provided for:

| Version | Supported | End of Support |
|---------|-----------|----------------|
| 1.0.x   | ✅ Yes    | TBD            |
| < 1.0   | ❌ No     | Archived       |

## Reporting a Vulnerability

**Do not** open public issues for security vulnerabilities.

### Reporting Process

1. **Email:** Contact maintainers with vulnerability details
2. **Include:**
   - Description of the vulnerability
   - Steps to reproduce (if applicable)
   - Potential impact
   - Suggested fix (optional)
3. **Wait:** Allow 48 hours for initial response

### Response Timeline

1. Acknowledge receipt (48 hours)
2. Assess severity (72 hours)
3. Develop fix (varies)
4. Release patch (as soon as ready)
5. Credit reporter (unless requested otherwise)

## Security Considerations

### Authentication & Authorization

- JWT-based authentication with secure tokens
- Role-based access control (RBAC)
- Session management with timeouts
- Admin-only routes protected
- User password hashing (bcrypt)

### Data Protection

- MongoDB connection over secure channels
- Encrypted sensitive data (AES+HMAC)
- No credentials in repository
- Environment variables for secrets
- Input validation and sanitization

### API Security

- Rate limiting on endpoints
- CORS headers configured
- IP blocking middleware
- Request validation (Pydantic schemas)
- Error messages don't leak system info

### Dependency Security

- Regular dependency updates
- Security scanning via Dependabot
- Pinned versions in requirements.txt
- Monitor for CVEs

## Best Practices for Users

1. **Keep dependencies updated**
   ```bash
   pip install --upgrade -r requirements.txt
   npm audit fix
   ```

2. **Use strong secrets**
   - JWT_SECRET: 32+ characters
   - Database passwords: strong & unique
   - API keys: rotate regularly

3. **Enable monitoring**
   - Health check endpoints
   - Log anomalies
   - Track failed auth attempts

4. **Run in isolated environment**
   - Use Docker containers
   - Restrict network access
   - Use least-privilege credentials

## Known Security Notes

- Application is for **research and demonstration purposes**
- Document handling has security considerations
- User uploads should be scanned for malware
- Recommend antivirus for production

## Security Headers

Recommended for production deployment:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

## Dependency Advisories

Monitor for security updates:

- [Python Security](https://python-security.readthedocs.io/)
- [FastAPI Security](https://fastapi.tiangolo.com/advanced/security/)
- [React Security](https://react.dev/learn/security)
- [npm Advisories](https://www.npmjs.com/advisories)

## Questions?

Open an issue for security inquiries.

Thank you for helping keep this project secure! 🔒