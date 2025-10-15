# Image Optimization Pipeline

This directory contains the automated image optimization pipeline for GlitchRealm, designed to achieve significant performance improvements by optimizing images for modern web standards.

## Overview

The image optimization pipeline addresses critical performance bottlenecks identified in Lighthouse audits, targeting an 18.27s potential savings through:

- **Modern Image Formats**: Automatic conversion to WebP and AVIF with fallbacks
- **Responsive Images**: Generation of multiple sizes with proper srcset attributes  
- **Size Optimization**: Automatic resizing and compression with 60-80% size reduction target
- **Critical Image Preloading**: LCP optimization through strategic preloading
- **HTML Integration**: Automatic update of HTML files with optimized image references

## Scripts

### 1. `optimize-images.js`
Main image optimization script that processes images and generates optimized versions.

**Features:**
- Converts images to WebP (85% quality) and AVIF (80% quality) formats
- Generates responsive image sets (320w, 640w, 960w, 1280w, 1920w)
- Resizes images larger than 1920px to appropriate dimensions
- Validates compression ratios (targeting 60-80% reduction)
- Excludes Games folder per requirements
- Generates comprehensive optimization reports

**Usage:**
```bash
npm run optimize:images
```

### 2. `update-html-images.js`
Updates HTML files to use optimized images with modern performance attributes.

**Features:**
- Replaces img src attributes with optimized WebP versions
- Adds srcset and sizes attributes for responsive images
- Implements loading="lazy" and decoding="async" attributes
- Converts simple img tags to picture elements for better format support
- Adds width and height attributes to prevent layout shift

**Usage:**
```bash
npm run update:html
```

### 3. `add-critical-preloads.js`
Implements critical image preloading for LCP optimization.

**Features:**
- Identifies LCP images on key pages (index.html, games.html)
- Adds preload links for critical images in WebP/AVIF format
- Implements fetchpriority="high" for above-fold images
- Configures preconnect hints for image CDNs
- Removes duplicate preload links to avoid conflicts

**Usage:**
```bash
npm run add:preloads
```

## Complete Pipeline

Run the entire image optimization pipeline:

```bash
npm run build:images
```

This command executes all three scripts in sequence:
1. `optimize:images` - Generate optimized image formats
2. `update:html` - Update HTML files with optimized references
3. `add:preloads` - Add critical image preloading

## Configuration

### Image Processing Settings

```javascript
const config = {
  formats: {
    webp: { quality: 85, effort: 4 },
    avif: { quality: 80, effort: 4 },
    fallback: { quality: 90 }
  },
  optimization: {
    maxWidth: 1920,
    maxHeight: 1080,
    compressionLevel: 8
  },
  // Directories to process (Games folder excluded)
  inputDirs: ['assets', 'auth/assets', 'news/assets']
};
```

### Critical Images Configuration

```javascript
const criticalImages = {
  'index.html': [
    'assets/Game Logos/ByteSurge.png',
    'assets/logos/glitch-realm-logo.png'
  ],
  'games.html': [
    'assets/Game Logos/ByteSurge.png',
    'assets/Game Logos/CodeRunner Logo.png',
    'assets/Game Logos/ByteWars.png'
  ]
};
```

## Output Structure

```
optimized/
├── assets/
│   ├── game-logo.webp
│   ├── game-logo.avif
│   ├── game-logo.jpg
│   ├── game-logo-320w.webp
│   ├── game-logo-640w.webp
│   └── ...
├── optimization-report.json
├── optimization-summary.md
├── html-update-report.json
├── html-update-summary.md
├── preload-report.json
└── preload-summary.md
```

## Performance Impact

### Expected Improvements
- **Image Size Reduction**: 60-80% file size reduction
- **LCP Optimization**: Faster Largest Contentful Paint through preloading
- **Network Efficiency**: Reduced payload through modern formats
- **Core Web Vitals**: Improved scores across all metrics

### Validation
- Automatic compression ratio validation (60-80% target)
- Build failure on performance budget violations
- Comprehensive reporting with before/after metrics
- HTML validation for proper attribute implementation

## Requirements Compliance

This pipeline addresses the following requirements from the specification:

- **Requirement 1.1**: Modern image formats (WebP/AVIF) with fallbacks
- **Requirement 1.2**: Proper image sizing for display context
- **Requirement 1.3**: 60-80% size reduction through compression
- **Requirement 1.4**: Critical image preloading for LCP improvement
- **Requirement 1.6**: Quality optimization based on image type and size
- **Requirement 4.1**: Automated build-time optimization

## Error Handling

- **Format Support**: Graceful fallback when AVIF is not supported
- **Build Failures**: Continue with original images if optimization fails
- **File Access**: Skip missing directories with warnings
- **Validation**: Report compression ratios outside target range

## Monitoring

The pipeline generates detailed reports for:
- Image optimization statistics
- HTML update tracking
- Preload implementation status
- Error logging and debugging
- Performance impact measurement

## Integration

The image optimization pipeline integrates with:
- **Netlify Build Process**: Automated optimization during deployment
- **Performance Monitoring**: Lighthouse CI validation
- **Bundle Analysis**: Size impact tracking
- **Error Reporting**: Comprehensive logging and alerts