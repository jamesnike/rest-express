import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000';

async function testDateFiltering() {
  console.log('=== Testing /api/events/browse Date Filtering ===\n');
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(today.getDate() + 7);
  const eightDaysLater = new Date(today);
  eightDaysLater.setDate(today.getDate() + 8);
  
  console.log(`Yesterday: ${yesterday.toISOString().split('T')[0]}`);
  console.log(`Today: ${today.toISOString().split('T')[0]}`);
  console.log(`Tomorrow: ${tomorrow.toISOString().split('T')[0]}`);
  console.log(`7 days from now: ${sevenDaysLater.toISOString().split('T')[0]}`);
  console.log(`8 days from now: ${eightDaysLater.toISOString().split('T')[0]}\n`);
  
  // Test the browse endpoint
  console.log('Testing /api/events/browse:');
  try {
    const response = await fetch(`${API_URL}/api/events/browse?limit=300`);
    const data = await response.json();
    console.log(`Total events returned: ${data.length}`);
    
    if (data.length > 0) {
      // Get unique dates from returned events
      const dates = [...new Set(data.map(e => e.date))].sort();
      console.log(`\nDate range in response:`);
      console.log(`- First event date: ${dates[0]}`);
      console.log(`- Last event date: ${dates[dates.length - 1]}`);
      
      // Check for past events
      const pastEvents = data.filter(e => e.date < today.toISOString().split('T')[0]);
      console.log(`\nPast events (before today): ${pastEvents.length}`);
      if (pastEvents.length > 0) {
        console.log('WARNING: Found past events that should not be included!');
        pastEvents.slice(0, 3).forEach(e => {
          console.log(`  - ${e.date}: ${e.title}`);
        });
      }
      
      // Check for events beyond 7 days
      const beyondSevenDays = data.filter(e => e.date > sevenDaysLater.toISOString().split('T')[0]);
      console.log(`\nEvents beyond 7 days: ${beyondSevenDays.length}`);
      if (beyondSevenDays.length > 0) {
        console.log('WARNING: Found events beyond 7 days that should not be included!');
        beyondSevenDays.slice(0, 3).forEach(e => {
          console.log(`  - ${e.date}: ${e.title}`);
        });
      }
      
      // Count events by date
      console.log('\nEvents by date:');
      const eventsByDate = {};
      data.forEach(event => {
        eventsByDate[event.date] = (eventsByDate[event.date] || 0) + 1;
      });
      
      Object.keys(eventsByDate).sort().forEach(date => {
        const dayLabel = date === today.toISOString().split('T')[0] ? ' (TODAY)' : 
                        date === sevenDaysLater.toISOString().split('T')[0] ? ' (7 DAYS FROM NOW)' : '';
        console.log(`  ${date}${dayLabel}: ${eventsByDate[date]} events`);
      });
      
      // Summary
      console.log('\n=== SUMMARY ===');
      const isCorrect = pastEvents.length === 0 && beyondSevenDays.length === 0;
      if (isCorrect) {
        console.log('✅ Date filtering is working correctly!');
        console.log('   - No past events included');
        console.log('   - No events beyond 7 days included');
        console.log('   - Only shows events from today to 7 days in the future');
      } else {
        console.log('❌ Date filtering has issues:');
        if (pastEvents.length > 0) {
          console.log(`   - ${pastEvents.length} past events should not be included`);
        }
        if (beyondSevenDays.length > 0) {
          console.log(`   - ${beyondSevenDays.length} events beyond 7 days should not be included`);
        }
      }
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

testDateFiltering().catch(console.error);