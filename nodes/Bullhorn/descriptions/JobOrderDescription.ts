import { INodeProperties } from 'n8n-workflow';

export const jobOrderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['jobOrder'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a job order', action: 'Create a job order' },
			{ name: 'Delete', value: 'delete', description: 'Delete a job order', action: 'Delete a job order' },
			{ name: 'Get', value: 'get', description: 'Get a job order', action: 'Get a job order' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many job orders', action: 'Get many job orders' },
			{ name: 'Update', value: 'update', description: 'Update a job order', action: 'Update a job order' },
		],
		default: 'get',
	},
];

export const jobOrderFields: INodeProperties[] = [
	{
		displayName: 'Job Order ID',
		name: 'entityId',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['jobOrder'], operation: ['get', 'update', 'delete'] } },
		default: 0,
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		displayOptions: { show: { resource: ['jobOrder'], operation: ['get', 'getAll'] } },
		default: 'id,title,status,clientCorporation',
	},

	// Create required
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['jobOrder'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Client Corporation ID',
		name: 'clientCorporation',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['jobOrder'], operation: ['create'] } },
		default: 0,
		description: 'ID of the client corporation',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['jobOrder'], operation: ['create'] } },
		default: 'Accepting Candidates',
	},

	// Additional
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: { show: { resource: ['jobOrder'], operation: ['create', 'update'] } },
		default: {},
		options: [
			{ displayName: 'Description', name: 'publicDescription', type: 'string', default: '' },
			{ displayName: 'Salary', name: 'salary', type: 'number', default: 0 },
			{ displayName: 'Employment Type', name: 'employmentType', type: 'string', default: '', description: 'e.g. "Contract", "Permanent"' },
			{ displayName: 'Skills', name: 'skillList', type: 'string', default: '', description: 'Comma-separated skills' },
			{ displayName: 'Start Date', name: 'startDate', type: 'dateTime', default: '' },
			{ displayName: 'Num Openings', name: 'numOpenings', type: 'number', default: 1 },
			{ displayName: 'Owner ID', name: 'owner', type: 'number', default: 0 },
			{ displayName: 'Custom Fields (JSON)', name: 'customFields', type: 'json', default: '{}' },
		],
	},

	// Search
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'options',
		displayOptions: { show: { resource: ['jobOrder'], operation: ['getAll'] } },
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
		displayOptions: { show: { resource: ['jobOrder'], operation: ['getAll'] } },
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: { resource: ['jobOrder'], operation: ['getAll'] } },
		default: false,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { resource: ['jobOrder'], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
	},
];
