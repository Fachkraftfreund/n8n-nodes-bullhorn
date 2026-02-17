import { INodeProperties } from 'n8n-workflow';

export const leadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['lead'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a lead', action: 'Create a lead' },
			{ name: 'Delete', value: 'delete', description: 'Delete a lead', action: 'Delete a lead' },
			{ name: 'Get', value: 'get', description: 'Get a lead', action: 'Get a lead' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many leads', action: 'Get many leads' },
			{ name: 'Update', value: 'update', description: 'Update a lead', action: 'Update a lead' },
		],
		default: 'get',
	},
];

export const leadFields: INodeProperties[] = [
	{
		displayName: 'Lead ID',
		name: 'entityId',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['lead'], operation: ['get', 'update', 'delete'] } },
		default: 0,
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		displayOptions: { show: { resource: ['lead'], operation: ['get', 'getAll'] } },
		default: 'id,firstName,lastName,email,status',
	},

	// Create required
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['lead'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['lead'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['lead'], operation: ['create'] } },
		default: '',
		description: 'Full name',
	},

	// Additional
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: { show: { resource: ['lead'], operation: ['create', 'update'] } },
		default: {},
		options: [
			{ displayName: 'Email', name: 'email', type: 'string', default: '' },
			{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
			{ displayName: 'Company Name', name: 'companyName', type: 'string', default: '' },
			{ displayName: 'Status', name: 'status', type: 'string', default: '' },
			{ displayName: 'Owner ID', name: 'owner', type: 'number', default: 0 },
			{ displayName: 'Custom Fields (JSON)', name: 'customFields', type: 'json', default: '{}' },
		],
	},

	// Search
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'options',
		displayOptions: { show: { resource: ['lead'], operation: ['getAll'] } },
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
		displayOptions: { show: { resource: ['lead'], operation: ['getAll'] } },
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: { resource: ['lead'], operation: ['getAll'] } },
		default: false,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { resource: ['lead'], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
	},
];
