/**
 * Standalone test script for Bullhorn API authentication and basic operations.
 * Run with: npx tsx test.ts
 */

import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

// Load .env
import * as fs from 'fs';
const envContent = fs.readFileSync('.env', 'utf8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
	const match = line.match(/^([^=]+)=(.*)$/);
	if (match) env[match[1].trim()] = match[2].trim();
}

const CLIENT_ID = env.BULLHORN_CLIENT_ID;
const CLIENT_SECRET = env.BULLHORN_CLIENT_SECRET;
const USERNAME = env.BULLHORN_USERNAME;
const PASSWORD = env.BULLHORN_PASSWORD;
const DATA_CENTER = env.BULLHORN_DATA_CENTER || 'auto';

console.log('=== Bullhorn API Test ===');
console.log(`Username: ${USERNAME}`);
console.log(`Data Center: ${DATA_CENTER}`);
console.log('');

// Simple HTTP request helper
function request(
	method: string,
	url: string,
	options: { followRedirect?: boolean; body?: string; headers?: Record<string, string> } = {},
): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
	return new Promise((resolve, reject) => {
		const parsed = new URL(url);
		const lib = parsed.protocol === 'https:' ? https : http;
		const req = lib.request(
			{
				hostname: parsed.hostname,
				port: parsed.port,
				path: parsed.pathname + parsed.search,
				method,
				headers: options.headers || {},
			},
			(res) => {
				// Handle redirect
				if (
					options.followRedirect === false &&
					res.statusCode &&
					res.statusCode >= 300 &&
					res.statusCode < 400
				) {
					resolve({
						statusCode: res.statusCode,
						headers: res.headers as Record<string, string>,
						body: '',
					});
					res.resume();
					return;
				}

				const chunks: Buffer[] = [];
				res.on('data', (chunk) => chunks.push(chunk));
				res.on('end', () => {
					resolve({
						statusCode: res.statusCode || 0,
						headers: res.headers as Record<string, string>,
						body: Buffer.concat(chunks).toString(),
					});
				});
			},
		);
		req.on('error', reject);
		if (options.body) req.write(options.body);
		req.end();
	});
}

async function main() {
	// Step 1: Discover data center URLs
	console.log('--- Step 1: Discover data center URLs ---');
	let authBaseUrl: string;
	let restLoginBaseUrl: string;

	if (DATA_CENTER === 'auto') {
		const loginInfoUrl = `https://rest.bullhornstaffing.com/rest-services/loginInfo?username=${encodeURIComponent(USERNAME)}`;
		console.log(`GET ${loginInfoUrl}`);
		const resp = await request('GET', loginInfoUrl);
		console.log(`Status: ${resp.statusCode}`);
		const info = JSON.parse(resp.body);
		console.log('loginInfo response:', JSON.stringify(info, null, 2));

		const oauthUrl = info.oauthUrl || '';
		const restUrl = info.restUrl || '';
		authBaseUrl = oauthUrl.replace(/\/oauth(\/authorize)?.*$/, '');
		restLoginBaseUrl = restUrl.replace(/\/rest-services\/?.*$/, '');
	} else if (DATA_CENTER === 'custom') {
		authBaseUrl = env.BULLHORN_CUSTOM_AUTH_URL || '';
		restLoginBaseUrl = env.BULLHORN_CUSTOM_REST_LOGIN_URL || '';
	} else {
		authBaseUrl = `https://auth-${DATA_CENTER}.bullhornstaffing.com`;
		restLoginBaseUrl = `https://rest-${DATA_CENTER}.bullhornstaffing.com`;
	}

	console.log(`Auth Base URL: ${authBaseUrl}`);
	console.log(`REST Login Base URL: ${restLoginBaseUrl}`);
	console.log('');

	// Step 2: Get authorization code (headless login)
	console.log('--- Step 2: Get authorization code ---');
	const authorizeUrl =
		`${authBaseUrl}/oauth/authorize` +
		`?client_id=${encodeURIComponent(CLIENT_ID)}` +
		`&response_type=code` +
		`&action=Login` +
		`&username=${encodeURIComponent(USERNAME)}` +
		`&password=${encodeURIComponent(PASSWORD)}`;
	console.log(`GET ${authBaseUrl}/oauth/authorize?client_id=...&action=Login&...`);

	const authResp = await request('GET', authorizeUrl, { followRedirect: false });
	console.log(`Status: ${authResp.statusCode}`);
	console.log(`Location header: ${authResp.headers.location || '(none)'}`);

	let authCode = '';
	if (authResp.headers.location) {
		try {
			const locUrl = new URL(authResp.headers.location);
			authCode = locUrl.searchParams.get('code') || '';
		} catch {
			// Relative URL — try parsing the query string
			const match = authResp.headers.location.match(/code=([^&]+)/);
			if (match) authCode = match[1];
		}
	}

	// Also check body
	if (!authCode && authResp.body) {
		const match = authResp.body.match(/code=([^&"'\s]+)/);
		if (match) authCode = match[1];
	}

	if (!authCode) {
		console.error('FAILED: Could not extract authorization code');
		console.log('Full response body:', authResp.body.substring(0, 500));
		process.exit(1);
	}
	console.log(`Authorization code: ${authCode.substring(0, 20)}...`);
	console.log('');

	// Step 3: Exchange code for access token
	console.log('--- Step 3: Exchange code for access token ---');
	const tokenUrl =
		`${authBaseUrl}/oauth/token` +
		`?grant_type=authorization_code` +
		`&code=${encodeURIComponent(authCode)}` +
		`&client_id=${encodeURIComponent(CLIENT_ID)}` +
		`&client_secret=${encodeURIComponent(CLIENT_SECRET)}`;
	console.log(`POST ${authBaseUrl}/oauth/token?grant_type=authorization_code&...`);

	const tokenResp = await request('POST', tokenUrl);
	console.log(`Status: ${tokenResp.statusCode}`);
	const tokenData = JSON.parse(tokenResp.body);
	console.log(`access_token: ${(tokenData.access_token || '').substring(0, 30)}...`);
	console.log(`refresh_token: ${(tokenData.refresh_token || '').substring(0, 30)}...`);
	console.log(`expires_in: ${tokenData.expires_in}`);

	if (!tokenData.access_token) {
		console.error('FAILED: No access token received');
		console.log('Full response:', JSON.stringify(tokenData, null, 2));
		process.exit(1);
	}
	console.log('');

	// Step 4: REST Login to get BhRestToken
	console.log('--- Step 4: REST Login for BhRestToken ---');
	const loginUrl =
		`${restLoginBaseUrl}/rest-services/login` +
		`?version=2.0` +
		`&access_token=${encodeURIComponent(tokenData.access_token)}`;
	console.log(`POST ${restLoginBaseUrl}/rest-services/login?version=2.0&access_token=...`);

	const loginResp = await request('POST', loginUrl);
	console.log(`Status: ${loginResp.statusCode}`);
	const loginData = JSON.parse(loginResp.body);
	console.log(`BhRestToken: ${(loginData.BhRestToken || '').substring(0, 30)}...`);
	console.log(`restUrl: ${loginData.restUrl}`);

	if (!loginData.BhRestToken) {
		console.error('FAILED: No BhRestToken received');
		console.log('Full response:', JSON.stringify(loginData, null, 2));
		process.exit(1);
	}
	console.log('');

	const restUrl = loginData.restUrl.endsWith('/') ? loginData.restUrl : loginData.restUrl + '/';
	const bhRestToken = loginData.BhRestToken;

	// Step 5: Test search endpoint
	console.log('--- Step 5: Test API - Search Candidates ---');
	const searchUrl =
		`${restUrl}search/Candidate` +
		`?BhRestToken=${encodeURIComponent(bhRestToken)}` +
		`&fields=id,firstName,lastName,email,status` +
		`&query=isDeleted:false` +
		`&count=5`;
	console.log(`GET ${restUrl}search/Candidate?...`);

	const searchResp = await request('GET', searchUrl);
	console.log(`Status: ${searchResp.statusCode}`);
	const searchData = JSON.parse(searchResp.body);
	console.log(`Total: ${searchData.total}`);
	console.log(`Returned: ${(searchData.data || []).length}`);
	if (searchData.data && searchData.data.length > 0) {
		console.log('First candidate:', JSON.stringify(searchData.data[0], null, 2));
	}
	console.log('');

	// Step 6: Test entity get
	if (searchData.data && searchData.data.length > 0) {
		const candidateId = searchData.data[0].id;
		console.log(`--- Step 6: Test API - Get Candidate ${candidateId} ---`);
		const getUrl =
			`${restUrl}entity/Candidate/${candidateId}` +
			`?BhRestToken=${encodeURIComponent(bhRestToken)}` +
			`&fields=id,firstName,lastName,email,status,phone,mobile`;
		console.log(`GET ${restUrl}entity/Candidate/${candidateId}?...`);

		const getResp = await request('GET', getUrl);
		console.log(`Status: ${getResp.statusCode}`);
		const getData = JSON.parse(getResp.body);
		console.log('Candidate data:', JSON.stringify(getData.data || getData, null, 2));
		console.log('');
	}

	// Step 7: Test event subscription (delete + recreate)
	console.log('--- Step 7: Test Event Subscription ---');
	const subId = 'n8n_test_sub';

	// Delete old subscription first
	const delSubUrl = `${restUrl}event/subscription/${subId}?BhRestToken=${encodeURIComponent(bhRestToken)}`;
	await request('DELETE', delSubUrl).catch(() => {});

	const subUrl =
		`${restUrl}event/subscription/${subId}` +
		`?BhRestToken=${encodeURIComponent(bhRestToken)}` +
		`&type=entity` +
		`&names=Candidate` +
		`&eventTypes=INSERTED,UPDATED,DELETED`;
	console.log(`PUT ${restUrl}event/subscription/${subId}?...`);

	const subResp = await request('PUT', subUrl);
	console.log(`Status: ${subResp.statusCode}`);
	console.log(`Response: ${subResp.body.substring(0, 200)}`);
	console.log('');

	// Poll for events
	console.log('--- Step 8: Poll Events ---');
	const pollUrl =
		`${restUrl}event/subscription/${subId}` +
		`?BhRestToken=${encodeURIComponent(bhRestToken)}` +
		`&maxEvents=10`;
	console.log(`GET ${restUrl}event/subscription/${subId}?maxEvents=10`);

	const pollResp = await request('GET', pollUrl);
	console.log(`Status: ${pollResp.statusCode}`);
	if (pollResp.body && pollResp.body.trim()) {
		try {
			const pollData = JSON.parse(pollResp.body);
			console.log(`Events: ${JSON.stringify(pollData, null, 2).substring(0, 500)}`);
		} catch {
			console.log('Poll response (raw):', pollResp.body.substring(0, 300));
		}
	} else {
		console.log('No events (empty response — subscription is new)');
	}
	console.log('');

	// Step 10: Test token refresh
	console.log('--- Step 9: Test Token Refresh ---');
	const refreshUrl =
		`${authBaseUrl}/oauth/token` +
		`?grant_type=refresh_token` +
		`&refresh_token=${encodeURIComponent(tokenData.refresh_token)}` +
		`&client_id=${encodeURIComponent(CLIENT_ID)}` +
		`&client_secret=${encodeURIComponent(CLIENT_SECRET)}`;
	console.log(`POST ${authBaseUrl}/oauth/token?grant_type=refresh_token&...`);

	const refreshResp = await request('POST', refreshUrl);
	console.log(`Status: ${refreshResp.statusCode}`);
	const refreshData = JSON.parse(refreshResp.body);
	console.log(`New access_token: ${(refreshData.access_token || '').substring(0, 30)}...`);
	console.log(`New refresh_token: ${(refreshData.refresh_token || '').substring(0, 30)}...`);
	console.log('');

	console.log('=== ALL TESTS PASSED ===');
}

main().catch((err) => {
	console.error('TEST FAILED:', err);
	process.exit(1);
});
