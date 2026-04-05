# Security Policy

## Important Notice

Tilittaja is designed as a **local/single-tenant** bookkeeping application. It does **not** include user authentication, authorization, or multi-user access controls. The application trusts anyone who can reach the server.

**Do not expose Tilittaja directly to the public internet without additional security measures** 

## Security Considerations

### Data Storage

- All data is stored in local SQLite files on the server filesystem
- Receipt PDFs are stored on the local filesystem
- No data is sent to external services
- State transfer (export/import) creates ZIP files containing full database dumps — treat these as sensitive

### Network

- The development server listens on all interfaces by default (LAN accessible)
- No TLS/HTTPS is configured by default — use a reverse proxy for production
- The `datasource` cookie is `httpOnly` but not marked `secure` by default

### Dependencies

- Native dependencies (`better-sqlite3`) are compiled from source during installation
- Keep dependencies updated regularly with `yarn upgrade`
