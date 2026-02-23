# GlitchRealm Help Center

**Subdomain:** help.glitchrealm.ca

The Help Center is a standalone subdomain providing comprehensive documentation, FAQs, and support resources for GlitchRealm users, developers, and community members.

## Structure

```
help/
├── index.html                 # Main help center landing page
├── help-styles.css           # Help-specific styles
├── help-search.js            # Search functionality
├── netlify.toml              # Netlify deployment config
├── robots.txt                # SEO configuration
├── 404.html                  # Custom 404 page
├── _redirects                # Netlify redirects
├── getting-started/          # Getting started guides
├── account/                  # Account & profile help
├── games/                    # Games & gameplay guides
├── community/                # Community guidelines
├── developers/               # Developer documentation
├── safety/                   # Safety & security info
├── technical/                # Technical support
└── legal/                    # Legal & policies
```

## Features

- **Search functionality** - Live search across help articles
- **8 Main Categories** - Organized help topics
- **Cyberpunk theme** - Matches main site styling
- **Responsive design** - Mobile-friendly layout
- **Fast loading** - Optimized for performance
- **SEO optimized** - Proper meta tags and structure

## Design

The Help Center uses the same cyberpunk aesthetic as the main GlitchRealm site:
- CSS variables from `/styles.css`
- Glitch text effects
- Cyan/magenta color scheme
- Neural-button styling
- Consistent header/footer

## Deployment

Deploy as a subdomain via Netlify:

1. Create new Netlify site for help subdomain
2. Point to `/help` directory
3. Configure custom domain: `help.glitchrealm.ca`
4. Enable HTTPS
5. Deploy

## Navigation

- Main Help Center: `/`
- Categories: `/category-name/`
- Articles: `/category-name/article-name.html`

## Links Back to Main Site

All help pages include navigation to:
- Main site: `glitchrealm.ca`
- Games page
- Community
- Contact support

## Content Structure

Each category page includes:
- Category title and description
- Grid of help articles
- Back link to main help center
- Consistent header/footer

## Future Enhancements

- Full search results page
- Individual article pages with detailed content
- Multilingual support
- User feedback on articles
- Related articles suggestions
- Video tutorials

## Contact

For help content updates or issues:
- Email: support@glitchrealm.ca
- Main site: https://glitchrealm.ca/contact.html
