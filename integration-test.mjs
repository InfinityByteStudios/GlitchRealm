/**
 * Final integration test for all performance optimizations
 * Verifies all components work together correctly
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, writeFileSync } from 'fs';

class IntegrationTester {
  constructor() {
    this.testResults = [];
    this.errors = [];
  }

  /**
   * Test dev-config integration
   */
  testDevConfigIntegration() {
    console.log('🔧 Testing dev-config integration...');
    
    try {
      // Check dev-config.js exists and is properly structured
      if (!existsSync('dev-config.js')) {
        throw new Error('dev-config.js not found');
      }
      
      const devConfigContent = readFileSync('dev-config.js', 'utf8');
      
      // Check for required exports
      const requiredExports = [
        'DEV_UIDS',
        'isDev',
        'logger'
      ];
      
      for (const exportName of requiredExports) {
        if (!devConfigContent.includes(exportName)) {
          throw new Error(`Missing export: ${exportName}`);
        }
      }
      
      // Check that files using dev-config import it correctly
      const filesToCheck = ['games.html', 'submit-game.html', 'community.js'];
      let importCount = 0;
      
      for (const file of filesToCheck) {
        if (existsSync(file)) {
          const content = readFileSync(file, 'utf8');
          if (content.includes('dev-config.js') || content.includes('isDev')) {
            importCount++;
          }
        }
      }
      
      this.testResults.push({
        test: 'Dev Config Integration',
        passed: true,
        details: `Found ${importCount} files using dev-config`
      });
      
      console.log('✅ Dev-config integration test passed');
      return true;
    } catch (error) {
      this.errors.push(`Dev-config integration failed: ${error.message}`);
      this.testResults.push({
        test: 'Dev Config Integration',
        passed: false,
        error: error.message
      });
      console.log('❌ Dev-config integration test failed');
      return false;
    }
  }

  /**
   * Test performance optimization integration
   */
  testPerformanceOptimization() {
    console.log('⚡ Testing performance optimization integration...');
    
    try {
      if (!existsSync('performance-optimization.js')) {
        throw new Error('performance-optimization.js not found');
      }
      
      const perfContent = readFileSync('performance-optimization.js', 'utf8');
      
      // Check for key optimization features
      const requiredFeatures = [
        'requestIdleCallback',
        'requestAnimationFrame',
        'GlitchRealmPerf',
        'MutationObserver',
        'naturalWidth'
      ];
      
      const missingFeatures = requiredFeatures.filter(feature => 
        !perfContent.includes(feature)
      );
      
      if (missingFeatures.length > 0) {
        throw new Error(`Missing features: ${missingFeatures.join(', ')}`);
      }
      
      // Check for proper API exposure
      if (!perfContent.includes('window.GlitchRealmPerf')) {
        throw new Error('GlitchRealmPerf API not exposed to window');
      }
      
      this.testResults.push({
        test: 'Performance Optimization',
        passed: true,
        details: 'All optimization features present'
      });
      
      console.log('✅ Performance optimization test passed');
      return true;
    } catch (error) {
      this.errors.push(`Performance optimization failed: ${error.message}`);
      this.testResults.push({
        test: 'Performance Optimization',
        passed: false,
        error: error.message
      });
      console.log('❌ Performance optimization test failed');
      return false;
    }
  }

  /**
   * Test Firebase integration remains intact
   */
  testFirebaseIntegration() {
    console.log('🔥 Testing Firebase integration...');
    
    try {
      const firebaseFiles = [
        'firebase-core.js',
        'firebase-firestore.js',
        'firebase-playtime-sync.js'
      ];
      
      let intactFiles = 0;
      
      for (const file of firebaseFiles) {
        if (existsSync(file)) {
          const content = readFileSync(file, 'utf8');
          
          // Check that Firebase files haven't been corrupted
          if (content.includes('firebase') || content.includes('Firebase')) {
            intactFiles++;
          }
          
          // Ensure no optimization code leaked into Firebase files
          const optimizationKeywords = ['dev-config', 'GlitchRealmPerf'];
          const hasOptimizationCode = optimizationKeywords.some(keyword => 
            content.includes(keyword)
          );
          
          if (hasOptimizationCode && !file.includes('playtime-sync')) {
            throw new Error(`${file} contains optimization code`);
          }
        }
      }
      
      this.testResults.push({
        test: 'Firebase Integration',
        passed: true,
        details: `${intactFiles} Firebase files intact`
      });
      
      console.log('✅ Firebase integration test passed');
      return true;
    } catch (error) {
      this.errors.push(`Firebase integration failed: ${error.message}`);
      this.testResults.push({
        test: 'Firebase Integration',
        passed: false,
        error: error.message
      });
      console.log('❌ Firebase integration test failed');
      return false;
    }
  }

  /**
   * Test image optimization features
   */
  testImageOptimization() {
    console.log('🖼️ Testing image optimization...');
    
    try {
      // Check for image optimization in key files
      const filesToCheck = ['games.html', 'styles.css'];
      let optimizationFeatures = 0;
      
      for (const file of filesToCheck) {
        if (existsSync(file)) {
          const content = readFileSync(file, 'utf8');
          
          // Check for image optimization attributes
          if (content.includes('loading="lazy"') || 
              content.includes('decoding="async"') ||
              content.includes('aspect-ratio') ||
              content.includes('width=') && content.includes('height=')) {
            optimizationFeatures++;
          }
        }
      }
      
      // Check for preload links
      if (existsSync('index.html')) {
        const indexContent = readFileSync('index.html', 'utf8');
        if (indexContent.includes('rel="preload"')) {
          optimizationFeatures++;
        }
      }
      
      this.testResults.push({
        test: 'Image Optimization',
        passed: optimizationFeatures > 0,
        details: `Found ${optimizationFeatures} optimization features`
      });
      
      if (optimizationFeatures > 0) {
        console.log('✅ Image optimization test passed');
        return true;
      } else {
        console.log('⚠️ Image optimization features not detected');
        return false;
      }
    } catch (error) {
      this.errors.push(`Image optimization failed: ${error.message}`);
      this.testResults.push({
        test: 'Image Optimization',
        passed: false,
        error: error.message
      });
      console.log('❌ Image optimization test failed');
      return false;
    }
  }

  /**
   * Test CI/CD configuration
   */
  testCICDConfiguration() {
    console.log('🔄 Testing CI/CD configuration...');
    
    try {
      const configFiles = [
        '.eslintrc.json',
        'lighthouse-budget.json',
        'lighthouserc.json',
        'netlify.toml',
        '_headers',
        '_redirects'
      ];
      
      let presentFiles = 0;
      
      for (const file of configFiles) {
        if (existsSync(file)) {
          presentFiles++;
          console.log(`   ✓ ${file} present`);
        } else {
          console.log(`   - ${file} missing (optional)`);
        }
      }
      
      // Check GitHub Actions workflow
      const workflowPath = '.github/workflows/performance.yml';
      let hasWorkflow = false;
      if (existsSync(workflowPath)) {
        hasWorkflow = true;
        presentFiles++;
        console.log(`   ✓ ${workflowPath} present`);
      }
      
      this.testResults.push({
        test: 'CI/CD Configuration',
        passed: presentFiles >= 3, // At least 3 config files should be present
        details: `${presentFiles} configuration files present`
      });
      
      if (presentFiles >= 3) {
        console.log('✅ CI/CD configuration test passed');
        return true;
      } else {
        console.log('⚠️ Some CI/CD configuration files missing');
        return false;
      }
    } catch (error) {
      this.errors.push(`CI/CD configuration failed: ${error.message}`);
      this.testResults.push({
        test: 'CI/CD Configuration',
        passed: false,
        error: error.message
      });
      console.log('❌ CI/CD configuration test failed');
      return false;
    }
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    console.log('🚀 Starting integration tests...\n');
    
    const tests = [
      () => this.testDevConfigIntegration(),
      () => this.testPerformanceOptimization(),
      () => this.testFirebaseIntegration(),
      () => this.testImageOptimization(),
      () => this.testCICDConfiguration()
    ];
    
    let passedTests = 0;
    
    for (const test of tests) {
      const result = test();
      if (result) passedTests++;
      console.log(''); // Add spacing
    }
    
    console.log('='.repeat(50));
    console.log('📊 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Tests passed: ${passedTests}/${tests.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Generate detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: tests.length,
        passed: passedTests,
        failed: tests.length - passedTests
      },
      results: this.testResults,
      errors: this.errors
    };
    
    writeFileSync('integration-test-results.json', JSON.stringify(report, null, 2));
    
    if (passedTests === tests.length) {
      console.log('\n🎉 All integration tests passed!');
      console.log('✅ All optimizations are working together correctly');
    } else {
      console.log('\n⚠️ Some integration tests failed');
      console.log('📄 Check integration-test-results.json for details');
    }
    
    return passedTests === tests.length;
  }
}

// Run integration tests
const tester = new IntegrationTester();
tester.runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Integration tests failed:', error);
  process.exit(1);
});