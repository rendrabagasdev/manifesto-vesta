# Vesta API Documentation

Complete API documentation for Vesta Marketplace integration.

## 📁 File Structure

```
docs/
├── README.md                    # Quick reference (this file)
├── API_README.md                # Full documentation
├── openapi.yaml                 # OpenAPI 3.1 specification
├── postman_collection.json      # Postman collection
└── examples/
    └── integration.ts           # TypeScript integration example
```

## 🚀 Quick Start

1. **View Interactive Documentation**
   ```
   http://localhost:3000/api-docs
   ```

2. **Download OpenAPI Spec**
   ```bash
   curl http://localhost:3000/api/docs/openapi.json > openapi.json
   ```

3. **Import Postman Collection**
   ```bash
   curl http://localhost:3000/api/docs/postman.json > vesta-collection.json
   # Import ke Postman
   ```

## 📚 Documentation Contents

### 1. Quick Reference ([README.md](./README.md))
- Endpoint summary table
- Authentication guide
- Quick curl examples
- Test user credentials

### 2. Full Documentation ([API_README.md](./API_README.md))
- Complete API reference
- Cascade freshness system explanation
- Rescue deals and loyalty tiers
- Detailed use cases with examples
- Error handling guide
- Rate limiting and webhooks
- Best practices
- SDK documentation

### 3. OpenAPI Specification ([openapi.yaml](./openapi.yaml))
- Machine-readable API spec
- Complete schema definitions
- Request/response examples
- Authentication schemes
- Use with Swagger UI, Postman, or code generators

### 4. Postman Collection ([postman_collection.json](./postman_collection.json))
- Pre-configured API requests
- Environment variables setup
- Request examples for all endpoints
- Import directly to Postman

### 5. Integration Examples ([examples/integration.ts](./examples/integration.ts))
- TypeScript/JavaScript client
- Complete usage examples
- Error handling patterns
- Retry logic implementation

## 🎯 Core Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `GET /api/products/{id}/breakdown` - Product pricing breakdown

### Batch Management (PRODUCER, WAREHOUSE, ADMIN)
- `POST /api/batches` - Create batch
- `PUT /api/batches/{id}/quality` - Update quality
- `POST /api/batches/{id}/sync` - Sync cascade state

### Orders (CONSUMER, BUSINESS, ADMIN)
- `POST /api/orders` - Place order
- `POST /api/rescue-deals/{id}/claim` - Claim rescue deal

### Cascade System
- `POST /api/demo/simulate-tick` - Simulate time (ADMIN, demo only)
- `GET /api/cron/cascade-tick` - Cron tick (Bearer auth)

### Admin Configuration (ADMIN)
- `GET /api/admin/config` - Get config
- `PUT /api/admin/config` - Update config

## 🔐 Authentication

### Session-based (Web Apps)
```javascript
// Handled automatically by NextAuth
Cookie: next-auth.session-token=...
```

### Bearer Token (Scripts/Cron)
```bash
Authorization: Bearer YOUR_CRON_SECRET
```

## 🧪 Testing

### Test Credentials
```
ADMIN:     admin@vesta.com / admin123
PRODUCER:  producer@vesta.com / producer123
WAREHOUSE: warehouse@vesta.com / warehouse123
CONSUMER:  consumer@vesta.com / consumer123
BUSINESS:  business@vesta.com / business123
```

### Postman Testing
1. Import collection: `http://localhost:3000/api/docs/postman.json`
2. Set environment variables:
   - `base_url`: `http://localhost:3000`
   - `session_token`: Get from browser cookies after login
   - `cron_secret`: Your `CRON_SECRET` env var
3. Run requests

## 📖 Read More

- **Full API Guide**: [API_README.md](./API_README.md)
- **Integration Examples**: [examples/integration.ts](./examples/integration.ts)
- **OpenAPI Spec**: [openapi.yaml](./openapi.yaml)
- **Swagger UI**: `http://localhost:3000/api-docs`

## 🛠️ For Developers

### Generate Client SDK
```bash
# Using OpenAPI Generator
openapi-generator-cli generate \
  -i http://localhost:3000/api/docs/openapi.json \
  -g typescript-fetch \
  -o ./sdk
```

### Validate OpenAPI Spec
```bash
npx @redocly/cli lint docs/openapi.yaml
```

### Integration Checklist
- [ ] Read [API_README.md](./API_README.md)
- [ ] Import Postman collection
- [ ] Test with provided credentials
- [ ] Implement authentication (session or bearer)
- [ ] Add error handling and retry logic
- [ ] Review rate limiting guidelines
- [ ] Set up webhook handlers (when available)

## 📞 Support

Need help? Check:
1. [API_README.md](./API_README.md) - Comprehensive guide
2. [examples/integration.ts](./examples/integration.ts) - Code examples
3. Swagger UI - Interactive testing
4. Email: api-support@vesta-marketplace.com
