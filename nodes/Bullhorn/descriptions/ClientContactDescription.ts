import { INodeProperties } from 'n8n-workflow';

export const clientContactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['clientContact'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a client contact', action: 'Create a client contact' },
			{ name: 'Delete', value: 'delete', description: 'Delete a client contact', action: 'Delete a client contact' },
			{ name: 'Get', value: 'get', description: 'Get a client contact', action: 'Get a client contact' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many client contacts', action: 'Get many client contacts' },
			{ name: 'Update', value: 'update', description: 'Update a client contact', action: 'Update a client contact' },
		],
		default: 'get',
	},
];

export const clientContactFields: INodeProperties[] = [
	{
		displayName: 'Client Contact ID',
		name: 'entityId',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['clientContact'], operation: ['get', 'update', 'delete'] } },
		default: 0,
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		displayOptions: { show: { resource: ['clientContact'], operation: ['get', 'getAll'] } },
		default: 'id,firstName,lastName,email,clientCorporation',
	},

	// Create required
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['clientContact'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['clientContact'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Client Corporation ID',
		name: 'clientCorporation',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['clientContact'], operation: ['create'] } },
		default: 0,
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['clientContact'], operation: ['create'] } },
		default: '',
		description: 'Full name',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['clientContact'], operation: ['create'] } },
		default: 'Active',
	},

	// Additional
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: { show: { resource: ['clientContact'], operation: ['create', 'update'] } },
		default: {},
		options: [
			{ displayName: 'Email', name: 'email', type: 'string', default: '' },
			{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
			{ displayName: 'Title', name: 'occupation', type: 'string', default: '', description: 'Job title' },
			{ displayName: 'Type', name: 'type', type: 'string', default: '' },
			{ displayName: 'Owner ID', name: 'owner', type: 'number', default: 0 },
			{ displayName: 'Custom Fields (JSON)', name: 'customFields', type: 'json', default: '{}' },
		],
	},

	// Search
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'options',
		displayOptions: { show: { resource: ['clientContact'], operation: ['getAll'] } },
		options: [
			{ name: 'Query (SQL)', value: 'query', description: 'SQL WHERE clause syntax — supports JOINs, IN, comparisons' },
			{ name: 'Search (Lucene)', value: 'search', description: 'Full-text Lucene search syntax' },
		],
		default: 'query',
	},
	{
		displayName: 'WHERE Clause',
		name: 'queryString',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['clientContact'], operation: ['getAll'], searchType: ['query'] } },
		default: 'isDeleted=false',
		description: 'SQL WHERE syntax (e.g. "clientCorporation.id=406 AND isDeleted=false")',
	},
	{
		displayName: 'Search Query (Lucene)',
		name: 'queryString',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['clientContact'], operation: ['getAll'], searchType: ['search'] } },
		default: 'isDeleted:false',
		description: 'Lucene query syntax (e.g. "firstName:John")',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: { resource: ['clientContact'], operation: ['getAll'] } },
		default: false,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { resource: ['clientContact'], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
	},
];
