# Docker Development Guide for GMShoot v2

This guide explains how to use the Docker setup for consistent development environments.

## Quick Start

### Prerequisites
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose

### Development Environment

1. **Build and start all services:**
   ```bash
   npm run docker:build
   npm run docker:up
   ```

2. **Start only development services:**
   ```bash
   npm run docker:dev
   ```

3. **View logs:**
   ```bash
   npm run docker:logs
   ```

4. **Stop all services:**
   ```bash
   npm run docker:down
   ```

5. **Clean up everything:**
   ```bash
   npm run docker:clean
   ```

## Services Overview

### App Service
- **URL:** http://localhost:3000
- **Environment:** Development
- **Hot reload:** Enabled
- **Volume mounted:** Source code for live updates

### Supabase Service
- **Studio:** http://localhost:54323
- **API:** http://localhost:54321
- **Database:** localhost:54322
- **Email testing:** http://localhost:54324

### Test Service
- **Purpose:** Run Jest tests in container
- **Command:** `npm run docker:test`
- **Coverage:** Generated in container

### E2E Service
- **Purpose:** Run Cypress tests
- **Command:** `npm run docker:e2e`
- **Videos:** Saved to `./cypress/videos`
- **Screenshots:** Saved to `./cypress/screenshots`

## Development Workflow

### 1. Initial Setup
```bash
# Clone and navigate to project
git clone <repository-url>
cd gmshooter-v2

# Start development environment
npm run docker:dev
```

### 2. Daily Development
```bash
# Start services (if not running)
npm run docker:up

# View logs in separate terminal
npm run docker:logs

# When done for the day
npm run docker:down
```

### 3. Testing Workflow
```bash
# Run unit tests
npm run docker:test

# Run E2E tests
npm run docker:e2e

# Run both test suites
npm run docker:test && npm run docker:e2e
```

## Environment Variables

The Docker setup automatically configures these environment variables:

### Development
- `NODE_ENV=development`
- `VITE_SUPABASE_URL=http://supabase:54321`
- `VITE_SUPABASE_ANON_KEY` (from .env)
- `VITE_USE_MOCK_HARDWARE=true`
- `VITE_ENABLE_EDGE_FUNCTIONS=false`

### Testing
- `NODE_ENV=test`
- Same Supabase configuration as development
- Additional test-specific variables

## Troubleshooting

### Port Conflicts
If ports are already in use:
```bash
# Check what's using ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :54321

# Kill processes if needed
sudo kill -9 <PID>
```

### Build Issues
```bash
# Rebuild from scratch
npm run docker:clean
npm run docker:build
npm run docker:up
```

### Volume Issues
```bash
# Check volume permissions
ls -la ./src

# Fix permissions if needed
sudo chown -R $USER:$USER .
```

### Container Issues
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs <service-name>

# Execute commands in container
docker-compose exec app bash
```

## Performance Tips

### 1. Use Docker Build Cache
Docker caches layers automatically. To force rebuild:
```bash
docker-compose build --no-cache
```

### 2. Optimize Volume Mounts
Only mount necessary directories for better performance:
```yaml
volumes:
  - ./src:/app/src
  - ./public:/app/public
  - /app/node_modules  # Use container's node_modules
```

### 3. Resource Limits
Add resource limits to docker-compose.yml if needed:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
    reservations:
      cpus: '1.0'
      memory: 1G
```

## CI/CD Integration

The Docker setup is designed to work seamlessly with CI/CD pipelines:

### GitHub Actions
```yaml
- name: Run Tests
  run: |
    docker-compose -f docker-compose.yml -f docker-compose.ci.yml up --abort-on-container-exit
```

### Environment-Specific Configurations
- `docker-compose.yml` - Local development
- `docker-compose.ci.yml` - CI/CD pipeline
- `docker-compose.prod.yml` - Production deployment

## Best Practices

### 1. Keep .dockerignore Updated
Regularly update `.dockerignore` to exclude:
- `node_modules`
- `build/`
- `coverage/`
- `.git/`
- Large files that don't need to be in container

### 2. Use Multi-Stage Builds
For production, use multi-stage builds to reduce image size:
```dockerfile
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
```

### 3. Health Checks
Add health checks to services:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Migration from Local Development

### 1. Backup Current Environment
```bash
# Export current environment variables
printenv > env-backup.txt

# Note any manual configurations
echo "Manual configurations:" > migration-notes.txt
```

### 2. Update Local Scripts
Replace local development commands:
- `npm start` → `npm run docker:dev`
- `npm test` → `npm run docker:test`
- `npm run test:e2e` → `npm run docker:e2e`

### 3. Update IDE Configuration
Configure your IDE to work with Docker:
- VS Code: Install Docker extension
- WebStorm: Configure Docker integration
- Vim/Emacs: Use Docker commands in terminal

## Security Considerations

### 1. Don't Commit Secrets
Never commit sensitive data:
- API keys
- Database passwords
- Personal access tokens

Use environment variables or Docker secrets:
```bash
docker-compose exec app printenv | grep SECRET
```

### 2. Regular Updates
Keep Docker images updated:
```bash
docker-compose pull
docker-compose up -d
```

### 3. Scan Images
Regularly scan for vulnerabilities:
```bash
docker scan gmshoot-app:latest
```

## Next Steps

After setting up Docker:

1. **Verify all services start correctly**
2. **Run the test suite to ensure compatibility**
3. **Update your development workflow**
4. **Configure CI/CD pipeline to use Docker**
5. **Train team members on Docker commands**

For issues not covered in this guide, check the [Docker documentation](https://docs.docker.com/) or create an issue in the project repository.