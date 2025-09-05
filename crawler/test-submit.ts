#!/usr/bin/env tsx

// Test script to submit events to the crawler API
import fetch from 'node-fetch';

const API_URL = 'https://local-event-connect.replit.app';
const CRAWLER_API_KEY = 'crawler_key_425d060e6dfd06615280db1a75ec4f02'; // Use the key from server logs

async function submitTestEvent() {
  const testEvent = {
    title: "Automated Tech Meetup - AI & Web Scraping",
    description: "Join us for an evening discussion about automated event discovery, web scraping techniques, and AI integration.",
    date: "2025-09-15",
    time: "18:30",
    location: "TechHub San Carlos, 1234 Innovation Way, San Carlos, CA 94070",
    category: "Tech",
    price: "Free",
    organizerName: "EventConnect Automation Team",
    organizerEmail: "automation@eventconnect.local",
    tags: ["AI", "Web Scraping", "Automation", "Tech Talk"]
  };

  try {
    console.log('Submitting test event to crawler API...');
    
    const response = await fetch(`${API_URL}/api/crawler/submit-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-crawler-api-key': CRAWLER_API_KEY
      },
      body: JSON.stringify(testEvent)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Event submitted successfully!');
      console.log('Event ID:', result.event?.id);
      console.log('Event Title:', result.event?.title);
    } else {
      console.error('❌ Submission failed:', result.error);
    }

    return result;

  } catch (error) {
    console.error('Error submitting event:', error);
  }
}

async function checkCrawlerHealth() {
  try {
    const response = await fetch(`${API_URL}/api/crawler/health`);
    const health = await response.json();
    console.log('Crawler API Health:', health);
  } catch (error) {
    console.error('Health check failed:', error);
  }
}

async function getRecentEvents() {
  try {
    const response = await fetch(`${API_URL}/api/crawler/events`, {
      headers: {
        'x-crawler-api-key': CRAWLER_API_KEY
      }
    });
    const data = await response.json();
    console.log(`Found ${data.count} recent events`);
    return data;
  } catch (error) {
    console.error('Failed to get events:', error);
  }
}

// Run tests
async function main() {
  console.log('🤖 Testing Crawler API...\n');
  
  // Check health
  await checkCrawlerHealth();
  console.log();
  
  // Submit a test event
  await submitTestEvent();
  console.log();
  
  // Get recent events
  await getRecentEvents();
}

main().catch(console.error);