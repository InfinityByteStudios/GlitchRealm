#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class CriticalImagePreloader {
  constructor() {
    this.updatedFiles = [];
    this.errors = [];
    this.lcpImages = new Map();
    
    // Define LCP images for key pages based on analysis
    this.criticalImages = {
      'index.html': [
        'assets/Game Logos/ByteSurge.png',
        'assets/logos/glitch-realm-logo.png'
      ],
      'games.html': [
        'assets/Game Logos/ByteSurge.png',
        'assets/Game Logos/CodeRunner Logo.png',
        'assets/Game Logos/ByteWars.png'
      ],
      'community.html': [
        'assets/logos/glitch-realm-logo.png'
      ],
      'about.html': [
        'assets/logos/glitch-realm-logo.png'
      ]
    };
  }

  async run() {
    
    try {
      // Load optimization mappings if available
      await this.loadOptimizationMappings();
      
      // Update HTML files with preload links
      await this.addPreloadLinks();
      
      // Generate preload report
      await this.generatePreloadReport();
      
      
    } catch (error) {
      console.error('❌ Critical preloading failed:', error);
      process.exit(1);
    }
  }

  async loadOptimizationMappings() {
    try {
      const reportPath = path.join('optimized', 'optimization-report.json');
      const reportData = await fs.readFile(reportPath, 'utf8');
      const report = JSON.parse(reportData);
      
      // Create mapping from original images to optimized versions
      for (const imageInfo of report.images) {
        const originalPath = imageInfo.original;
        this.lcpImages.set(originalPath, {
          webp: imageInfo.optimized.webp?.path,
          avif: imageInfo.optimized.avif?.path,
          fallback: imageInfo.optimized.fallback?.path
        });
      }
      
      
    } catch (error) {
      // Continue without optimization mappings
    }
  }

  async addPreloadLinks() {
    for (const [htmlFile, criticalImagePaths] of Object.entries(this.criticalImages)) {
      await this.updateHTMLWithPreloads(htmlFile, criticalImagePaths);
    }
  }

  async updateHTMLWithPreloads(htmlFilePath, criticalImagePaths) {
    try {
      // Check if file exists
      try {
        await fs.access(htmlFilePath);
      } catch {
        return;
      }

      
      let content = await fs.readFile(htmlFilePath, 'utf8');
      let hasChanges = false;
      const addedPreloads = [];
      
      // Find the head section
      const headMatch = content.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
      if (!headMatch) {
        console.warn(`⚠️  No <head> section found in ${htmlFilePath}`);
        return;
      }
      
      let headContent = headMatch[1];
      
      // Remove existing LCP image preloads to avoid duplicates
      headContent = headContent.replace(/\s*<link[^>]*rel=["']preload["'][^>]*as=["']image["'][^>]*>\s*/gi, '');
      
      // Generate new preload links
      let preloadLinks = '\n    <!-- Critical LCP Image Preloads -->\n';
      
      for (const imagePath of criticalImagePaths) {
        const optimizedPaths = this.lcpImages.get(imagePath);
        let preloadPath = imagePath;
        let imageType = '';
        
        if (optimizedPaths) {
          // Prefer AVIF, then WebP, then fallback
          if (optimizedPaths.avif) {
            preloadPath = optimizedPaths.avif.replace(/\\/g, '/');
            imageType = ' type="image/avif"';
          } else if (optimizedPaths.webp) {
            preloadPath = optimizedPaths.webp.replace(/\\/g, '/');
            imageType = ' type="image/webp"';
          } else if (optimizedPaths.fallback) {
            preloadPath = optimizedPaths.fallback.replace(/\\/g, '/');
          }
        }
        
        // Ensure path starts with / for absolute reference
        if (!preloadPath.startsWith('/') && !preloadPath.startsWith('http')) {
          preloadPath = '/' + preloadPath;
        }
        
        preloadLinks += `    <link rel="preload" as="image" href="${preloadPath}"${imageType} fetchpriority="high">\n`;
        addedPreloads.push({ original: imagePath, preload: preloadPath, type: imageType });
        hasChanges = true;
      }
      
      // Add preconnect hints for image CDNs if not already present
      if (!headContent.includes('rel="preconnect"') || !headContent.includes('images.unsplash.com')) {
        preloadLinks += '\n    <!-- Preconnect hints for image CDNs -->\n';
        preloadLinks += '    <link rel="preconnect" href="https://images.unsplash.com">\n';
        preloadLinks += '    <link rel="dns-prefetch" href="//images.unsplash.com">\n';
      }
      
      // Find the best insertion point (after meta tags, before stylesheets)
      const insertionPoints = [
        /<link[^>]*rel=["']stylesheet["'][^>]*>/i,
        /<link[^>]*rel=["']preload["'][^>]*as=["']style["'][^>]*>/i,
        /<style[^>]*>/i,
        /<script[^>]*>/i
      ];
      
      let insertionIndex = -1;
      for (const pattern of insertionPoints) {
        const match = headContent.search(pattern);
        if (match !== -1) {
          insertionIndex = match;
          break;
        }
      }
      
      if (insertionIndex === -1) {
        // Insert before closing head tag
        headContent = headContent + preloadLinks;
      } else {
        // Insert before the first stylesheet/script
        headContent = headContent.slice(0, insertionIndex) + preloadLinks + '\n    ' + headContent.slice(insertionIndex);
      }
      
      if (hasChanges) {
        // Replace the head content in the full HTML
        const newContent = content.replace(/<head[^>]*>[\s\S]*?<\/head>/i, `<head>${headContent}</head>`);
        
        await fs.writeFile(htmlFilePath, newContent, 'utf8');
        
        this.updatedFiles.push({
          file: htmlFilePath,
          preloadsAdded: addedPreloads.length,
          preloads: addedPreloads
        });
        
      } else {
      }
      
    } catch (error) {
      console.error(`❌ Error updating ${htmlFilePath}:`, error);
      this.errors.push({ file: htmlFilePath, error: error.message });
    }
  }

  async generatePreloadReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFilesUpdated: this.updatedFiles.length,
        totalPreloadsAdded: this.updatedFiles.reduce((sum, file) => sum + file.preloadsAdded, 0),
        errors: this.errors.length
      },
      updatedFiles: this.updatedFiles,
      errors: this.errors,
      criticalImageConfig: this.criticalImages
    };

    const reportPath = path.join('optimized', 'preload-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate human-readable summary
    const summaryPath = path.join('optimized', 'preload-summary.md');
    const summary = this.generatePreloadSummaryMarkdown(report);
    await fs.writeFile(summaryPath, summary);
    
  }

  generatePreloadSummaryMarkdown(report) {
    const { summary, updatedFiles, errors, criticalImageConfig } = report;
    
    let markdown = `# Critical Image Preloading Report\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Files Updated:** ${summary.totalFilesUpdated}\n`;
    markdown += `- **Preloads Added:** ${summary.totalPreloadsAdded}\n`;
    markdown += `- **Errors:** ${summary.errors}\n\n`;
    
    markdown += `## Performance Benefits\n\n`;
    markdown += `- ✅ **LCP Optimization**: Critical images preloaded with \`fetchpriority="high"\`\n`;
    markdown += `- ✅ **Modern Formats**: AVIF and WebP formats prioritized for preloading\n`;
    markdown += `- ✅ **CDN Preconnect**: Added preconnect hints for image CDNs\n`;
    markdown += `- ✅ **Above-fold Priority**: Critical images load before other resources\n\n`;
    
    if (updatedFiles.length > 0) {
      markdown += `## Updated Files\n\n`;
      markdown += `| File | Preloads Added | Critical Images |\n`;
      markdown += `|------|----------------|------------------|\n`;
      
      for (const file of updatedFiles) {
        const imageList = file.preloads.map(p => path.basename(p.original)).join(', ');
        markdown += `| ${file.file} | ${file.preloadsAdded} | ${imageList} |\n`;
      }
      markdown += `\n`;
      
      markdown += `## Preload Details\n\n`;
      for (const file of updatedFiles) {
        markdown += `### ${file.file}\n\n`;
        for (const preload of file.preloads) {
          markdown += `- **${preload.original}** → \`${preload.preload}\`${preload.type ? ` (${preload.type.replace(' type="', '').replace('"', '')})` : ''}\n`;
        }
        markdown += `\n`;
      }
    }
    
    markdown += `## Critical Image Configuration\n\n`;
    for (const [page, images] of Object.entries(criticalImageConfig)) {
      markdown += `### ${page}\n`;
      for (const image of images) {
        markdown += `- ${image}\n`;
      }
      markdown += `\n`;
    }
    
    if (errors.length > 0) {
      markdown += `## Errors\n\n`;
      for (const error of errors) {
        markdown += `- **${error.file}:** ${error.error}\n`;
      }
      markdown += `\n`;
    }
    
    return markdown;
  }
}

// Run the preloader if called directly
if (require.main === module) {
  const preloader = new CriticalImagePreloader();
  preloader.run().catch(console.error);
}

module.exports = CriticalImagePreloader;