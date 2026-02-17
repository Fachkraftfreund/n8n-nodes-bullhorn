import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
	const match = line.match(/^([^=]+)=(.*)$/);
	if (match) env[match[1].trim()] = match[2].trim();
}

function request(method: string, url: string): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
	return new Promise((resolve, reject) => {
		const parsed = new URL(url);
		const lib = parsed.protocol === 'https:' ? https : http;
		const req = lib.request({ hostname: parsed.hostname, port: parsed.port, path: parsed.pathname + parsed.search, method }, (res) => {
			if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
				resolve({ statusCode: res.statusCode, headers: res.headers as Record<string, string>, body: '' });
				res.resume();
				return;
			}
			const chunks: Buffer[] = [];
			res.on('data', (c) => chunks.push(c));
			res.on('end', () => resolve({ statusCode: res.statusCode || 0, headers: res.headers as Record<string, string>, body: Buffer.concat(chunks).toString() }));
		});
		req.on('error', reject);
		req.end();
	});
}

async function main() {
	// Quick auth
	const infoResp = await request('GET', `https://rest.bullhornstaffing.com/rest-services/loginInfo?username=${encodeURIComponent(env.BULLHORN_USERNAME)}`);
	const info = JSON.parse(infoResp.body);
	const authBase = (info.oauthUrl as string).replace(/\/oauth(\/authorize)?.*$/, '');
	const restBase = (info.restUrl as string).replace(/\/rest-services\/?.*$/, '');

	const authResp = await request('GET', `${authBase}/oauth/authorize?client_id=${encodeURIComponent(env.BULLHORN_CLIENT_ID)}&response_type=code&action=Login&username=${encodeURIComponent(env.BULLHORN_USERNAME)}&password=${encodeURIComponent(env.BULLHORN_PASSWORD)}`);
	const code = new URL(authResp.headers.location).searchParams.get('code')!;

	const tokenResp = await request('POST', `${authBase}/oauth/token?grant_type=authorization_code&code=${encodeURIComponent(code)}&client_id=${encodeURIComponent(env.BULLHORN_CLIENT_ID)}&client_secret=${encodeURIComponent(env.BULLHORN_CLIENT_SECRET)}`);
	const tokenData = JSON.parse(tokenResp.body);

	const loginResp = await request('POST', `${restBase}/rest-services/login?version=2.0&access_token=${encodeURIComponent(tokenData.access_token)}`);
	const loginData = JSON.parse(loginResp.body);
	const restUrl = loginData.restUrl.endsWith('/') ? loginData.restUrl : loginData.restUrl + '/';
	const bh = loginData.BhRestToken;

	console.log('Authenticated. Testing /query endpoint per entity...\n');

	// Test /query for each entity
	const entities = ['Candidate', 'JobOrder', 'JobSubmission', 'Placement', 'ClientContact', 'ClientCorporation', 'Note', 'Lead', 'Opportunity', 'Task'];
	for (const ent of entities) {
		const r = await request('GET', `${restUrl}query/${ent}?BhRestToken=${encodeURIComponent(bh)}&fields=id&where=${encodeURIComponent('id>0')}&count=1`);
		const ok = r.statusCode === 200;
		const detail = ok ? 'OK' : r.body.substring(0, 120);
		console.log(`${ent.padEnd(20)} /query: ${r.statusCode} ${detail}`);
	}

	// Specific test: JobOrder with IN clause
	console.log('\n--- JobOrder query with IN clause ---');
	const r2 = await request('GET', `${restUrl}query/JobOrder?BhRestToken=${encodeURIComponent(bh)}&fields=id,title,status&where=${encodeURIComponent('clientCorporation.id IN (406) AND isDeleted=false')}&count=5&orderBy=id`);
	console.log(`Status: ${r2.statusCode}`);
	if (r2.statusCode === 200) {
		const data = JSON.parse(r2.body);
		console.log(`Total: ${data.total}, returned: ${(data.data || []).length}`);
		if (data.data?.[0]) console.log('First:', JSON.stringify(data.data[0]));
	} else {
		console.log(r2.body.substring(0, 300));
	}
}

main().catch((e) => { console.error(e); process.exit(1); });
