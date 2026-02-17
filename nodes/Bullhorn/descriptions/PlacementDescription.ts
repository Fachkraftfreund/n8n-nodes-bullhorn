import { INodeProperties } from 'n8n-workflow';

export const placementOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['placement'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a placement', action: 'Create a placement' },
			{ name: 'Delete', value: 'delete', description: 'Delete a placement', action: 'Delete a placement' },
			{ name: 'Get', value: 'get', description: 'Get a placement', action: 'Get a placement' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many placements', action: 'Get many placements' },
			{ name: 'Update', value: 'update', description: 'Update a placement', action: 'Update a placement' },
		],
		default: 'get',
	},
];

export const placementFields: INodeProperties[] = [
	{
		displayName: 'Placement ID',
		name: 'entityId',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['placement'], operation: ['get', 'update', 'delete'] } },
		default: 0,
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		displayOptions: { show: { resource: ['placement'], operation: ['get', 'getAll'] } },
		default: 'id,candidate,jobOrder,status,dateBegin,payRate',
	},

	// Create required
	{
		displayName: 'Candidate ID',
		name: 'candidate',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['placement'], operation: ['create'] } },
		default: 0,
	},
	{
		displayName: 'Job Order ID',
		name: 'jobOrder',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['placement'], operation: ['create'] } },
		default: 0,
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['placement'], operation: ['create'] } },
		default: 'Placed',
	},
	{
		displayName: 'Date Begin',
		name: 'dateBegin',
		type: 'dateTime',
		required: true,
		displayOptions: { show: { resource: ['placement'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Pay Rate',
		name: 'payRate',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['placement'], operation: ['create'] } },
		default: 0,
		description: 'Hourly or unit pay rate',
	},
	{
		displayName: 'Client Bill Rate',
		name: 'clientBillRate',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['placement'], operation: ['create'] } },
		default: 0,
	},

	// Additional
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: { show: { resource: ['placement'], operation: ['create', 'update'] } },
		default: {},
		options: [
			{ displayName: 'Date End', name: 'dateEnd', type: 'dateTime', default: '' },
			{ displayName: 'Salary', name: 'salary', type: 'number', default: 0 },
			{ displayName: 'Salary Unit', name: 'salaryUnit', type: 'string', default: '', description: 'e.g. "Per Year", "Per Hour"' },
			{ displayName: 'Fee', name: 'fee', type: 'number', default: 0 },
			{ displayName: 'Job Submission ID', name: 'jobSubmission', type: 'number', default: 0 },
			{ displayName: 'Custom Fields (JSON)', name: 'customFields', type: 'json', default: '{}' },
		],
	},

	// Search
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'hidden',
		displayOptions: { show: { resource: ['placement'], operation: ['getAll'] } },
		default: 'search',
	},
	{
		displayName: 'Search Query (Lucene)',
		name: 'queryString',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['placement'], operation: ['getAll'] } },
		default: 'isDeleted:false',
		description: 'Lucene query syntax (e.g. "status:Placed")',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: { resource: ['placement'], operation: ['getAll'] } },
		default: false,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { resource: ['placement'], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
	},
];
