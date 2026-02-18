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
	// Auth
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

	console.log('Authenticated. Fetching /meta for entities...\n');

	// Test /meta for a few entities — look for custom fields with renamed labels
	const entities = ['Candidate', 'JobOrder', 'ClientContact', 'Placement'];
	for (const ent of entities) {
		const r = await request('GET', `${restUrl}meta/${ent}?BhRestToken=${encodeURIComponent(bh)}&fields=*`);
		if (r.statusCode !== 200) {
			console.log(`${ent}: ${r.statusCode} ${r.body.substring(0, 200)}`);
			continue;
		}
		const meta = JSON.parse(r.body);
		const fields = meta.fields || [];

		// Find custom fields (name starts with "custom")
		const customFields = fields.filter((f: any) => /^custom/i.test(f.name));

		// Separate: renamed (label differs from name) vs default
		const renamed = customFields.filter((f: any) => f.label && f.label !== f.name);
		const defaultNamed = customFields.filter((f: any) => !f.label || f.label === f.name);

		console.log(`=== ${ent} ===`);
		console.log(`Total fields: ${fields.length}, Custom fields: ${customFields.length}, Renamed: ${renamed.length}`);

		if (renamed.length > 0) {
			console.log('Renamed custom fields:');
			for (const f of renamed) {
				console.log(`  ${f.name} → "${f.label}" (type: ${f.type}, dataType: ${f.dataType})`);
			}
		}

		// Show first 3 default-named custom fields for reference
		if (defaultNamed.length > 0) {
			console.log(`Default-named custom fields (first 3 of ${defaultNamed.length}):`);
			for (const f of defaultNamed.slice(0, 3)) {
				console.log(`  ${f.name} (label: "${f.label}", type: ${f.type}, dataType: ${f.dataType})`);
			}
		}
		console.log();
	}
}

main().catch((e) => { console.error(e); process.exit(1); });
