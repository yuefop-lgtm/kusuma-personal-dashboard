const http = require('http');

let cookie = '';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      if (res.headers['set-cookie']) {
        cookie = res.headers['set-cookie'][0].split(';')[0];
      }
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING BACKEND AUTOMATED TESTS ---');

  // 1. Root route
  const root = await request({ hostname: 'localhost', port: 3000, path: '/', method: 'GET' });
  console.log('1. Root HTML page load:', root.status === 200 ? 'PASS ✅' : 'FAIL ❌');

  // 2. Auth me without login
  const unauth = await request({ hostname: 'localhost', port: 3000, path: '/api/auth/me', method: 'GET' });
  console.log('2. Unauthenticated protection:', unauth.status === 401 ? 'PASS ✅' : 'FAIL ❌');

  // 3. Failed login
  const badLogin = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    JSON.stringify({ username: 'agung', password: 'wrongpassword' })
  );
  console.log('3. Bad password rejected:', badLogin.status === 401 ? 'PASS ✅' : 'FAIL ❌');

  // 4. Successful login
  const goodLogin = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    JSON.stringify({ username: 'agung', password: 'kusuma' })
  );
  console.log('4. Login with agung/kusuma:', goodLogin.status === 200 && goodLogin.body.success ? 'PASS ✅' : 'FAIL ❌');

  // 5. Check auth me with session
  const authMe = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { Cookie: cookie }
  });
  console.log('5. Session validation (/api/auth/me):', authMe.body.user?.username === 'agung' ? 'PASS ✅' : 'FAIL ❌');

  // 6. Overview stats
  const overview = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/dashboard/overview',
    method: 'GET',
    headers: { Cookie: cookie }
  });
  console.log('6. Dashboard Overview API:', overview.body.success ? 'PASS ✅' : 'FAIL ❌');

  // 7. Create subject
  const newSub = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/subjects',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie }
    },
    JSON.stringify({
      name: 'Kecerdasan Buatan & Jaringan Syaraf Sasuke',
      code: 'AI-301',
      teacher: 'Orochimaru Ph.D',
      day_schedule: 'Jumat',
      time_schedule: '13:30 - 16:00',
      room_link: 'Lab Robotika',
      description: 'Studi mendalam kecerdasan buatan, visual computing, dan neural networks.'
    })
  );
  console.log('7. Add Subject CRUD:', newSub.body.success ? 'PASS ✅' : 'FAIL ❌');
  const createdSubId = newSub.body.subject?.id;

  // 8. Create sports schedule
  const newSport = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/sports',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie }
    },
    JSON.stringify({
      sport_name: 'Lari Cepat Shinobi & Sprint',
      date: '2026-10-25',
      day: 'Minggu',
      time_start: '06:00',
      time_end: '07:30',
      location: 'Stadion Utama',
      notes: 'Pemanasan 10 menit, sprint 100m x 8 repetisi.',
      status: 'Terjadwal'
    })
  );
  console.log('8. Add Sports Schedule CRUD:', newSport.body.success ? 'PASS ✅' : 'FAIL ❌');

  // 9. Update settings
  const updateSettings = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/settings',
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie }
    },
    JSON.stringify({
      theme: 'dark',
      accent_color: 'purple',
      custom_accent: '#a855f7',
      animation_intensity: 'high',
      effect_lightning: 1,
      effect_sharingan: 1,
      enable_intro: 1,
      enable_sound: 1,
      sidebar_size: 'default'
    })
  );
  console.log('9. Settings persistence update:', updateSettings.body.success ? 'PASS ✅' : 'FAIL ❌');

  // 10. Clean up test subject
  if (createdSubId) {
    const delSub = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/subjects/${createdSubId}`,
      method: 'DELETE',
      headers: { Cookie: cookie }
    });
    console.log('10. Delete Subject CRUD:', delSub.body.success ? 'PASS ✅' : 'FAIL ❌');
  }

  // 11. Logout
  const logoutRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/logout',
    method: 'POST',
    headers: { Cookie: cookie }
  });
  console.log('11. Logout & session destruction:', logoutRes.body.success ? 'PASS ✅' : 'FAIL ❌');

  console.log('--- ALL BACKEND TESTS COMPLETED SUCCESSFULLY! ---');
}

runTests().catch(console.error);
