import { INodeProperties } from 'n8n-workflow';

export const clientCorporationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['clientCorporation'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a client corporation', action: 'Create a client corporation' },
			{ name: 'Delete', value: 'delete', description: 'Delete a client corporation', action: 'Delete a client corporation' },
			{ name: 'Get', value: 'get', description: 'Get a client corporation', action: 'Get a client corporation' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many client corporations', action: 'Get many client corporations' },
			{ name: 'Update', value: 'update', description: 'Update a client corporation', action: 'Update a client corporation' },
		],
		default: 'get',
	},
];

export const clientCorporationFields: INodeProperties[] = [
	{
		displayName: 'Client Corporation ID',
		name: 'entityId',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['clientCorporation'], operation: ['get', 'update', 'delete'] } },
		default: 0,
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		displayOptions: { show: { resource: ['clientCorporation'], operation: ['get', 'getAll'] } },
		default: 'id,name,status,phone',
	},

	// Create required
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['clientCorporation'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['clientCorporation'], operation: ['create'] } },
		default: 'Active',
	},

	// Additional
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: { show: { resource: ['clientCorporation'], operation: ['create', 'update'] } },
		default: {},
		options: [
			{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
			{ displayName: 'Fax', name: 'fax', type: 'string', default: '' },
			{ displayName: 'Website', name: 'companyURL', type: 'string', default: '' },
			{ displayName: 'Industry', name: 'industryList', type: 'string', default: '' },
			{ displayName: 'Annual Revenue', name: 'annualRevenue', type: 'number', default: 0 },
			{ displayName: 'Num Employees', name: 'numEmployees', type: 'number', default: 0 },
			{ displayName: 'Address 1', name: 'address1', type: 'string', default: '' },
			{ displayName: 'City', name: 'city', type: 'string', default: '' },
			{ displayName: 'State', name: 'state', type: 'string', default: '' },
			{ displayName: 'Zip', name: 'zip', type: 'string', default: '' },
			{ displayName: 'Owner ID', name: 'owner', type: 'number', default: 0 },
			{ displayName: 'Custom Fields (JSON)', name: 'customFields', type: 'json', default: '{}' },
		],
	},

	// Search
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'options',
		displayOptions: { show: { resource: ['clientCorporation'], operation: ['getAll'] } },
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
		displayOptions: { show: { resource: ['clientCorporation'], operation: ['getAll'] } },
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: { resource: ['clientCorporation'], operation: ['getAll'] } },
		default: false,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { resource: ['clientCorporation'], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
	},
];
