import { INodeProperties } from 'n8n-workflow';

export const appointmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['appointment'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create an appointment', action: 'Create an appointment' },
			{ name: 'Delete', value: 'delete', description: 'Delete an appointment', action: 'Delete an appointment' },
			{ name: 'Get', value: 'get', description: 'Get an appointment', action: 'Get an appointment' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many appointments', action: 'Get many appointments' },
			{ name: 'Update', value: 'update', description: 'Update an appointment', action: 'Update an appointment' },
		],
		default: 'get',
	},
];

export const appointmentFields: INodeProperties[] = [
	{
		displayName: 'Appointment ID',
		name: 'entityId',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['appointment'], operation: ['get', 'update', 'delete'] } },
		default: 0,
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		displayOptions: { show: { resource: ['appointment'], operation: ['get', 'getAll'] } },
		default: 'id,subject,dateBegin,dateEnd,type',
	},

	// Create required
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['appointment'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Date Begin',
		name: 'dateBegin',
		type: 'dateTime',
		required: true,
		displayOptions: { show: { resource: ['appointment'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Date End',
		name: 'dateEnd',
		type: 'dateTime',
		required: true,
		displayOptions: { show: { resource: ['appointment'], operation: ['create'] } },
		default: '',
	},

	// Additional
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: { show: { resource: ['appointment'], operation: ['create', 'update'] } },
		default: {},
		options: [
			{ displayName: 'Type', name: 'type', type: 'string', default: '', description: 'Appointment type' },
			{ displayName: 'Description', name: 'description', type: 'string', default: '' },
			{ displayName: 'Location', name: 'location', type: 'string', default: '' },
			{ displayName: 'Candidate Reference ID', name: 'candidateReference', type: 'number', default: 0 },
			{ displayName: 'Job Order ID', name: 'jobOrder', type: 'number', default: 0 },
			{ displayName: 'Owner ID', name: 'owner', type: 'number', default: 0 },
			{ displayName: 'Custom Fields (JSON)', name: 'customFields', type: 'json', default: '{}' },
		],
	},

	// Search
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'options',
		displayOptions: { show: { resource: ['appointment'], operation: ['getAll'] } },
		options: [
			{ name: 'Query (SQL-like WHERE)', value: 'query' },
		],
		default: 'query',
		description: 'Appointments only support Query (not Lucene Search)',
	},
	{
		displayName: 'Query String',
		name: 'queryString',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['appointment'], operation: ['getAll'] } },
		default: '',
		description: 'SQL WHERE clause (e.g. "isDeleted=false")',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: { resource: ['appointment'], operation: ['getAll'] } },
		default: false,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { resource: ['appointment'], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
	},
];
