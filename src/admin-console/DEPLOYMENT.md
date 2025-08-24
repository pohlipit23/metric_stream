# Admin Console Deployment Guide

## Cloudflare Pages Deployment

### Prerequisites
1. Install Wrangler CLI: `npm install -g wrangler`
2. Authenticate with Cloudflare: `wrangler login`

### Manual Deployment

#### Development/Staging
```bash
cd src/admin-console
npm run deploy:staging
```

#### Production
```bash
cd src/admin-console
npm run deploy:production
```

### Automatic Deployment (CI/CD)

#### GitHub Actions
Create `.github/workflows/deploy-admin-console.yml`:

```yaml
name: Deploy Admin Console

on:
  push:
    branches: [main]
    paths: ['src/admin-console/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd src/admin-console
          npm ci
      - name: Build and Deploy
        run: |
          cd src/admin-console
          npm run deploy:production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Configuration

#### Environment Variables
Set these in your Cloudflare Pages project settings:
- `VITE_API_BASE_URL`: URL of your Admin Console Worker
- `VITE_APP_NAME`: Application name
- `VITE_APP_VERSION`: Current version

#### Custom Domain
1. Go to Cloudflare Pages dashboard
2. Select your project
3. Go to "Custom domains" tab
4. Add your domain (e.g., `admin.your-domain.com`)

#### Cloudflare Access Integration
1. Go to Cloudflare Zero Trust dashboard
2. Create an Access application for your admin console domain
3. Configure authentication policies
4. The frontend will automatically redirect to Cloudflare Access for authentication

### Build Configuration

The project uses Vite for building. Key configuration:
- Output directory: `dist/`
- SPA routing handled by `_redirects` file
- Security headers configured in `_headers` file
- Tailwind CSS for styling
- React Router for client-side routing

### Troubleshooting

#### Build Failures
- Ensure all dependencies are installed: `npm ci`
- Check for TypeScript/ESLint errors: `npm run lint`
- Verify Tailwind CSS configuration

#### Deployment Issues
- Verify Wrangler authentication: `wrangler whoami`
- Check Cloudflare API token permissions
- Ensure correct project name in `wrangler.toml`

#### Runtime Issues
- Check browser console for errors
- Verify API endpoints are accessible
- Ensure Cloudflare Access is properly configured