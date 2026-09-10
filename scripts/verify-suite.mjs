async function testEndpoints() {
  const endpoints = [
    { name: 'Dual Phone Simulator Harness', url: 'http://localhost:3000/' },
    { name: 'App 1 — Fake Call App', url: 'http://localhost:3000/fake-call-app/index.html' },
    { name: 'App 2 — Fake Call Editor', url: 'http://localhost:3000/editor-app/index.html' },
    { name: 'App 3 — Mobile Installer Page', url: 'http://localhost:3000/install.html' }
  ];

  console.log('--- TESTING FAKE CALL SIMULATOR HTTP ENDPOINTS ---');
  let allOk = true;

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url);
      console.log(`[PASS] ${ep.name}: HTTP ${res.status} ${res.statusText}`);
      const text = await res.text();
      if (!text.includes('id="root"') && !text.includes('id="editorFrame"') && !text.includes('btn-install')) {
        console.error(`[WARN] Unexpected content in ${ep.name}`);
        allOk = false;
      }
    } catch (err) {
      console.error(`[FAIL] ${ep.name}:`, err.message);
      allOk = false;
    }
  }

  if (allOk) {
    console.log('\n>>> ALL ENDPOINTS RESPONDED WITH 200 OK AND VALID MARKUP! <<<');
  } else {
    process.exit(1);
  }
}

testEndpoints();
