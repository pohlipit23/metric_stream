# Cloudflare Access Setup Guide

This guide explains how to configure Cloudflare Access authentication for the Daily Index Tracker Admin Console.

## Prerequisites

1. Cloudflare account with Zero Trust (formerly Cloudflare for Teams) enabled
2. Domain configured in Cloudflare
3. Admin Console deployed to Cloudflare Pages

## Step 1: Enable Cloudflare Access

1. Go to the Cloudflare dashboard
2. Navigate to **Zero Trust** > **Access** > **Applications**
3. Click **Add an application**
4. Select **Self-hosted**

## Step 2: Configure Application Settings

### Basic Settings
- **Application name**: `Daily Index Tracker Admin Console`
- **Session Duration**: `24 hours` (or as per your security policy)
- **Application domain**: `admin.your-domain.com` (your admin console domain)
- **Path**: `/` (protect the entire application)

### Identity Providers
Configure at least one identity provider:

#### Option 1: Email OTP
- Go to **Settings** > **Authentication**
- Enable **One-time PIN**
- Configure allowed email domains

#### Option 2: Google Workspace
- Go to **Settings** > **Authentication**
- Add **Google Workspace** as identity provider
- Configure your Google Workspace domain

#### Option 3: Azure AD
- Go to **Settings** > **Authentication**  
- Add **Azure AD** as identity provider
- Configure your Azure AD tenant

## Step 3: Create Access Policies

### Policy 1: Admin Access
- **Policy name**: `Admin Console Access`
- **Action**: `Allow`
- **Rules**:
  - **Include**: `Emails` → Add admin email addresses
  - OR **Include**: `Email domains` → Add your organization domain
  - OR **Include**: `Groups` → Add specific groups if using directory integration

### Policy 2: Block All Others (Optional)
- **Policy name**: `Block Others`
- **Action**: `Block`
- **Rules**:
  - **Include**: `Everyone`

## Step 4: Configure Application Headers

Cloudflare Access automatically adds headers that the application can use:

- `CF-Access-Authenticated-User-Email`: User's email address
- `CF-Access-Authenticated-User-Name`: User's display name
- `CF-Access-Authenticated-User-Groups`: User's groups (if applicable)

## Step 5: Update Admin Console Worker

The Admin Console Worker should be configured to read these headers:

```javascript
// Example handler in Admin Console Worker
export default {
  async fetch(request, env) {
    // Get user info from Cloudflare Access headers
    const userEmail = request.headers.get('CF-Access-Authenticated-User-Email')
    const userName = request.headers.get('CF-Access-Authenticated-User-Name')
    const userGroups = request.headers.get('CF-Access-Authenticated-User-Groups')
    
    if (!userEmail) {
      return new Response('Unauthorized', { status: 401 })
    }
    
    // Handle API requests with authenticated user context
    // ...
  }
}
```

## Step 6: Test Authentication

1. Deploy the admin console to Cloudflare Pages
2. Navigate to your admin console domain
3. You should be redirected to Cloudflare Access login
4. After successful authentication, you should be redirected back to the admin console

## Development Mode

For local development, the application includes a development mode that simulates authentication:

- Set `NODE_ENV=development` or run with `npm run dev`
- The app will simulate a logged-in user without requiring Cloudflare Access
- This allows for local development without authentication barriers

## Troubleshooting

### Common Issues

#### 1. Infinite Redirect Loop
- Check that the application domain matches exactly
- Ensure the path is set to `/`
- Verify DNS is pointing to Cloudflare

#### 2. Access Denied
- Check that your email/domain is included in the access policy
- Verify the identity provider is configured correctly
- Check that the policy action is set to "Allow"

#### 3. Headers Not Available
- Ensure the application is behind Cloudflare Access
- Check that the domain is properly configured
- Verify the application is not bypassing Cloudflare

### Debug Headers

You can check if Cloudflare Access headers are present by adding this to your Admin Console Worker:

```javascript
// Debug endpoint to check headers
if (url.pathname === '/debug/headers') {
  const headers = {}
  request.headers.forEach((value, key) => {
    if (key.startsWith('cf-access-')) {
      headers[key] = value
    }
  })
  
  return new Response(JSON.stringify(headers, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

## Security Considerations

1. **Session Duration**: Set appropriate session duration based on your security requirements
2. **IP Restrictions**: Consider adding IP-based rules for additional security
3. **Device Policies**: Configure device trust policies if needed
4. **Audit Logs**: Enable and monitor Cloudflare Access audit logs
5. **Regular Review**: Regularly review and update access policies

## Additional Resources

- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/applications/)
- [Zero Trust Dashboard](https://one.dash.cloudflare.com/)
- [Cloudflare Access API](https://developers.cloudflare.com/api/operations/access-applications-list-access-applications)