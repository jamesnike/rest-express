import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function testEndpoints() {
  console.log('=== Testing EventConnect API Endpoints ===\n');
  
  // Test 1: Browse endpoint (no auth required)
  console.log('1. Testing /api/events/browse (no auth required):');
  try {
    const browseResponse = await fetch(`${API_URL}/api/events/browse?limit=5`);
    const browseData = await browseResponse.json();
    console.log(`   - Status: ${browseResponse.status}`);
    console.log(`   - Events returned: ${browseData.length}`);
    if (browseData.length > 0) {
      console.log(`   - First event: ${browseData[0].title} on ${browseData[0].date}`);
      console.log(`   - Last event: ${browseData[browseData.length - 1].title} on ${browseData[browseData.length - 1].date}`);
    }
  } catch (error) {
    console.log(`   - Error: ${error.message}`);
  }
  
  // Test 2: Main events endpoint (optional auth)
  console.log('\n2. Testing /api/events (optional auth):');
  try {
    const eventsResponse = await fetch(`${API_URL}/api/events?limit=5`);
    const eventsData = await eventsResponse.json();
    console.log(`   - Status: ${eventsResponse.status}`);
    console.log(`   - Events returned: ${eventsData.length}`);
    if (eventsData.length > 0) {
      console.log(`   - First event: ${eventsData[0].title} on ${eventsData[0].date}`);
    }
  } catch (error) {
    console.log(`   - Error: ${error.message}`);
  }
  
  // Test 3: Events with timeframe filter
  console.log('\n3. Testing /api/events/browse with timeframe filters:');
  const timeframes = ['today', 'week', 'month', 'all'];
  for (const timeframe of timeframes) {
    try {
      const response = await fetch(`${API_URL}/api/events/browse?timeFilter=${timeframe}&limit=100`);
      const data = await response.json();
      console.log(`   - Timeframe "${timeframe}": ${data.length} events`);
    } catch (error) {
      console.log(`   - Timeframe "${timeframe}": Error - ${error.message}`);
    }
  }
  
  // Test 4: Get specific event
  console.log('\n4. Testing specific event retrieval:');
  try {
    const eventId = 600; // Testing with a recent event ID
    const eventResponse = await fetch(`${API_URL}/api/events/${eventId}`);
    if (eventResponse.status === 200) {
      const eventData = await eventResponse.json();
      console.log(`   - Event ${eventId}: ${eventData.title}`);
      console.log(`   - Date: ${eventData.date}, Time: ${eventData.time}`);
      console.log(`   - Category: ${eventData.category}`);
    } else {
      console.log(`   - Event ${eventId}: Status ${eventResponse.status}`);
    }
  } catch (error) {
    console.log(`   - Error: ${error.message}`);
  }
  
  // Test 5: Check events by date range
  console.log('\n5. Checking events for next 7 days:');
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    try {
      const response = await fetch(`${API_URL}/api/events/browse?date=${dateStr}&limit=100`);
      const data = await response.json();
      const eventsOnDate = data.filter(e => e.date === dateStr);
      console.log(`   - ${dateStr}: ${eventsOnDate.length} events`);
    } catch (error) {
      console.log(`   - ${dateStr}: Error - ${error.message}`);
    }
  }
  
  // Test 6: Test with JWT authentication
  console.log('\n6. Testing with JWT authentication:');
  try {
    // First login to get a token
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test-user@eventconnect.app',
        firstName: 'Test',
        lastName: 'User'
      })
    });
    
    if (loginResponse.status === 200) {
      const loginData = await loginResponse.json();
      const token = loginData.token;
      console.log(`   - Login successful, got JWT token`);
      
      // Now test authenticated endpoint
      const authResponse = await fetch(`${API_URL}/api/events`, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      const authData = await authResponse.json();
      console.log(`   - Authenticated request status: ${authResponse.status}`);
      console.log(`   - Events returned with auth: ${authData.length}`);
    } else {
      console.log(`   - Login failed with status: ${loginResponse.status}`);
    }
  } catch (error) {
    console.log(`   - Auth error: ${error.message}`);
  }
  
  console.log('\n=== API Test Complete ===');
  console.log('\nSummary for Mobile App Integration:');
  console.log('- Use /api/events/browse for unauthenticated browsing');
  console.log('- Use /api/events with JWT token for personalized event lists');
  console.log('- The browse endpoint returns ALL events including future dates');
  console.log('- The /api/events endpoint filters out past events by default');
  console.log('- Mobile app should use /api/events/browse or pass excludePastEvents=false');
}

testEndpoints().catch(console.error);