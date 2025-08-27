# Deployment Guide

This guide provides step-by-step instructions for deploying the Interactive Pokédex to various hosting platforms.

## Quick Deployment Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy from project directory**
   ```bash
   vercel
   ```

3. **Follow the prompts**
   - Choose "yes" to deploy
   - Select your account/team
   - Name your project
   - Choose the project directory (current)
   - Override settings? No

### Option 2: Netlify

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

3. **Deploy**
   ```bash
   netlify deploy --prod --dir=dist
   ```

### Option 3: GitHub Pages

1. **Add homepage to package.json**
   ```json
   {
     "homepage": "https://yourusername.github.io/deepdive"
   }
   ```

2. **Install gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

3. **Add deploy scripts to package.json**
   ```json
   {
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

## Environment Configuration

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Build Optimization Settings

The application is configured for optimal production builds:

- **Tree Shaking**: Unused code is automatically removed
- **Code Splitting**: Routes are lazy-loaded
- **Asset Optimization**: Images and CSS are optimized
- **Bundle Analysis**: Use `npm run build -- --analyze` to analyze bundle size

## Performance Considerations

### Core Web Vitals Targets
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

### Optimization Features
- Lazy loading of Pokemon images
- Debounced search inputs
- Efficient API request batching
- Responsive image loading
- CSS-in-JS optimization

## Monitoring & Analytics

### Recommended Tools
- **Lighthouse**: Performance monitoring
- **Web Vitals**: Core metrics tracking
- **Sentry**: Error tracking
- **Google Analytics**: User behavior tracking

### Performance Monitoring Setup

1. **Add performance monitoring**
   ```javascript
   // Add to main.tsx
   import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

   getCLS(console.log);
   getFID(console.log);
   getFCP(console.log);
   getLCP(console.log);
   getTTFB(console.log);
   ```

## Security Considerations

### Content Security Policy (CSP)
Add the following headers for enhanced security:

```
Content-Security-Policy: default-src 'self'; img-src 'self' https://raw.githubusercontent.com https://pokeapi.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self' https://pokeapi.co
```

### HTTPS Configuration
Ensure HTTPS is enabled on your hosting platform:
- Vercel: HTTPS enabled by default
- Netlify: HTTPS enabled by default
- GitHub Pages: Enable in repository settings

## Custom Domain Setup

### Vercel
1. Go to your project dashboard
2. Click "Domains"
3. Add your custom domain
4. Configure DNS records as instructed

### Netlify
1. Go to Site settings
2. Click "Domain management"
3. Add custom domain
4. Update DNS records

## Troubleshooting

### Common Build Issues

**Issue: Module not found errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue: Build fails with memory errors**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

**Issue: API requests fail in production**
- Ensure CORS is properly configured
- Check API endpoint URLs are correct
- Verify network connectivity to PokéAPI

### Performance Issues

**Issue: Slow initial load**
- Check bundle size with `npm run build -- --analyze`
- Implement additional code splitting
- Optimize images and assets

**Issue: Poor mobile performance**
- Test on actual devices
- Optimize touch interactions
- Reduce animation complexity

## Continuous Deployment

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm ci
    - name: Build
      run: npm run build
    - name: Deploy to Vercel
      uses: vercel/action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## Rollback Strategy

### Quick Rollback (Vercel)
```bash
vercel rollback [deployment-url]
```

### Manual Rollback
1. Keep previous build artifacts
2. Deploy previous version
3. Update DNS if necessary

## Support & Maintenance

### Regular Maintenance Tasks
- Update dependencies monthly
- Monitor performance metrics
- Review error logs
- Test on new browsers/devices

### Emergency Contacts
- Platform Support: Check hosting provider documentation
- DNS Issues: Contact domain registrar
- CDN Issues: Check CDN provider status

---

**Need Help?** Check the hosting provider's documentation or contact their support team for platform-specific issues.
