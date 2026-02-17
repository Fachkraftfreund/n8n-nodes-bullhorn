import { INodeProperties } from 'n8n-workflow';

export const opportunityOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['opportunity'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create an opportunity', action: 'Create an opportunity' },
			{ name: 'Delete', value: 'delete', description: 'Delete an opportunity', action: 'Delete an opportunity' },
			{ name: 'Get', value: 'get', description: 'Get an opportunity', action: 'Get an opportunity' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many opportunities', action: 'Get many opportunities' },
			{ name: 'Update', value: 'update', description: 'Update an opportunity', action: 'Update an opportunity' },
		],
		default: 'get',
	},
];

export const opportunityFields: INodeProperties[] = [
	{
		displayName: 'Opportunity ID',
		name: 'entityId',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['opportunity'], operation: ['get', 'update', 'delete'] } },
		default: 0,
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		displayOptions: { show: { resource: ['opportunity'], operation: ['get', 'getAll'] } },
		default: 'id,title,status,clientCorporation',
	},

	// Create required
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['opportunity'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Client Corporation ID',
		name: 'clientCorporation',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['opportunity'], operation: ['create'] } },
		default: 0,
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['opportunity'], operation: ['create'] } },
		default: 'New',
	},

	// Additional
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: { show: { resource: ['opportunity'], operation: ['create', 'update'] } },
		default: {},
		options: [
			{ displayName: 'Estimated Start Date', name: 'estimatedStartDate', type: 'dateTime', default: '' },
			{ displayName: 'Estimated Duration', name: 'estimatedDuration', type: 'number', default: 0, description: 'Duration in days' },
			{ displayName: 'Probability', name: 'dealValue', type: 'number', default: 0, description: 'Win probability percentage' },
			{ displayName: 'Weighted Deal Value', name: 'weightedDealValue', type: 'number', default: 0 },
			{ displayName: 'Owner ID', name: 'owner', type: 'number', default: 0 },
			{ displayName: 'Custom Fields (JSON)', name: 'customFields', type: 'json', default: '{}' },
		],
	},

	// Search
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'options',
		displayOptions: { show: { resource: ['opportunity'], operation: ['getAll'] } },
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
		displayOptions: { show: { resource: ['opportunity'], operation: ['getAll'] } },
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: { resource: ['opportunity'], operation: ['getAll'] } },
		default: false,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { resource: ['opportunity'], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
	},
];
