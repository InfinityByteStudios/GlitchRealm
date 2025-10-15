#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Configuration for image optimization
const config = {
  formats: {
    webp: { quality: 85, effort: 4 },
    avif: { quality: 80, effort: 4 },
    fallback: { quality: 90 }
  },
  sizes: {
    hero: [320, 640, 960, 1280, 1920],
    card: [280, 400, 600],
    thumbnail: [150, 200, 300],
    icon: [32, 64, 128]
  },
  optimization: {
    maxWidth: 1920,
    maxHeight: 1080,
    compressionLevel: 8
  },
  // Directories to process (excluding Games folder per requirements)
  inputDirs: ['assets', 'auth/assets', 'news/assets'],
  outputDir: 'optimized',
  // File extensions to process
  extensions: ['.jpg', '.jpeg', '.png', '.webp'],
  // Size categories based on original dimensions
  sizeCategories: {
    hero: { minWidth: 800, sizes: [320, 640, 960, 1280, 1920] },
    card: { minWidth: 200, maxWidth: 799, sizes: [280, 400, 600] },
    thumbnail: { maxWidth: 199, sizes: [150, 200, 300] },
    icon: { maxWidth: 128, sizes: [32, 64, 128] }
  }
};

class ImageOptimizer {
  constructor() {
    this.processedImages = [];
    this.totalSavings = 0;
    this.errors = [];
  }

  async run() {
    console.log('🖼️  Starting image optimization pipeline...');
    
    try {
      // Create output directory
      await this.ensureOutputDir();
      
      // Process each input directory
      for (const inputDir of config.inputDirs) {
        if (await this.directoryExists(inputDir)) {
          await this.processDirectory(inputDir);
        } else {
          console.log(`⚠️  Directory ${inputDir} not found, skipping...`);
        }
      }
      
      // Generate optimization report
      await this.generateReport();
      
      console.log('✅ Image optimization completed successfully!');
      console.log(`📊 Total images processed: ${this.processedImages.length}`);
      console.log(`💾 Total size savings: ${this.formatBytes(this.totalSavings)}`);
      
    } catch (error) {
      console.error('❌ Image optimization failed:', error);
      process.exit(1);
    }
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(config.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${config.outputDir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async directoryExists(dirPath) {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  async processDirectory(inputDir) {
    console.log(`📂 Processing directory: ${inputDir}`);
    
    try {
      const files = await fs.readdir(inputDir, { recursive: true });
      
      for (const file of files) {
        const filePath = path.join(inputDir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile() && this.isImageFile(filePath)) {
          await this.processImage(filePath, inputDir);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing directory ${inputDir}:`, error);
      this.errors.push({ directory: inputDir, error: error.message });
    }
  }

  isImageFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return config.extensions.includes(ext);
  }

  async processImage(imagePath, baseDir) {
    try {
      console.log(`🔄 Processing: ${imagePath}`);
      
      // Get image metadata
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const originalSize = (await fs.stat(imagePath)).size;
      
      // Validate and resize if necessary
      const shouldResize = this.validateImageSize(metadata);
      let processedImage = image;
      
      if (shouldResize.needsResize) {
        console.log(`📏 Resizing ${imagePath}: ${metadata.width}x${metadata.height} -> ${shouldResize.newWidth}x${shouldResize.newHeight}`);
        processedImage = image.resize(shouldResize.newWidth, shouldResize.newHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      
      // Determine size category and responsive sizes
      const category = this.determineSizeCategory(metadata.width, metadata.height);
      const responsiveSizes = config.sizeCategories[category].sizes;
      
      // Create output directory structure
      const relativePath = path.relative(baseDir, imagePath);
      const outputBase = path.join(config.outputDir, baseDir, path.dirname(relativePath));
      await fs.mkdir(outputBase, { recursive: true });
      
      const baseName = path.parse(imagePath).name;
      const results = {
        original: imagePath,
        category,
        metadata,
        originalSize,
        resized: shouldResize.needsResize,
        newDimensions: shouldResize.needsResize ? { width: shouldResize.newWidth, height: shouldResize.newHeight } : null,
        optimized: {},
        responsive: {},
        savings: 0,
        compressionRatio: 0
      };

      // Generate optimized versions in different formats
      await this.generateFormats(processedImage, outputBase, baseName, results);
      
      // Generate responsive sizes
      await this.generateResponsiveSizes(imagePath, outputBase, baseName, responsiveSizes, results);
      
      // Calculate savings and validate compression ratio
      const bestOptimizedSize = Math.min(...Object.values(results.optimized).map(f => f.size));
      results.savings = originalSize - bestOptimizedSize;
      results.compressionRatio = (results.savings / originalSize) * 100;
      this.totalSavings += results.savings;
      
      // Validate compression meets target (60-80% reduction)
      const compressionValidation = this.validateCompression(results.compressionRatio);
      if (!compressionValidation.isValid) {
        console.log(`⚠️  ${imagePath}: ${compressionValidation.message}`);
      }
      
      this.processedImages.push(results);
      
      console.log(`✅ Optimized: ${imagePath} (${this.formatBytes(results.savings)} saved, ${results.compressionRatio.toFixed(1)}% reduction)`);
      
    } catch (error) {
      console.error(`❌ Error processing ${imagePath}:`, error);
      this.errors.push({ image: imagePath, error: error.message });
    }
  }

  validateImageSize(metadata) {
    const { width, height } = metadata;
    const { maxWidth, maxHeight } = config.optimization;
    
    let needsResize = false;
    let newWidth = width;
    let newHeight = height;
    
    if (width > maxWidth || height > maxHeight) {
      needsResize = true;
      
      // Calculate new dimensions maintaining aspect ratio
      const aspectRatio = width / height;
      
      if (width > maxWidth) {
        newWidth = maxWidth;
        newHeight = Math.round(maxWidth / aspectRatio);
      }
      
      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = Math.round(maxHeight * aspectRatio);
      }
    }
    
    return {
      needsResize,
      newWidth,
      newHeight,
      originalWidth: width,
      originalHeight: height
    };
  }

  validateCompression(compressionRatio) {
    const targetMin = 60; // 60% minimum reduction
    const targetMax = 80; // 80% maximum reduction
    
    if (compressionRatio < targetMin) {
      return {
        isValid: false,
        message: `Compression ratio ${compressionRatio.toFixed(1)}% is below target minimum of ${targetMin}%`
      };
    }
    
    if (compressionRatio > targetMax) {
      return {
        isValid: false,
        message: `Compression ratio ${compressionRatio.toFixed(1)}% exceeds target maximum of ${targetMax}% (possible quality loss)`
      };
    }
    
    return {
      isValid: true,
      message: `Compression ratio ${compressionRatio.toFixed(1)}% is within target range (${targetMin}-${targetMax}%)`
    };
  }

  determineSizeCategory(width, height) {
    if (width >= config.sizeCategories.hero.minWidth) return 'hero';
    if (width >= config.sizeCategories.card.minWidth && width <= config.sizeCategories.card.maxWidth) return 'card';
    if (width <= config.sizeCategories.thumbnail.maxWidth) return 'thumbnail';
    if (width <= config.sizeCategories.icon.maxWidth) return 'icon';
    return 'card'; // default
  }

  async generateFormats(image, outputBase, baseName, results) {
    // Generate WebP format
    const webpPath = path.join(outputBase, `${baseName}.webp`);
    await image
      .webp({ 
        quality: config.formats.webp.quality,
        effort: config.formats.webp.effort 
      })
      .toFile(webpPath);
    
    const webpSize = (await fs.stat(webpPath)).size;
    results.optimized.webp = { path: webpPath, size: webpSize };

    // Generate AVIF format (if supported)
    try {
      const avifPath = path.join(outputBase, `${baseName}.avif`);
      await image
        .avif({ 
          quality: config.formats.avif.quality,
          effort: config.formats.avif.effort 
        })
        .toFile(avifPath);
      
      const avifSize = (await fs.stat(avifPath)).size;
      results.optimized.avif = { path: avifPath, size: avifSize };
    } catch (error) {
      console.log(`⚠️  AVIF not supported for ${baseName}, skipping...`);
    }

    // Generate optimized fallback (JPEG/PNG)
    const originalExt = path.extname(results.original).toLowerCase();
    const fallbackExt = originalExt === '.png' ? '.png' : '.jpg';
    const fallbackPath = path.join(outputBase, `${baseName}${fallbackExt}`);
    
    let fallbackImage = image;
    if (fallbackExt === '.jpg') {
      fallbackImage = fallbackImage.jpeg({ quality: config.formats.fallback.quality });
    } else {
      fallbackImage = fallbackImage.png({ compressionLevel: config.optimization.compressionLevel });
    }
    
    await fallbackImage.toFile(fallbackPath);
    const fallbackSize = (await fs.stat(fallbackPath)).size;
    results.optimized.fallback = { path: fallbackPath, size: fallbackSize };
  }

  async generateResponsiveSizes(imagePath, outputBase, baseName, sizes, results) {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    
    results.responsive.sizes = [];
    results.responsive.srcset = [];

    for (const width of sizes) {
      // Only generate if the target width is smaller than original
      if (width < metadata.width) {
        const responsivePath = path.join(outputBase, `${baseName}-${width}w.webp`);
        
        await image
          .resize(width, null, { 
            withoutEnlargement: true,
            fit: 'inside'
          })
          .webp({ 
            quality: config.formats.webp.quality,
            effort: config.formats.webp.effort 
          })
          .toFile(responsivePath);
        
        const size = (await fs.stat(responsivePath)).size;
        results.responsive.sizes.push({ width, path: responsivePath, size });
        results.responsive.srcset.push(`${responsivePath} ${width}w`);
      }
    }
  }

  async generateReport() {
    // Calculate validation statistics
    const validationStats = this.calculateValidationStats();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalImages: this.processedImages.length,
        totalSavings: this.totalSavings,
        totalSavingsFormatted: this.formatBytes(this.totalSavings),
        averageSavings: this.processedImages.length > 0 ? this.totalSavings / this.processedImages.length : 0,
        averageCompressionRatio: validationStats.averageCompression,
        imagesResized: validationStats.resizedCount,
        compressionTargetMet: validationStats.targetMetCount,
        errors: this.errors.length
      },
      validation: validationStats,
      images: this.processedImages,
      errors: this.errors,
      config: config
    };

    const reportPath = path.join(config.outputDir, 'optimization-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate human-readable summary
    const summaryPath = path.join(config.outputDir, 'optimization-summary.md');
    const summary = this.generateSummaryMarkdown(report);
    await fs.writeFile(summaryPath, summary);
    
    console.log(`📋 Report generated: ${reportPath}`);
    console.log(`📋 Summary generated: ${summaryPath}`);
  }

  calculateValidationStats() {
    const totalImages = this.processedImages.length;
    if (totalImages === 0) return {};
    
    const resizedCount = this.processedImages.filter(img => img.resized).length;
    const compressionRatios = this.processedImages.map(img => img.compressionRatio);
    const averageCompression = compressionRatios.reduce((sum, ratio) => sum + ratio, 0) / totalImages;
    
    const targetMetCount = compressionRatios.filter(ratio => ratio >= 60 && ratio <= 80).length;
    const belowTargetCount = compressionRatios.filter(ratio => ratio < 60).length;
    const aboveTargetCount = compressionRatios.filter(ratio => ratio > 80).length;
    
    return {
      totalImages,
      resizedCount,
      resizedPercentage: (resizedCount / totalImages) * 100,
      averageCompression: averageCompression.toFixed(1),
      targetMetCount,
      targetMetPercentage: (targetMetCount / totalImages) * 100,
      belowTargetCount,
      aboveTargetCount,
      compressionDistribution: {
        min: Math.min(...compressionRatios).toFixed(1),
        max: Math.max(...compressionRatios).toFixed(1),
        median: this.calculateMedian(compressionRatios).toFixed(1)
      }
    };
  }

  calculateMedian(numbers) {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    
    return sorted[middle];
  }

  generateSummaryMarkdown(report) {
    const { summary, images, errors } = report;
    
    let markdown = `# Image Optimization Report\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Total Images Processed:** ${summary.totalImages}\n`;
    markdown += `- **Total Size Savings:** ${summary.totalSavingsFormatted}\n`;
    markdown += `- **Average Savings per Image:** ${this.formatBytes(summary.averageSavings)}\n`;
    markdown += `- **Errors:** ${summary.errors}\n\n`;
    
    if (images.length > 0) {
      markdown += `## Processed Images\n\n`;
      markdown += `| Original | Category | Original Size | Savings | Formats Generated |\n`;
      markdown += `|----------|----------|---------------|---------|-------------------|\n`;
      
      for (const img of images) {
        const formats = Object.keys(img.optimized).join(', ');
        markdown += `| ${img.original} | ${img.category} | ${this.formatBytes(img.originalSize)} | ${this.formatBytes(img.savings)} | ${formats} |\n`;
      }
      markdown += `\n`;
      
      // Add HTML usage examples
      markdown += `## HTML Usage Examples\n\n`;
      markdown += `### Modern Image Format with Fallbacks\n\n`;
      markdown += `\`\`\`html\n`;
      markdown += `<picture>\n`;
      markdown += `  <source srcset="optimized/assets/hero-image.avif" type="image/avif">\n`;
      markdown += `  <source srcset="optimized/assets/hero-image.webp" type="image/webp">\n`;
      markdown += `  <img src="optimized/assets/hero-image.jpg" alt="Hero image" loading="lazy" decoding="async">\n`;
      markdown += `</picture>\n`;
      markdown += `\`\`\`\n\n`;
      
      markdown += `### Responsive Images with Srcset\n\n`;
      markdown += `\`\`\`html\n`;
      markdown += `<img src="optimized/assets/hero-image.webp"\n`;
      markdown += `     srcset="optimized/assets/hero-image-320w.webp 320w,\n`;
      markdown += `             optimized/assets/hero-image-640w.webp 640w,\n`;
      markdown += `             optimized/assets/hero-image-960w.webp 960w,\n`;
      markdown += `             optimized/assets/hero-image-1280w.webp 1280w"\n`;
      markdown += `     sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw"\n`;
      markdown += `     alt="Hero image" loading="lazy" decoding="async">\n`;
      markdown += `\`\`\`\n\n`;
    }
    
    if (errors.length > 0) {
      markdown += `## Errors\n\n`;
      for (const error of errors) {
        markdown += `- **${error.image || error.directory}:** ${error.error}\n`;
      }
      markdown += `\n`;
    }
    
    return markdown;
  }

  // Utility method to generate HTML for optimized images
  static generateImageHTML(imagePath, alt = '', loading = 'lazy', sizes = '100vw') {
    const baseName = path.parse(imagePath).name;
    const baseDir = path.dirname(imagePath);
    const optimizedBase = path.join('optimized', baseDir, baseName);
    
    // Generate picture element with modern formats and fallbacks
    let html = `<picture>\n`;
    html += `  <source srcset="${optimizedBase}.avif" type="image/avif">\n`;
    html += `  <source srcset="${optimizedBase}.webp" type="image/webp">\n`;
    html += `  <img src="${optimizedBase}.jpg" alt="${alt}" loading="${loading}" decoding="async">\n`;
    html += `</picture>`;
    
    return html;
  }

  // Utility method to generate responsive srcset
  static generateResponsiveSrcset(imagePath, widths = [320, 640, 960, 1280]) {
    const baseName = path.parse(imagePath).name;
    const baseDir = path.dirname(imagePath);
    const optimizedBase = path.join('optimized', baseDir, baseName);
    
    const srcsetEntries = widths.map(width => `${optimizedBase}-${width}w.webp ${width}w`);
    return srcsetEntries.join(', ');
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Run the optimizer if called directly
if (require.main === module) {
  const optimizer = new ImageOptimizer();
  optimizer.run().catch(console.error);
}

module.exports = ImageOptimizer;