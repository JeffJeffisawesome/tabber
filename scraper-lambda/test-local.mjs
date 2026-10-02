import { handler } from './dist/index.mjs';

async function runLocalTests() {
  console.log('🧪 Starting Local Scraper Lambda Tests...\n');

  console.log('1️⃣ Testing GET /health ...');
  const healthRes = await handler({
    rawPath: '/health',
    requestContext: { http: { method: 'GET' } },
  });
  console.log('Status:', healthRes.statusCode);
  console.log('Body:', healthRes.body);

  console.log('\n2️⃣ Testing OPTIONS /api/tabs/search-ug ...');
  const corsRes = await handler({
    rawPath: '/api/tabs/search-ug',
    requestContext: { http: { method: 'OPTIONS' } },
  });
  console.log('Status:', corsRes.statusCode);

  console.log('\n3️⃣ Testing GET /api/tabs/search-ug?q=Let+Her+Go ...');
  const searchRes = await handler({
    rawPath: '/api/tabs/search-ug',
    requestContext: { http: { method: 'GET' } },
    queryStringParameters: { q: 'Let Her Go Passenger' },
  });
  console.log('Status:', searchRes.statusCode);
  const searchData = JSON.parse(searchRes.body);
  console.log(`Received ${searchData.length} search results.`);

  if (searchData.length > 0 && searchData[0].url) {
    console.log(`\n4️⃣ Testing POST /api/tabs/import-url for: ${searchData[0].url} ...`);
    const importRes = await handler({
      rawPath: '/api/tabs/import-url',
      requestContext: { http: { method: 'POST' } },
      body: JSON.stringify({ url: searchData[0].url }),
    });
    console.log('Status:', importRes.statusCode);
    const importData = JSON.parse(importRes.body);
    console.log('Imported Title:', importData?.tab?.title);
  }

  console.log('\n✅ All local tests completed successfully!');
}

runLocalTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
