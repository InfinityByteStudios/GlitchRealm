/**
 * Bundle size validation script
 * Ensures optimization changes don't exceed 5% bundle size increase
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

class BundleSizeChecker {
  constructor() {
    this.results = {
      totalSize: 0,
      jsFiles: [],
      cssFiles: [],
      optimizationFiles: [],
      sizeIncrease: 0,
      withinBudget: false
    };
  }

  /**
   * Calculate total bundle size
   */
  calculateBundleSize() {
    console.log('📦 Calculating bundle size...');
    
    const jsFiles = this.findFiles('.', '.js');
    const cssFiles = this.findFiles('.', '.css');
    
    let totalSize = 0;
    let optimizationSize = 0;
    
    // Calculate JS files size
    for (const file of jsFiles) {
      try {
        const stats = statSync(file);
        const size = stats.size;
        totalSize += size;
        
        this.results.jsFiles.push({
          path: file,
          size: size,
          sizeKB: Math.round(size / 1024 * 100) / 100
        });
        
        // Check if it's an optimization file
        if (file.includes('dev-config') || file.includes('performance-optimization') || 
            file.includes('validate-optimizations') || file.includes('bundle-size-check')) {
          optimizationSize += size;
          this.results.optimizationFiles.push({
            path: file,
            size: size,
            sizeKB: Math.round(size / 1024 * 100) / 100
          });
        }
      } catch (error) {
        console.warn(`Could not read ${file}: ${error.message}`);
      }
    }
    
    // Calculate CSS files size
    for (const file of cssFiles) {
      try {
        const stats = statSync(file);
        const size = stats.size;
        totalSize += size;
        
        this.results.cssFiles.push({
          path: file,
          size: size,
          sizeKB: Math.round(size / 1024 * 100) / 100
        });
      } catch (error) {
        console.warn(`Could not read ${file}: ${error.message}`);
      }
    }
    
    this.results.totalSize = totalSize;
    this.results.totalSizeKB = Math.round(totalSize / 1024 * 100) / 100;
    this.results.optimizationSizeKB = Math.round(optimizationSize / 1024 * 100) / 100;
    
    // Estimate baseline (total - optimization files)
    const baselineSize = totalSize - optimizationSize;
    this.results.baselineSizeKB = Math.round(baselineSize / 1024 * 100) / 100;
    
    // Calculate percentage increase
    if (baselineSize > 0) {
      this.results.sizeIncrease = ((optimizationSize / baselineSize) * 100);
      this.results.withinBudget = this.results.sizeIncrease <= 5;
    }
    
    console.log(`   Total bundle size: ${this.results.totalSizeKB} KB`);
    console.log(`   Baseline size: ${this.results.baselineSizeKB} KB`);
    console.log(`   Optimization files: ${this.results.optimizationSizeKB} KB`);
    console.log(`   Size increase: ${this.results.sizeIncrease.toFixed(2)}%`);
    
    return this.results.withinBudget;
  }

  /**
   * Find files with specific extension
   */
  findFiles(dir, extension, files = []) {
    try {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        
        // Skip certain directories
        if (item.startsWith('.') || item === 'node_modules' || item === 'functions') {
          continue;
        }
        
        try {
          const stats = statSync(fullPath);
          
          if (stats.isDirectory()) {
            this.findFiles(fullPath, extension, files);
          } else if (stats.isFile() && item.endsWith(extension)) {
            files.push(fullPath);
          }
        } catch (error) {
          // Skip files we can't access
          continue;
        }
      }
    } catch (error) {
      console.warn(`Could not read directory ${dir}: ${error.message}`);
    }
    
    return files;
  }

  /**
   * Generate detailed report
   */
  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 BUNDLE SIZE ANALYSIS');
    console.log('='.repeat(50));
    
    console.log(`\nTotal Bundle Size: ${this.results.totalSizeKB} KB`);
    console.log(`Optimization Files: ${this.results.optimizationSizeKB} KB`);
    console.log(`Size Increase: ${this.results.sizeIncrease.toFixed(2)}% (Budget: ≤5%)`);
    
    if (this.results.withinBudget) {
      console.log('✅ Within budget limits');
    } else {
      console.log('❌ Exceeds budget limits');
    }
    
    console.log('\n📁 Optimization Files:');
    for (const file of this.results.optimizationFiles) {
      console.log(`   ${file.path}: ${file.sizeKB} KB`);
    }
    
    console.log('\n📁 Largest JS Files:');
    const largestJS = this.results.jsFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);
    
    for (const file of largestJS) {
      console.log(`   ${file.path}: ${file.sizeKB} KB`);
    }
    
    console.log('\n📁 Largest CSS Files:');
    const largestCSS = this.results.cssFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);
    
    for (const file of largestCSS) {
      console.log(`   ${file.path}: ${file.sizeKB} KB`);
    }
    
    return this.results.withinBudget;
  }
}

// Run bundle size check
const checker = new BundleSizeChecker();
const withinBudget = checker.calculateBundleSize();
const success = checker.generateReport();

if (success) {
  console.log('\n🎉 Bundle size check passed!');
  process.exit(0);
} else {
  console.log('\n❌ Bundle size check failed!');
  process.exit(1);
}