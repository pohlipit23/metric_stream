# Daily Index Tracker - Admin Console Frontend

A modern, responsive React-based admin console for managing the Daily Index Tracker system.

## Features

- **Modern UI**: Clean, minimalistic light theme design
- **Fully Responsive**: Optimized for desktop, tablet, and mobile devices
- **Cloudflare Access Integration**: Secure authentication via Cloudflare Access
- **KPI Management**: CRUD operations for KPI registry
- **System Configuration**: Manage timeouts, retries, and fallback settings
- **Real-time Monitoring**: System health and performance metrics
- **Dashboard**: Overview of system status and recent activity

## Technology Stack

- **React 19** - Modern React with hooks
- **Vite** - Fast build tool and development server
- **Tailwind CSS 3** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Lucide React** - Beautiful icon library
- **Cloudflare Pages** - Deployment platform

## Project Structure

```
src/
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   ├── Badge.jsx
│   │   ├── Modal.jsx
│   │   └── LoadingSpinner.jsx
│   ├── Layout.jsx          # Main layout component
│   └── AuthGuard.jsx       # Authentication wrapper
├── contexts/
│   └── AuthContext.jsx     # Authentication context
├── pages/
│   ├── Dashboard.jsx       # Main dashboard
│   ├── KPIRegistry.jsx     # KPI management
│   ├── SystemConfig.jsx    # System configuration
│   └── Monitoring.jsx      # System monitoring
├── App.jsx                 # Main app component
├── main.jsx               # Entry point
└── index.css              # Global styles
```

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
cd src/admin-console
npm install
```

### Development Server
```bash
npm run dev
```

The development server will start at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Deployment

### Cloudflare Pages

#### Manual Deployment
```bash
npm run deploy:production
```

#### Automatic Deployment
The project includes GitHub Actions workflow configuration for automatic deployment on push to main branch.

### Environment Variables

Set these in your Cloudflare Pages project:
- `VITE_API_BASE_URL`: URL of your Admin Console Worker API
- `VITE_APP_NAME`: Application name (default: "Daily Index Tracker")
- `VITE_APP_VERSION`: Current version

## Authentication

The admin console uses Cloudflare Access for authentication:

1. **Production**: Integrates with Cloudflare Access headers
2. **Development**: Simulates authentication for local development

See `CLOUDFLARE_ACCESS_SETUP.md` for detailed setup instructions.

## Features Overview

### Dashboard
- System overview with key metrics
- Recent job status and activity
- System health indicators
- Quick access to main functions

### KPI Registry
- Add, edit, and delete KPI configurations
- Link KPIs to N8N workflow webhooks
- View KPI status and last run information
- Responsive table with mobile optimization

### System Configuration
- Job management settings (timeouts, polling intervals)
- Retry configuration (attempts, backoff multipliers)
- Fallback settings (URLs, text, behavior)
- System behavior toggles

### Monitoring
- Real-time system metrics
- Worker status and health checks
- Recent job history and performance
- Queue depth and processing times

## Responsive Design

The admin console is fully responsive with breakpoints:
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md/lg)
- **Desktop**: > 1024px (xl)

Key responsive features:
- Collapsible sidebar navigation
- Responsive grid layouts
- Mobile-optimized forms and tables
- Touch-friendly interface elements

## UI Components

### Button
```jsx
import Button from './components/ui/Button'

<Button variant="primary" size="md">
  Primary Button
</Button>
```

### Card
```jsx
import Card from './components/ui/Card'

<Card>
  <Card.Header>Title</Card.Header>
  <Card.Content>Content</Card.Content>
</Card>
```

### Input
```jsx
import Input from './components/ui/Input'

<Input 
  label="Name"
  placeholder="Enter name"
  error="Error message"
/>
```

### Modal
```jsx
import Modal from './components/ui/Modal'

<Modal isOpen={open} onClose={handleClose} title="Modal Title">
  Modal content
</Modal>
```

## Customization

### Theme Colors
Update colors in `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Your color palette
      }
    }
  }
}
```

### Layout
Modify `src/components/Layout.jsx` for layout changes.

### Navigation
Update navigation items in `src/components/Layout.jsx`:
```javascript
const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  // Add more items
]
```

## Security

- **Cloudflare Access**: Enterprise-grade authentication
- **HTTPS Only**: All communications encrypted
- **CSP Headers**: Content Security Policy configured
- **XSS Protection**: Built-in React XSS protection
- **Secure Headers**: Security headers via `_headers` file

## Performance

- **Code Splitting**: Automatic route-based code splitting
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Automatic asset optimization via Vite
- **CDN Delivery**: Global CDN via Cloudflare Pages
- **Caching**: Aggressive caching for static assets

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow the existing code style
2. Use TypeScript for new components (optional)
3. Ensure responsive design
4. Test on multiple screen sizes
5. Update documentation

## Troubleshooting

### Build Issues
- Clear node_modules and reinstall dependencies
- Check Node.js version compatibility
- Verify Tailwind CSS configuration

### Authentication Issues
- Check Cloudflare Access configuration
- Verify domain and DNS settings
- Review browser console for errors

### Deployment Issues
- Verify Wrangler authentication
- Check Cloudflare API token permissions
- Review build logs for errors