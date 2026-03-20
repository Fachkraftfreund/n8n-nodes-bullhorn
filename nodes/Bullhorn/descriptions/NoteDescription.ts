import { INodeProperties } from 'n8n-workflow';

export const noteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['note'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a note', action: 'Create a note' },
			{ name: 'Delete', value: 'delete', description: 'Delete a note', action: 'Delete a note' },
			{ name: 'Get', value: 'get', description: 'Get a note', action: 'Get a note' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many notes', action: 'Get many notes' },
			{ name: 'Update', value: 'update', description: 'Update a note', action: 'Update a note' },
		],
		default: 'get',
	},
];

export const noteFields: INodeProperties[] = [
	{
		displayName: 'Note ID',
		name: 'entityId',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['note'], operation: ['get', 'update', 'delete'] } },
		default: 0,
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		displayOptions: { show: { resource: ['note'], operation: ['get', 'getAll'] } },
		default: 'id,action,comments,dateAdded,personReference',
		description: 'Comma-separated list of fields to return. Available fields: id, action, bhTimeStamp, candidates, clientContacts, commentingPerson, comments, corporateUsers, dateAdded, dateLastModified, entities, externalID, isDeleted, jobOrder, jobOrders, leads, minutesSpent, opportunities, people, personReference, placements, primaryDepartmentName.',
	},

	// Create required
	{
		displayName: 'Action',
		name: 'action',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['note'], operation: ['create'] } },
		default: '',
		description: 'Note action type (e.g. "General Note", "Phone Call")',
	},
	{
		displayName: 'Comments',
		name: 'comments',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['note'], operation: ['create'] } },
		default: '',
		typeOptions: { rows: 4 },
	},

	// Additional
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: { show: { resource: ['note'], operation: ['create', 'update'] } },
		default: {},
		options: [
			{ displayName: 'Person Reference ID', name: 'personReference', type: 'number', default: 0, description: 'ID of the person this note relates to' },
			{ displayName: 'Job Order ID', name: 'jobOrder', type: 'number', default: 0 },
			{ displayName: 'Custom Fields (JSON)', name: 'customFields', type: 'json', default: '{}' },
		],
	},

	// Search
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'options',
		displayOptions: { show: { resource: ['note'], operation: ['getAll'] } },
		options: [
			{
				name: 'Lucene (Full-Text Search)',
				value: 'search',
				description: 'Search indexed fields using Lucene syntax (e.g. comments:test)',
			},
			{
				name: 'SQL Query (Filter by Any Field)',
				value: 'query',
				description: 'Filter by any field using SQL-style WHERE clause (e.g. personReference.id=6055)',
			},
		],
		default: 'search',
	},
	{
		displayName: 'Search Query (Lucene)',
		name: 'queryString',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['note'], operation: ['getAll'], searchType: ['search'] } },
		default: 'isDeleted:0',
		description: 'Lucene query syntax (e.g. "action:\\"Phone Call\\"" or "comments:test")',
	},
	{
		displayName: 'Where Clause (SQL)',
		name: 'queryString',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['note'], operation: ['getAll'], searchType: ['query'] } },
		default: 'isDeleted=false',
		description: 'SQL-style WHERE clause (e.g. "personReference.id=6055" or "personReference.id=6055 AND isDeleted=false")',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: { resource: ['note'], operation: ['getAll'] } },
		default: false,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { resource: ['note'], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
	},
];
