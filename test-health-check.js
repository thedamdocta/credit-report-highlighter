// Test the health check implementation
import { serverHealthMonitor } from './src/utils/serverHealthCheck.js';

async function testHealthCheck() {
  console.log('Testing server health check...\n');
  
  // Test 1: Check health status
  console.log('1. Checking current health status:');
  const isHealthy = await serverHealthMonitor.checkHealth();
  console.log(`   Server healthy: ${isHealthy}\n`);
  
  // Test 2: Try ensure server available
  console.log('2. Testing ensureServerAvailable:');
  try {
    await serverHealthMonitor.ensureServerAvailable();
    console.log('   ✅ Server is available\n');
  } catch (error) {
    console.log(`   ❌ Server check failed: ${error.message}\n`);
  }
  
  // Test 3: Check the error message format
  console.log('3. Simulating server offline (stopping monitoring first):');
  serverHealthMonitor.stopMonitoring();
  
  // Simulate checking with wrong URL
  const testMonitor = {
    async checkHealth() {
      try {
        const response = await fetch('http://localhost:9999/health', {
          signal: AbortSignal.timeout(1000)
        });
        return false;
      } catch (error) {
        console.log('   Network error detected (expected)');
        return false;
      }
    }
  };
  
  const offlineResult = await testMonitor.checkHealth();
  console.log(`   Offline simulation result: ${offlineResult}`);
}

testHealthCheck().catch(console.error);
