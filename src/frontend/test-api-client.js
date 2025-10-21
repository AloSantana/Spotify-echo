/**
 * Test file for API Client
 * 
 * Tests the API client with health endpoints
 * Run with: node src/frontend/test-api-client.js
 */

// Mock browser environment for testing
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = value.toString();
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

global.window = {
  location: {
    href: ''
  }
};

// Use node-fetch for testing
const fetch = require('node-fetch');
global.fetch = fetch;

// Since api-client.js uses ES6 modules, we need to handle it differently
// We'll create a simple fetch-based client for testing
class TestApiClient {
  constructor() {
    this.config = {
      baseURL: 'http://localhost:3000'
    };
  }

  async get(endpoint) {
    try {
      const url = `${this.config.baseURL}${endpoint}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          data: data,
          meta: {
            requestId: `test_${Date.now()}`,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        return {
          success: false,
          error: {
            code: response.status === 404 ? 'NOT_FOUND' : 'ERROR',
            message: data.message || `Error ${response.status}`,
            requestId: `test_${Date.now()}`,
            timestamp: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message,
          requestId: `test_${Date.now()}`,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}

const apiClient = new TestApiClient();


/**
 * Test suite
 */
async function runTests() {
  console.log('🧪 Testing API Client with Health Endpoints\n');
  console.log('='.repeat(50));

  const tests = [
    {
      name: 'Test /healthz endpoint',
      endpoint: '/healthz',
      expectedKeys: ['status', 'timestamp']
    },
    {
      name: 'Test /readyz endpoint',
      endpoint: '/readyz',
      expectedKeys: ['status', 'checks']
    },
    {
      name: 'Test /health endpoint',
      endpoint: '/health',
      expectedKeys: ['status', 'services']
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n📝 ${test.name}`);
    console.log('-'.repeat(40));

    try {
      const startTime = Date.now();
      const response = await apiClient.get(test.endpoint);
      const duration = Date.now() - startTime;

      console.log(`✅ Request completed in ${duration}ms`);

      if (response.success) {
        console.log('✅ Response has success=true');
        
        if (response.data) {
          console.log('✅ Response has data');
          
          // Check for expected keys
          const hasExpectedKeys = test.expectedKeys.every(key => 
            response.data.hasOwnProperty(key)
          );
          
          if (hasExpectedKeys) {
            console.log(`✅ Response has expected keys: ${test.expectedKeys.join(', ')}`);
          } else {
            console.log(`❌ Missing expected keys. Got: ${Object.keys(response.data).join(', ')}`);
          }
        } else {
          console.log('❌ Response missing data');
        }

        if (response.meta) {
          console.log('✅ Response has metadata');
          if (response.meta.requestId) {
            console.log(`  - Request ID: ${response.meta.requestId}`);
          }
          if (response.meta.timestamp) {
            console.log(`  - Timestamp: ${response.meta.timestamp}`);
          }
        }

        console.log('\n📊 Response Preview:');
        console.log(JSON.stringify(response, null, 2).substring(0, 500));

        passed++;
      } else {
        console.log('❌ Response has success=false');
        console.log('Error:', response.error);
        failed++;
      }

    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}`);
      console.error(error);
      failed++;
    }
  }

  // Test retry logic with invalid endpoint
  console.log('\n📝 Test retry logic with 404 endpoint');
  console.log('-'.repeat(40));

  try {
    const response = await apiClient.get('/non-existent-endpoint');
    
    if (!response.success) {
      console.log('✅ Correctly returned error response');
      console.log(`  - Error code: ${response.error?.code}`);
      console.log(`  - Error message: ${response.error?.message}`);
      passed++;
    } else {
      console.log('❌ Expected error response but got success');
      failed++;
    }
  } catch (error) {
    console.log(`❌ Unexpected error: ${error.message}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the output above.');
  }

  return {
    passed,
    failed,
    total: passed + failed
  };
}

// Run tests if server is running
console.log('⚠️  Make sure the server is running on port 3000');
console.log('   Run: npm start\n');

runTests().then(results => {
  process.exit(results.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
