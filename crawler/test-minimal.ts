// Minimal test to debug the external API endpoint
async function testMinimalAPI() {
  const testEvent = {
    title: "Test Event",
    description: "Test description",
    category: "Tech",
    date: "2025-09-15",
    time: "14:00",
    location: "123 Test Street, San Carlos, CA",
  };

  console.log("Testing with minimal data:", JSON.stringify(testEvent, null, 2));

  try {
    const response = await fetch('https://local-event-connect.replit.app/api/external/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'eventconnect_external_api_key_2024'
      },
      body: JSON.stringify(testEvent)
    });

    console.log(`Response status: ${response.status}`);
    const responseText = await response.text();
    console.log("Response body:", responseText);
    
    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log("✅ Event created successfully!");
      console.log("Event ID:", result.eventId);
    } else {
      console.log("❌ Failed to create event");
      try {
        const error = JSON.parse(responseText);
        if (error.errors) {
          console.log("Validation errors:", JSON.stringify(error.errors, null, 2));
        }
      } catch {
        // Not JSON, already logged above
      }
    }
  } catch (error) {
    console.error("Error calling API:", error);
  }
}

testMinimalAPI();