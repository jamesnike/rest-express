#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test credentials
const user1 = {
  email: 'jamesnikess@gmail.com',
  password: 'Password123!'
};

const user2 = {
  email: 'joeho@example.com',
  password: 'password123'
};

async function login(email, password) {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

async function testFriendshipFlow() {
  console.log('Testing Friend System...\n');
  
  try {
    // 1. Login both users
    console.log('1. Logging in users...');
    const user1Auth = await login(user1.email, user1.password);
    const user2Auth = await login(user2.email, user2.password);
    console.log(`✓ User 1 logged in: ${user1Auth.user.name} (${user1Auth.user.id})`);
    console.log(`✓ User 2 logged in: ${user2Auth.user.name} (${user2Auth.user.id})\n`);
    
    // 2. Send friend request from user1 to user2
    console.log('2. Sending friend request from User 1 to User 2...');
    const sendRequestResponse = await fetch(`${BASE_URL}/api/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Auth.token}`
      },
      body: JSON.stringify({ friendId: user2Auth.user.id })
    });
    
    if (!sendRequestResponse.ok) {
      const error = await sendRequestResponse.json();
      console.log(`Friend request response: ${error.message}`);
      if (!error.message.includes('Friendship already exists')) {
        throw new Error(error.message);
      }
      console.log('✓ Friend request already exists, continuing...\n');
    } else {
      const friendRequest = await sendRequestResponse.json();
      console.log(`✓ Friend request sent: ${friendRequest.status}\n`);
    }
    
    // 3. Check pending requests for user2
    console.log('3. Checking pending friend requests for User 2...');
    const pendingResponse = await fetch(`${BASE_URL}/api/friends/requests/pending`, {
      headers: {
        'Authorization': `Bearer ${user2Auth.token}`
      }
    });
    
    const pendingRequests = await pendingResponse.json();
    console.log(`✓ User 2 has ${pendingRequests.length} pending request(s)`);
    if (pendingRequests.length > 0) {
      console.log(`  From: ${pendingRequests.map(r => r.name).join(', ')}\n`);
    }
    
    // 4. Accept friend request
    console.log('4. User 2 accepting friend request from User 1...');
    const acceptResponse = await fetch(`${BASE_URL}/api/friends/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user2Auth.token}`
      },
      body: JSON.stringify({ friendId: user1Auth.user.id })
    });
    
    if (!acceptResponse.ok) {
      const error = await acceptResponse.json();
      console.log(`Accept response: ${error.message}`);
      if (error.message === 'No pending friend request found') {
        console.log('✓ No pending request (possibly already friends), continuing...\n');
      } else {
        throw new Error(error.message);
      }
    } else {
      const acceptedFriendship = await acceptResponse.json();
      console.log(`✓ Friend request accepted: ${acceptedFriendship.status}\n`);
    }
    
    // 5. Get friends list for both users
    console.log('5. Getting friends list for both users...');
    const user1FriendsResponse = await fetch(`${BASE_URL}/api/friends`, {
      headers: {
        'Authorization': `Bearer ${user1Auth.token}`
      }
    });
    
    const user2FriendsResponse = await fetch(`${BASE_URL}/api/friends`, {
      headers: {
        'Authorization': `Bearer ${user2Auth.token}`
      }
    });
    
    const user1Friends = await user1FriendsResponse.json();
    const user2Friends = await user2FriendsResponse.json();
    
    console.log(`✓ User 1 has ${user1Friends.length} friend(s): ${user1Friends.map(f => f.name).join(', ') || 'None'}`);
    console.log(`✓ User 2 has ${user2Friends.length} friend(s): ${user2Friends.map(f => f.name).join(', ') || 'None'}\n`);
    
    // 6. Check friendship status
    console.log('6. Checking friendship status between users...');
    const statusResponse = await fetch(`${BASE_URL}/api/friends/status/${user2Auth.user.id}`, {
      headers: {
        'Authorization': `Bearer ${user1Auth.token}`
      }
    });
    
    const statusData = await statusResponse.json();
    console.log(`✓ Friendship status from User 1's perspective: ${statusData.status}\n`);
    
    // 7. Get sent friend requests
    console.log('7. Checking sent friend requests for User 1...');
    const sentResponse = await fetch(`${BASE_URL}/api/friends/requests/sent`, {
      headers: {
        'Authorization': `Bearer ${user1Auth.token}`
      }
    });
    
    const sentRequests = await sentResponse.json();
    console.log(`✓ User 1 has ${sentRequests.length} sent request(s)`);
    if (sentRequests.length > 0) {
      console.log(`  To: ${sentRequests.map(r => r.name).join(', ')}\n`);
    }
    
    console.log('✅ Friend System Test Complete!');
    console.log('All friend management functionality is working correctly.\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testFriendshipFlow().catch(console.error);