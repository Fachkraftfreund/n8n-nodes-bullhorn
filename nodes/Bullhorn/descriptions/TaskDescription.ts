import { INodeProperties } from 'n8n-workflow';

export const taskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['task'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a task', action: 'Create a task' },
			{ name: 'Delete', value: 'delete', description: 'Delete a task', action: 'Delete a task' },
			{ name: 'Get', value: 'get', description: 'Get a task', action: 'Get a task' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many tasks', action: 'Get many tasks' },
			{ name: 'Update', value: 'update', description: 'Update a task', action: 'Update a task' },
		],
		default: 'get',
	},
];

export const taskFields: INodeProperties[] = [
	{
		displayName: 'Task ID',
		name: 'entityId',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['task'], operation: ['get', 'update', 'delete'] } },
		default: 0,
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		displayOptions: { show: { resource: ['task'], operation: ['get', 'getAll'] } },
		default: 'id,subject,status,dateBegin,dateDue',
	},

	// Create required
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['task'], operation: ['create'] } },
		default: '',
	},

	// Additional
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: { show: { resource: ['task'], operation: ['create', 'update'] } },
		default: {},
		options: [
			{ displayName: 'Description', name: 'description', type: 'string', default: '' },
			{ displayName: 'Date Begin', name: 'dateBegin', type: 'dateTime', default: '' },
			{ displayName: 'Date Due', name: 'dateDue', type: 'dateTime', default: '' },
			{ displayName: 'Status', name: 'status', type: 'string', default: '', description: 'e.g. "Not Started", "In Progress", "Completed"' },
			{ displayName: 'Priority', name: 'priority', type: 'number', default: 0 },
			{ displayName: 'Type', name: 'type', type: 'string', default: '' },
			{ displayName: 'Owner ID', name: 'owner', type: 'number', default: 0 },
			{ displayName: 'Candidate ID', name: 'candidate', type: 'number', default: 0 },
			{ displayName: 'Job Order ID', name: 'jobOrder', type: 'number', default: 0 },
			{ displayName: 'Custom Fields (JSON)', name: 'customFields', type: 'json', default: '{}' },
		],
	},

	// Search
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'options',
		displayOptions: { show: { resource: ['task'], operation: ['getAll'] } },
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
		displayOptions: { show: { resource: ['task'], operation: ['getAll'], searchType: ['query'] } },
		default: 'isDeleted=false',
		description: 'SQL WHERE syntax (e.g. "status=\'Not Started\' AND isDeleted=false")',
	},
	{
		displayName: 'Search Query (Lucene)',
		name: 'queryString',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['task'], operation: ['getAll'], searchType: ['search'] } },
		default: 'isDeleted:false',
		description: 'Lucene query syntax (e.g. "subject:Follow")',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: { resource: ['task'], operation: ['getAll'] } },
		default: false,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { resource: ['task'], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
	},
];
