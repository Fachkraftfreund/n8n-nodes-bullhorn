import { INodeProperties } from 'n8n-workflow';

export const jobSubmissionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['jobSubmission'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a job submission', action: 'Create a job submission' },
			{ name: 'Delete', value: 'delete', description: 'Delete a job submission', action: 'Delete a job submission' },
			{ name: 'Get', value: 'get', description: 'Get a job submission', action: 'Get a job submission' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many job submissions', action: 'Get many job submissions' },
			{ name: 'Update', value: 'update', description: 'Update a job submission', action: 'Update a job submission' },
		],
		default: 'get',
	},
];

export const jobSubmissionFields: INodeProperties[] = [
	{
		displayName: 'Job Submission ID',
		name: 'entityId',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['jobSubmission'], operation: ['get', 'update', 'delete'] } },
		default: 0,
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		displayOptions: { show: { resource: ['jobSubmission'], operation: ['get', 'getAll'] } },
		default: 'id,candidate,jobOrder,status,dateAdded',
	},

	// Create required
	{
		displayName: 'Candidate ID',
		name: 'candidate',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['jobSubmission'], operation: ['create'] } },
		default: 0,
	},
	{
		displayName: 'Job Order ID',
		name: 'jobOrder',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['jobSubmission'], operation: ['create'] } },
		default: 0,
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['jobSubmission'], operation: ['create'] } },
		default: 'New Lead',
	},

	// Additional
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: { show: { resource: ['jobSubmission'], operation: ['create', 'update'] } },
		default: {},
		options: [
			{ displayName: 'Date Web Response', name: 'dateWebResponse', type: 'dateTime', default: '' },
			{ displayName: 'Sending User ID', name: 'sendingUser', type: 'number', default: 0 },
			{ displayName: 'Source', name: 'source', type: 'string', default: '' },
			{ displayName: 'Comments', name: 'comments', type: 'string', default: '' },
			{ displayName: 'Custom Fields (JSON)', name: 'customFields', type: 'json', default: '{}' },
		],
	},

	// Search
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'options',
		displayOptions: { show: { resource: ['jobSubmission'], operation: ['getAll'] } },
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
		displayOptions: { show: { resource: ['jobSubmission'], operation: ['getAll'], searchType: ['query'] } },
		default: 'isDeleted=false',
		description: 'SQL WHERE syntax (e.g. "candidate.id=123 AND isDeleted=false")',
	},
	{
		displayName: 'Search Query (Lucene)',
		name: 'queryString',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['jobSubmission'], operation: ['getAll'], searchType: ['search'] } },
		default: 'isDeleted:false',
		description: 'Lucene query syntax (e.g. "status:Active")',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: { resource: ['jobSubmission'], operation: ['getAll'] } },
		default: false,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { resource: ['jobSubmission'], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
	},
];
