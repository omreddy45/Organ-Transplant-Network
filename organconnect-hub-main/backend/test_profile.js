import fetch from 'node-fetch';

async function testFetchProfile() {
  try {
    const res = await fetch('http://localhost:3001/api/profile?user_id=7');
    const data = await res.json();
    console.log("Profile data:", data);
  } catch (e) {
    console.error(e);
  }
}

testFetchProfile();
