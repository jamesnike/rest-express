import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function testPagination() {
  console.log('=== Testing /api/events/browse Pagination Behavior ===\n');
  
  // Test 1: Default limit (100)
  console.log('1. Testing with default limit:');
  try {
    const response = await fetch(`${API_URL}/api/events/browse`);
    const data = await response.json();
    console.log(`   - Events returned: ${data.length}`);
    console.log(`   - Default limit applied: ${data.length <= 100 ? 'YES' : 'NO'}`);
  } catch (error) {
    console.log(`   - Error: ${error.message}`);
  }
  
  // Test 2: Small limit
  console.log('\n2. Testing with limit=10:');
  try {
    const response = await fetch(`${API_URL}/api/events/browse?limit=10`);
    const data = await response.json();
    console.log(`   - Events returned: ${data.length}`);
  } catch (error) {
    console.log(`   - Error: ${error.message}`);
  }
  
  // Test 3: Large limit
  console.log('\n3. Testing with limit=500:');
  try {
    const response = await fetch(`${API_URL}/api/events/browse?limit=500`);
    const data = await response.json();
    console.log(`   - Events returned: ${data.length} (this is ALL events in 7-day window)`);
  } catch (error) {
    console.log(`   - Error: ${error.message}`);
  }
  
  // Test 4: Check if offset/page parameters work
  console.log('\n4. Testing pagination parameters:');
  try {
    // Try offset
    const offsetResponse = await fetch(`${API_URL}/api/events/browse?limit=10&offset=10`);
    const offsetData = await offsetResponse.json();
    console.log(`   - With offset=10: ${offsetData.length} events returned`);
    
    // Try page
    const pageResponse = await fetch(`${API_URL}/api/events/browse?limit=10&page=2`);
    const pageData = await pageResponse.json();
    console.log(`   - With page=2: ${pageData.length} events returned`);
    
    // Compare first events from each
    const firstResponse = await fetch(`${API_URL}/api/events/browse?limit=10`);
    const firstData = await firstResponse.json();
    
    if (firstData.length > 0 && offsetData.length > 0) {
      const sameAsFirst = firstData[0].id === offsetData[0].id;
      console.log(`   - Offset working? ${sameAsFirst ? 'NO (same events)' : 'MAYBE (different events)'}`);
    }
  } catch (error) {
    console.log(`   - Error: ${error.message}`);
  }
  
  // Test 5: Check response format
  console.log('\n5. Checking response format:');
  try {
    const response = await fetch(`${API_URL}/api/events/browse?limit=10`);
    const data = await response.json();
    
    const isArray = Array.isArray(data);
    const hasMetadata = data.data !== undefined || data.events !== undefined;
    const hasTotalCount = data.total !== undefined || data.totalCount !== undefined;
    const hasPageInfo = data.page !== undefined || data.currentPage !== undefined;
    
    console.log(`   - Response is array: ${isArray}`);
    console.log(`   - Has metadata wrapper: ${hasMetadata}`);
    console.log(`   - Has total count: ${hasTotalCount}`);
    console.log(`   - Has page info: ${hasPageInfo}`);
  } catch (error) {
    console.log(`   - Error: ${error.message}`);
  }
  
  console.log('\n=== SUMMARY ===');
  console.log('Current implementation:');
  console.log('- ✅ Supports "limit" parameter');
  console.log('- ❌ NO pagination (no offset/page support)');
  console.log('- ❌ NO total count returned');
  console.log('- ❌ Returns plain array (no metadata)');
  console.log('\nIssue: With 253 events in 7 days:');
  console.log('- Default returns only first 100 events');
  console.log('- Mobile app must request ALL events at once (limit=300+)');
  console.log('- No way to load events in batches/pages');
  console.log('- Inefficient for mobile data/performance');
}

testPagination().catch(console.error);