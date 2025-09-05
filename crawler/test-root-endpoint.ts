// Test the external events endpoint at root level (no /api prefix)
async function testRootEndpoint() {
  const testEvent = {
    title: "Test Event Root Level",
    description: "Testing endpoint without /api prefix",
    category: "Tech",
    date: "2025-09-15",
    time: "14:00",
    location: "123 Test Street, San Carlos, CA",
  };

  console.log("Testing root level endpoint: /external-events-submit");
  console.log("Data:", JSON.stringify(testEvent, null, 2));

  try {
    const response = await fetch('https://local-event-connect.replit.app/external-events-submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'eventconnect_external_api_key_2024'
      },
      body: JSON.stringify(testEvent)
    });

    console.log(`Response status: ${response.status}`);
    const responseText = await response.text();
    
    // Try to parse as JSON
    try {
      const result = JSON.parse(responseText);
      if (response.ok) {
        console.log("✅ Event created successfully!");
        console.log("Event ID:", result.eventId);
        console.log("Full response:", JSON.stringify(result, null, 2));
      } else {
        console.log("❌ Failed to create event");
        console.log("Error:", JSON.stringify(result, null, 2));
      }
    } catch {
      console.log("Response (not JSON):", responseText.substring(0, 200));
    }
  } catch (error) {
    console.error("Error calling API:", error);
  }
}

testRootEndpoint();