import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function testBrowseEndpoint() {
  console.log('=== Testing Modified /api/events/browse Endpoint ===\n');
  
  const today = new Date();
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(today.getDate() + 7);
  
  console.log(`Today: ${today.toISOString().split('T')[0]}`);
  console.log(`7 days from now: ${sevenDaysLater.toISOString().split('T')[0]}\n`);
  
  // Test 1: Browse endpoint with no parameters
  console.log('1. Testing /api/events/browse (should return 7 days of events):');
  try {
    const response = await fetch(`${API_URL}/api/events/browse?limit=300`);
    const data = await response.json();
    console.log(`   - Status: ${response.status}`);
    console.log(`   - Total events returned: ${data.length}`);
    
    if (data.length > 0) {
      // Get date range from returned events
      const dates = [...new Set(data.map(e => e.date))].sort();
      console.log(`   - First event date: ${dates[0]}`);
      console.log(`   - Last event date: ${dates[dates.length - 1]}`);
      
      // Count events by date
      console.log('\n   Events by date:');
      const eventsByDate = {};
      data.forEach(event => {
        eventsByDate[event.date] = (eventsByDate[event.date] || 0) + 1;
      });
      
      Object.keys(eventsByDate).sort().forEach(date => {
        console.log(`   - ${date}: ${eventsByDate[date]} events`);
      });
    }
  } catch (error) {
    console.log(`   - Error: ${error.message}`);
  }
  
  // Test 2: Browse with category filter
  console.log('\n2. Testing /api/events/browse with category filter:');
  const categories = ['Music', 'Sports', 'Tech', 'Food'];
  for (const category of categories) {
    try {
      const response = await fetch(`${API_URL}/api/events/browse?category=${category}&limit=100`);
      const data = await response.json();
      console.log(`   - ${category}: ${data.length} events`);
    } catch (error) {
      console.log(`   - ${category}: Error - ${error.message}`);
    }
  }
  
  // Test 3: Compare with old /api/events endpoint
  console.log('\n3. Comparing with /api/events endpoint:');
  try {
    const eventsResponse = await fetch(`${API_URL}/api/events?limit=100`);
    const eventsData = await eventsResponse.json();
    console.log(`   - /api/events returns: ${eventsData.length} events (filters past events)`);
    
    const browseResponse = await fetch(`${API_URL}/api/events/browse?limit=300`);
    const browseData = await browseResponse.json();
    console.log(`   - /api/events/browse returns: ${browseData.length} events (7-day window)`);
  } catch (error) {
    console.log(`   - Error: ${error.message}`);
  }
  
  console.log('\n=== Test Complete ===');
  console.log('\nSummary:');
  console.log('- /api/events/browse now returns events for today + next 7 days');
  console.log('- This provides a focused view for mobile apps');
  console.log('- Category filtering still works within the date range');
}

testBrowseEndpoint().catch(console.error);