import { INodeProperties } from 'n8n-workflow';

export const candidateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['candidate'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a candidate', action: 'Create a candidate' },
			{ name: 'Delete', value: 'delete', description: 'Delete a candidate', action: 'Delete a candidate' },
			{ name: 'Get', value: 'get', description: 'Get a candidate', action: 'Get a candidate' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many candidates', action: 'Get many candidates' },
			{ name: 'Update', value: 'update', description: 'Update a candidate', action: 'Update a candidate' },
		],
		default: 'get',
	},
];

export const candidateFields: INodeProperties[] = [
	// ------ ID (get / update / delete) ------
	{
		displayName: 'Candidate ID',
		name: 'entityId',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['candidate'], operation: ['get', 'update', 'delete'] } },
		default: 0,
		description: 'The ID of the candidate',
	},

	// ------ Fields to return (get / getAll) ------
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		displayOptions: { show: { resource: ['candidate'], operation: ['get', 'getAll'] } },
		default: 'id,firstName,lastName,email,status',
		description: 'Comma-separated list of fields to return',
	},

	// ------ Create: required fields ------
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['candidate'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['candidate'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['candidate'], operation: ['create'] } },
		default: '',
		description: 'Full name (Bullhorn requires this alongside firstName/lastName)',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['candidate'], operation: ['create'] } },
		default: 'New Lead',
		description: 'e.g. "New Lead", "Active", "Placed"',
	},

	// ------ Create / Update: additional fields ------
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: { show: { resource: ['candidate'], operation: ['create', 'update'] } },
		default: {},
		options: [
			{ displayName: 'Email', name: 'email', type: 'string', default: '' },
			{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
			{ displayName: 'Mobile', name: 'mobile', type: 'string', default: '' },
			{ displayName: 'Address 1', name: 'address1', type: 'string', default: '' },
			{ displayName: 'City', name: 'city', type: 'string', default: '' },
			{ displayName: 'State', name: 'state', type: 'string', default: '' },
			{ displayName: 'Zip', name: 'zip', type: 'string', default: '' },
			{ displayName: 'Source', name: 'source', type: 'string', default: '', description: 'Candidate source' },
			{ displayName: 'Category ID', name: 'category', type: 'number', default: 0 },
			{ displayName: 'Owner ID', name: 'owner', type: 'number', default: 0, description: 'CorporateUser ID of the owner' },
			{
				displayName: 'Custom Fields (JSON)',
				name: 'customFields',
				type: 'json',
				default: '{}',
				description: 'Additional fields as a JSON object, merged into the request body',
			},
		],
	},

	// ------ Get All: search options ------
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'options',
		displayOptions: { show: { resource: ['candidate'], operation: ['getAll'] } },
		options: [
			{ name: 'Query (SQL-like WHERE)', value: 'query' },
			{ name: 'Search (Lucene)', value: 'search' },
		],
		default: 'query',
	},
	{
		displayName: 'Query / Search String',
		name: 'queryString',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['candidate'], operation: ['getAll'] } },
		default: '',
		description: 'For Query: SQL WHERE clause (e.g. "isDeleted=false"). For Search: Lucene query (e.g. "firstName:John").',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: { resource: ['candidate'], operation: ['getAll'] } },
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { resource: ['candidate'], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
	},
];
