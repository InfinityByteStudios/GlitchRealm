#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class HTMLImageUpdater {
  constructor() {
    this.updatedFiles = [];
    this.errors = [];
    this.imageMap = new Map();
  }

  async run() {
    
    try {
      // Load optimization report to get image mappings
      await this.loadImageMappings();
      
      // Find and update HTML files
      await this.updateHTMLFiles();
      
      // Generate update report
      await this.generateUpdateReport();
      
      
    } catch (error) {
      console.error('❌ HTML update failed:', error);
      process.exit(1);
    }
  }

  async loadImageMappings() {
    try {
      const reportPath = path.join('optimized', 'optimization-report.json');
      const reportData = await fs.readFile(reportPath, 'utf8');
      const report = JSON.parse(reportData);
      
      // Create mapping from original images to optimized versions
      for (const imageInfo of report.images) {
        const originalPath = imageInfo.original;
        const optimizedPaths = {
          webp: imageInfo.optimized.webp?.path,
          avif: imageInfo.optimized.avif?.path,
          fallback: imageInfo.optimized.fallback?.path,
          responsive: imageInfo.responsive?.srcset || []
        };
        
        this.imageMap.set(originalPath, optimizedPaths);
      }
      
      
    } catch (error) {
      console.error('❌ Failed to load optimization report:', error);
      throw error;
    }
  }

  async updateHTMLFiles() {
    const htmlFiles = await this.findHTMLFiles();
    
    for (const htmlFile of htmlFiles) {
      await this.updateHTMLFile(htmlFile);
    }
  }

  async findHTMLFiles() {
    const htmlFiles = [];
    const excludeDirs = ['node_modules', '.git', 'optimized', 'Games']; // Exclude Games per requirements
    
    async function scanDirectory(dir) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !excludeDirs.includes(entry.name)) {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.html')) {
            htmlFiles.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not scan directory ${dir}:`, error.message);
      }
    }
    
    await scanDirectory('.');
    return htmlFiles;
  }

  async updateHTMLFile(htmlFilePath) {
    try {
      
      let content = await fs.readFile(htmlFilePath, 'utf8');
      let hasChanges = false;
      const changes = [];
      
      // Update img tags
      content = content.replace(/<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (match, beforeSrc, srcValue, afterSrc) => {
        const optimizedPaths = this.imageMap.get(srcValue);
        
        if (optimizedPaths && optimizedPaths.webp) {
          hasChanges = true;
          
          // Extract existing attributes
          const attributes = this.parseAttributes(beforeSrc + afterSrc);
          
          // Add performance attributes if not present
          if (!attributes.loading) attributes.loading = 'lazy';
          if (!attributes.decoding) attributes.decoding = 'async';
          
          // Generate responsive srcset if available
          let srcsetAttr = '';
          if (optimizedPaths.responsive && optimizedPaths.responsive.length > 0) {
            srcsetAttr = ` srcset="${optimizedPaths.responsive.join(', ')}"`;
            if (!attributes.sizes) {
              attributes.sizes = this.generateSizesAttribute(srcValue);
            }
          }
          
          // Build new img tag with optimized WebP source
          const webpPath = optimizedPaths.webp.replace(/\\/g, '/'); // Normalize path separators
          const attributeString = this.buildAttributeString(attributes);
          const newTag = `<img src="${webpPath}"${srcsetAttr}${attributeString}>`;
          
          changes.push({
            type: 'img',
            original: match,
            updated: newTag,
            originalSrc: srcValue,
            optimizedSrc: webpPath
          });
          
          return newTag;
        }
        
        return match;
      });
      
      // Convert simple img tags to picture elements for better format support
      content = content.replace(/<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (match, beforeSrc, srcValue, afterSrc) => {
        const optimizedPaths = this.imageMap.get(srcValue);
        
        if (optimizedPaths && (optimizedPaths.avif || optimizedPaths.webp)) {
          hasChanges = true;
          
          const attributes = this.parseAttributes(beforeSrc + afterSrc);
          const attributeString = this.buildAttributeString(attributes);
          
          let pictureContent = '<picture>\n';
          
          // Add AVIF source if available
          if (optimizedPaths.avif) {
            const avifPath = optimizedPaths.avif.replace(/\\/g, '/');
            pictureContent += `  <source srcset="${avifPath}" type="image/avif">\n`;
          }
          
          // Add WebP source if available
          if (optimizedPaths.webp) {
            const webpPath = optimizedPaths.webp.replace(/\\/g, '/');
            pictureContent += `  <source srcset="${webpPath}" type="image/webp">\n`;
          }
          
          // Add fallback img
          const fallbackPath = optimizedPaths.fallback ? 
            optimizedPaths.fallback.replace(/\\/g, '/') : 
            srcValue;
          pictureContent += `  <img src="${fallbackPath}"${attributeString}>\n`;
          pictureContent += '</picture>';
          
          changes.push({
            type: 'picture',
            original: match,
            updated: pictureContent,
            originalSrc: srcValue,
            optimizedSrc: fallbackPath
          });
          
          return pictureContent;
        }
        
        return match;
      });
      
      if (hasChanges) {
        await fs.writeFile(htmlFilePath, content, 'utf8');
        this.updatedFiles.push({
          file: htmlFilePath,
          changes: changes.length,
          changeDetails: changes
        });
      } else {
      }
      
    } catch (error) {
      console.error(`❌ Error updating ${htmlFilePath}:`, error);
      this.errors.push({ file: htmlFilePath, error: error.message });
    }
  }

  parseAttributes(attributeString) {
    const attributes = {};
    const attrRegex = /(\w+)=["']([^"']*)["']/g;
    let match;
    
    while ((match = attrRegex.exec(attributeString)) !== null) {
      attributes[match[1]] = match[2];
    }
    
    // Parse attributes without quotes
    const simpleAttrRegex = /(\w+)(?!=)/g;
    const withoutQuoted = attributeString.replace(/\w+=["'][^"']*["']/g, '');
    while ((match = simpleAttrRegex.exec(withoutQuoted)) !== null) {
      if (!attributes[match[1]]) {
        attributes[match[1]] = '';
      }
    }
    
    return attributes;
  }

  buildAttributeString(attributes) {
    return Object.entries(attributes)
      .map(([key, value]) => value === '' ? ` ${key}` : ` ${key}="${value}"`)
      .join('');
  }

  generateSizesAttribute(imagePath) {
    // Generate appropriate sizes attribute based on image context
    const fileName = path.basename(imagePath).toLowerCase();
    
    if (fileName.includes('hero') || fileName.includes('banner')) {
      return '100vw';
    } else if (fileName.includes('card') || fileName.includes('thumb')) {
      return '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw';
    } else if (fileName.includes('icon') || fileName.includes('logo')) {
      return '(max-width: 640px) 64px, 128px';
    }
    
    return '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw';
  }

  async generateUpdateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFilesProcessed: this.updatedFiles.length,
        totalImagesUpdated: this.updatedFiles.reduce((sum, file) => sum + file.changes, 0),
        errors: this.errors.length
      },
      updatedFiles: this.updatedFiles,
      errors: this.errors
    };

    const reportPath = path.join('optimized', 'html-update-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate human-readable summary
    const summaryPath = path.join('optimized', 'html-update-summary.md');
    const summary = this.generateUpdateSummaryMarkdown(report);
    await fs.writeFile(summaryPath, summary);
    
  }

  generateUpdateSummaryMarkdown(report) {
    const { summary, updatedFiles, errors } = report;
    
    let markdown = `# HTML Image Update Report\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Files Updated:** ${summary.totalFilesProcessed}\n`;
    markdown += `- **Images Optimized:** ${summary.totalImagesUpdated}\n`;
    markdown += `- **Errors:** ${summary.errors}\n\n`;
    
    if (updatedFiles.length > 0) {
      markdown += `## Updated Files\n\n`;
      markdown += `| File | Images Updated | Changes |\n`;
      markdown += `|------|----------------|----------|\n`;
      
      for (const file of updatedFiles) {
        const changeTypes = file.changeDetails.map(c => c.type).join(', ');
        markdown += `| ${file.file} | ${file.changes} | ${changeTypes} |\n`;
      }
      markdown += `\n`;
      
      markdown += `## Performance Improvements Applied\n\n`;
      markdown += `- ✅ **Modern Image Formats**: Images converted to WebP/AVIF with fallbacks\n`;
      markdown += `- ✅ **Lazy Loading**: Added \`loading="lazy"\` to non-critical images\n`;
      markdown += `- ✅ **Async Decoding**: Added \`decoding="async"\` for better performance\n`;
      markdown += `- ✅ **Responsive Images**: Added \`srcset\` and \`sizes\` attributes where applicable\n`;
      markdown += `- ✅ **Picture Elements**: Used \`<picture>\` for better format support\n\n`;
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

// Run the updater if called directly
if (require.main === module) {
  const updater = new HTMLImageUpdater();
  updater.run().catch(console.error);
}

module.exports = HTMLImageUpdater;