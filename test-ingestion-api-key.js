/**
 * Test script to verify the Ingestion Worker API key authentication
 */

const API_KEY = "ed774c2e9ea976b733b306524f547623098310dd21453b0fec56055ab8b5b359";
const WORKER_URL = "https://ingestion-worker.your-subdomain.workers.dev"; // Update with your actual worker URL

async function testAuthentication() {
  console.log("🔐 Testing Ingestion Worker API Key Authentication");
  console.log("=" .repeat(60));

  // Test 1: Health check (no auth required)
  console.log("\n1️⃣ Testing health endpoint (no auth required)...");
  try {
    const response = await fetch(`${WORKER_URL}/api/health`);
    const data = await response.json();
    console.log(`✅ Health check: ${response.status} - ${data.status}`);
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
  }

  // Test 2: KPI data endpoint without API key (should fail)
  console.log("\n2️⃣ Testing KPI data endpoint without API key (should fail)...");
  try {
    const response = await fetch(`${WORKER_URL}/api/kpi-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        traceId: "test_trace_123",
        kpiId: "test-kpi",
        timestamp: new Date().toISOString(),
        kpiType: "test",
        data: { value: 100 }
      })
    });
    const data = await response.json();
    console.log(`${response.status === 401 ? '✅' : '❌'} No auth: ${response.status} - ${data.error || data.message}`);
  } catch (error) {
    console.log(`❌ No auth test failed: ${error.message}`);
  }

  // Test 3: KPI data endpoint with correct API key (should succeed)
  console.log("\n3️⃣ Testing KPI data endpoint with correct API key (should succeed)...");
  try {
    const response = await fetch(`${WORKER_URL}/api/kpi-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        traceId: "test_trace_123",
        kpiId: "test-kpi",
        timestamp: new Date().toISOString(),
        kpiType: "test",
        data: { value: 100 }
      })
    });
    const data = await response.json();
    console.log(`${response.status === 200 ? '✅' : '❌'} With API key: ${response.status} - ${data.success ? 'Success' : data.error}`);
  } catch (error) {
    console.log(`❌ API key test failed: ${error.message}`);
  }

  // Test 4: KPI data endpoint with wrong API key (should fail)
  console.log("\n4️⃣ Testing KPI data endpoint with wrong API key (should fail)...");
  try {
    const response = await fetch(`${WORKER_URL}/api/kpi-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'wrong-api-key-123'
      },
      body: JSON.stringify({
        traceId: "test_trace_123",
        kpiId: "test-kpi",
        timestamp: new Date().toISOString(),
        kpiType: "test",
        data: { value: 100 }
      })
    });
    const data = await response.json();
    console.log(`${response.status === 401 ? '✅' : '❌'} Wrong API key: ${response.status} - ${data.error || data.message}`);
  } catch (error) {
    console.log(`❌ Wrong API key test failed: ${error.message}`);
  }

  // Test 5: Using Authorization Bearer header
  console.log("\n5️⃣ Testing with Authorization Bearer header...");
  try {
    const response = await fetch(`${WORKER_URL}/api/kpi-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        traceId: "test_trace_456",
        kpiId: "test-kpi-2",
        timestamp: new Date().toISOString(),
        kpiType: "test",
        data: { value: 200 }
      })
    });
    const data = await response.json();
    console.log(`${response.status === 200 ? '✅' : '❌'} Bearer token: ${response.status} - ${data.success ? 'Success' : data.error}`);
  } catch (error) {
    console.log(`❌ Bearer token test failed: ${error.message}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🔑 API Key for N8N workflows:");
  console.log(`   ${API_KEY}`);
  console.log("\n💡 Usage in N8N HTTP Request nodes:");
  console.log("   Header: X-API-Key");
  console.log(`   Value: ${API_KEY}`);
  console.log("\n   OR");
  console.log("   Header: Authorization");
  console.log(`   Value: Bearer ${API_KEY}`);
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAuthentication().catch(console.error);
}

export { testAuthentication, API_KEY };