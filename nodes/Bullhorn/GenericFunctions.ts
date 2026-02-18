import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	NodeApiError,
	NodeOperationError,
	JsonObject,
} from 'n8n-workflow';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BullhornSession {
	bhRestToken: string;
	restUrl: string;
	accessToken: string;
	refreshToken: string;
	accessTokenExpiresAt: number;
	loginExpiresAt: number;
	authBaseUrl: string;
	restLoginBaseUrl: string;
}

interface DataCenterUrls {
	authBaseUrl: string;
	restLoginBaseUrl: string;
}

type BullhornContext = IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions;

// ---------------------------------------------------------------------------
// Module-level session cache (keyed by clientId:username)
// ---------------------------------------------------------------------------

const sessionCache = new Map<string, BullhornSession>();

// ---------------------------------------------------------------------------
// Data Center URL resolution
// ---------------------------------------------------------------------------

async function getDataCenterUrls(
	context: BullhornContext,
	credentials: IDataObject,
): Promise<DataCenterUrls> {
	const dataCenter = credentials.dataCenter as string;

	if (dataCenter === 'custom') {
		return {
			authBaseUrl: (credentials.customAuthUrl as string).replace(/\/+$/, ''),
			restLoginBaseUrl: (credentials.customRestLoginUrl as string).replace(/\/+$/, ''),
		};
	}

	if (dataCenter === 'auto') {
		const response = (await context.helpers.httpRequest({
			method: 'GET',
			url: 'https://rest.bullhornstaffing.com/rest-services/loginInfo',
			qs: { username: credentials.username },
			json: true,
		})) as IDataObject;

		const oauthUrl = (response.oauthUrl as string) || '';
		const restUrl = (response.restUrl as string) || '';

		if (!oauthUrl) {
			throw new NodeOperationError(
				context.getNode(),
				'loginInfo did not return an oauthUrl. Check your username or select a data center manually.',
			);
		}

		// oauthUrl can be:
		//   "https://auth-ger.bullhornstaffing.com/oauth"
		//   "https://auth-cls99.bullhornstaffing.com/oauth/authorize"
		// restUrl can be:
		//   "https://rest-ger.bullhornstaffing.com/rest-services"
		//   "https://rest99.bullhornstaffing.com/rest-services/"
		const authBaseUrl = oauthUrl.replace(/\/oauth(\/authorize)?.*$/, '');
		const restLoginBaseUrl = restUrl.replace(/\/rest-services\/?.*$/, '');

		return { authBaseUrl, restLoginBaseUrl };
	}

	// Named data center (e.g. cls99)
	return {
		authBaseUrl: `https://auth-${dataCenter}.bullhornstaffing.com`,
		restLoginBaseUrl: `https://rest-${dataCenter}.bullhornstaffing.com`,
	};
}

// ---------------------------------------------------------------------------
// OAuth: Get authorization code (headless login)
// ---------------------------------------------------------------------------

async function getAuthorizationCode(
	context: BullhornContext,
	credentials: IDataObject,
	authBaseUrl: string,
): Promise<string> {
	// Bullhorn supports headless auth: pass username/password as query params
	// The response is a 302 redirect whose Location header contains ?code=...
	const authorizeUrl =
		`${authBaseUrl}/oauth/authorize` +
		`?client_id=${encodeURIComponent(credentials.clientId as string)}` +
		`&response_type=code` +
		`&action=Login` +
		`&username=${encodeURIComponent(credentials.username as string)}` +
		`&password=${encodeURIComponent(credentials.password as string)}`;

	try {
		const response = await context.helpers.httpRequest({
			method: 'GET',
			url: authorizeUrl,
			ignoreHttpStatusErrors: true,
			returnFullResponse: true,
			disableFollowRedirect: true,
		});

		// The code is in the Location header of the redirect
		const locationHeader =
			(response as IDataObject).headers &&
			(((response as IDataObject).headers as IDataObject).location as string);

		if (locationHeader) {
			const url = new URL(locationHeader, authBaseUrl);
			const code = url.searchParams.get('code');
			if (code) return code;
		}

		// Some Bullhorn environments return the code in the body/URL directly
		const body = typeof (response as IDataObject).body === 'string'
			? (response as IDataObject).body as string
			: JSON.stringify((response as IDataObject).body);

		const codeMatch = body.match(/code=([^&"]+)/);
		if (codeMatch) return codeMatch[1];

		throw new NodeOperationError(
			context.getNode(),
			'Could not extract authorization code from Bullhorn. Check your credentials.',
		);
	} catch (error) {
		if ((error as NodeOperationError).description) throw error;
		throw new NodeOperationError(
			context.getNode(),
			`Bullhorn authorization failed: ${(error as Error).message}`,
		);
	}
}

// ---------------------------------------------------------------------------
// OAuth: Exchange code for access token
// ---------------------------------------------------------------------------

async function getAccessToken(
	context: BullhornContext,
	credentials: IDataObject,
	authBaseUrl: string,
	authCode: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
	const response = (await context.helpers.httpRequest({
		method: 'POST',
		url: `${authBaseUrl}/oauth/token`,
		qs: {
			grant_type: 'authorization_code',
			code: authCode,
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret,
		},
		json: true,
	})) as IDataObject;

	if (!response.access_token) {
		throw new NodeOperationError(
			context.getNode(),
			`Bullhorn token exchange failed: ${JSON.stringify(response)}`,
		);
	}

	return {
		accessToken: response.access_token as string,
		refreshToken: response.refresh_token as string,
		expiresIn: (response.expires_in as number) || 600,
	};
}

// ---------------------------------------------------------------------------
// OAuth: Refresh access token
// ---------------------------------------------------------------------------

async function refreshAccessToken(
	context: BullhornContext,
	credentials: IDataObject,
	session: BullhornSession,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
	const response = (await context.helpers.httpRequest({
		method: 'POST',
		url: `${session.authBaseUrl}/oauth/token`,
		qs: {
			grant_type: 'refresh_token',
			refresh_token: session.refreshToken,
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret,
		},
		json: true,
	})) as IDataObject;

	if (!response.access_token) {
		throw new NodeOperationError(
			context.getNode(),
			`Bullhorn token refresh failed: ${JSON.stringify(response)}`,
		);
	}

	return {
		accessToken: response.access_token as string,
		refreshToken: response.refresh_token as string,
		expiresIn: (response.expires_in as number) || 600,
	};
}

// ---------------------------------------------------------------------------
// REST Login: Exchange access token for BhRestToken
// ---------------------------------------------------------------------------

async function loginToRest(
	context: BullhornContext,
	restLoginBaseUrl: string,
	accessToken: string,
): Promise<{ bhRestToken: string; restUrl: string }> {
	const response = (await context.helpers.httpRequest({
		method: 'POST',
		url: `${restLoginBaseUrl}/rest-services/login`,
		qs: {
			version: '2.0',
			access_token: accessToken,
		},
		json: true,
	})) as IDataObject;

	if (!response.BhRestToken) {
		throw new NodeOperationError(
			context.getNode(),
			`Bullhorn REST login failed: ${JSON.stringify(response)}`,
		);
	}

	// Ensure restUrl ends with /
	let restUrl = response.restUrl as string;
	if (!restUrl.endsWith('/')) restUrl += '/';

	return {
		bhRestToken: response.BhRestToken as string,
		restUrl,
	};
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

async function getSession(context: BullhornContext): Promise<BullhornSession> {
	const credentials = await context.getCredentials('bullhornApi');
	const cacheKey = `${credentials.clientId}:${credentials.username}`;
	const now = Date.now();

	const cached = sessionCache.get(cacheKey);

	// Case 1: Cached session with valid BhRestToken
	if (cached && cached.loginExpiresAt > now) {
		return cached;
	}

	// Case 2: Cached session with expired login but valid access token → re-login
	if (cached && cached.accessTokenExpiresAt > now) {
		const { bhRestToken, restUrl } = await loginToRest(
			context,
			cached.restLoginBaseUrl,
			cached.accessToken,
		);
		cached.bhRestToken = bhRestToken;
		cached.restUrl = restUrl;
		cached.loginExpiresAt = now + 9 * 60 * 1000; // 9 minutes
		sessionCache.set(cacheKey, cached);
		return cached;
	}

	// Case 3: Cached session with expired access token but refresh token available
	if (cached && cached.refreshToken) {
		try {
			const tokens = await refreshAccessToken(context, credentials, cached);
			const { bhRestToken, restUrl } = await loginToRest(
				context,
				cached.restLoginBaseUrl,
				tokens.accessToken,
			);

			const session: BullhornSession = {
				bhRestToken,
				restUrl,
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken,
				accessTokenExpiresAt: now + (tokens.expiresIn - 30) * 1000,
				loginExpiresAt: now + 9 * 60 * 1000,
				authBaseUrl: cached.authBaseUrl,
				restLoginBaseUrl: cached.restLoginBaseUrl,
			};
			sessionCache.set(cacheKey, session);
			return session;
		} catch {
			// Refresh failed — fall through to full re-auth
			sessionCache.delete(cacheKey);
		}
	}

	// Case 4: Full authentication from scratch
	const { authBaseUrl, restLoginBaseUrl } = await getDataCenterUrls(context, credentials);
	const authCode = await getAuthorizationCode(context, credentials, authBaseUrl);
	const tokens = await getAccessToken(context, credentials, authBaseUrl, authCode);
	const { bhRestToken, restUrl } = await loginToRest(
		context,
		restLoginBaseUrl,
		tokens.accessToken,
	);

	const session: BullhornSession = {
		bhRestToken,
		restUrl,
		accessToken: tokens.accessToken,
		refreshToken: tokens.refreshToken,
		accessTokenExpiresAt: now + (tokens.expiresIn - 30) * 1000,
		loginExpiresAt: now + 9 * 60 * 1000,
		authBaseUrl,
		restLoginBaseUrl,
	};
	sessionCache.set(cacheKey, session);
	return session;
}

function clearSessionCache(context: BullhornContext): void {
	// Clear all cached sessions — used on 401 retry
	sessionCache.clear();
}

// ---------------------------------------------------------------------------
// Public API: Make authenticated requests
// ---------------------------------------------------------------------------

export async function bullhornApiRequest(
	this: BullhornContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	query?: IDataObject,
	retried = false,
): Promise<IDataObject> {
	const session = await getSession(this);

	const options: IHttpRequestOptions = {
		method,
		url: `${session.restUrl}${endpoint}`,
		qs: {
			BhRestToken: session.bhRestToken,
			...(query || {}),
		},
		json: true,
	};

	if (body && (method === 'POST' || method === 'PUT')) {
		options.body = body as unknown as IDataObject;
	}

	try {
		const response = await this.helpers.httpRequest(options);
		return response as IDataObject;
	} catch (error) {
		const statusCode = (error as IDataObject).httpCode || (error as IDataObject).statusCode;

		// 401: clear cache and retry once
		if (statusCode === 401 && !retried) {
			clearSessionCache(this);
			return bullhornApiRequest.call(this, method, endpoint, body, query, true);
		}

		// 429: rate limited — wait and retry once
		if (statusCode === 429 && !retried) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			return bullhornApiRequest.call(this, method, endpoint, body, query, true);
		}

		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: `Bullhorn API error: ${(error as Error).message}`,
		});
	}
}

// ---------------------------------------------------------------------------
// Public API: Paginated request (fetch all items)
// ---------------------------------------------------------------------------

export async function bullhornApiRequestAllItems(
	this: BullhornContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	query?: IDataObject,
): Promise<IDataObject[]> {
	const allItems: IDataObject[] = [];
	const pageSize = 500; // Bullhorn max
	let start = 0;

	const paginatedQuery = { ...(query || {}), count: pageSize, start };

	// eslint-disable-next-line no-constant-condition
	while (true) {
		paginatedQuery.start = start;
		const response = await bullhornApiRequest.call(this, method, endpoint, body, paginatedQuery);
		const data = (response.data as IDataObject[]) || [];
		allItems.push(...data);

		const total = (response.total as number) || 0;
		start += pageSize;

		if (data.length < pageSize || start >= total) break;
	}

	return allItems;
}

// ---------------------------------------------------------------------------
// Public API: Fetch custom fields metadata from /meta endpoint
// ---------------------------------------------------------------------------

/**
 * Generate the prettified default label for a custom field name.
 * e.g. "customTextBlock6" → "Custom Text Block 6"
 */
function prettifyFieldName(name: string): string {
	return name
		.replace(/^custom/, 'Custom ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([A-Za-z])(\d)/g, '$1 $2');
}

/**
 * Returns true if the label is a genuinely user-assigned name
 * (not just the internal name or prettified default).
 */
function hasCustomLabel(name: string, label: string): boolean {
	if (label.toLowerCase() === name.toLowerCase()) return false;
	if (label === prettifyFieldName(name)) return false;
	return true;
}

export async function getCustomFieldsMeta(
	this: BullhornContext,
	entityName: string,
): Promise<Array<{ name: string; label: string; dataType: string }>> {
	const response = await bullhornApiRequest.call(
		this, 'GET', `meta/${entityName}`, undefined, { fields: '*' },
	);

	const fields = (response.fields as IDataObject[]) || [];

	return fields
		.filter((f) => {
			const name = f.name as string;
			const label = f.label as string;
			if (!name || !/^custom/i.test(name)) return false;
			if (!label) return false;
			return hasCustomLabel(name, label);
		})
		.map((f) => ({
			name: f.name as string,
			label: f.label as string,
			dataType: (f.dataType as string) || 'String',
		}))
		.sort((a, b) => a.label.localeCompare(b.label));
}
