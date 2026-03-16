import { INodeProperties } from 'n8n-workflow';

export const candidateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['candidate'] } },
		options: [
			{ name: 'Create', value: 'create', description: 'Create a candidate', action: 'Create a candidate' },
			{ name: 'Delete', value: 'delete', description: 'Delete a candidate', action: 'Delete a candidate' },
			{ name: 'Get', value: 'get', description: 'Get a candidate', action: 'Get a candidate' },
			{ name: 'Get File', value: 'getFile', description: 'Download a file attachment (e.g. CV)', action: 'Download a candidate file' },
			{ name: 'Get Files', value: 'getFiles', description: 'List all file attachments', action: 'List candidate files' },
			{ name: 'Get Many', value: 'getAll', description: 'Get many candidates', action: 'Get many candidates' },
			{ name: 'Update', value: 'update', description: 'Update a candidate', action: 'Update a candidate' },
		],
		default: 'get',
	},
];

export const candidateFields: INodeProperties[] = [
	// ------ ID (get / update / delete) ------
	{
		displayName: 'Candidate ID',
		name: 'entityId',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['candidate'], operation: ['get', 'update', 'delete'] } },
		default: 0,
		description: 'The ID of the candidate',
	},

	// ------ Get Files / Get File: candidate ID ------
	{
		displayName: 'Candidate ID',
		name: 'candidateFileEntityId',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['candidate'], operation: ['getFiles', 'getFile'] } },
		default: 0,
		description: 'The ID of the candidate',
	},
	// ------ Get Files: optional file type filter ------
	{
		displayName: 'File Type',
		name: 'fileType',
		type: 'options',
		displayOptions: { show: { resource: ['candidate'], operation: ['getFiles'] } },
		default: '',
		description: 'Optionally filter files by type',
		options: [
			{ name: 'All', value: '' },
			{ name: 'Resume', value: 'Resume' },
			{ name: 'Cover Letter', value: 'Cover Letter' },
			{ name: 'Portfolio', value: 'Portfolio' },
			{ name: 'Reference', value: 'Reference' },
			{ name: 'Right to Represent', value: 'Right to Represent' },
			{ name: 'Other', value: 'Other' },
		],
	},

	// ------ Get File: file ID ------
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['candidate'], operation: ['getFile'] } },
		default: 0,
		description: 'The ID of the file to download (get IDs from the "Get Files" operation)',
	},

	// ------ Fields to return (get / getAll) ------
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		displayOptions: { show: { resource: ['candidate'], operation: ['get', 'getAll'] } },
		default: 'id,firstName,lastName,email,status',
		description: 'Comma-separated list of fields to return. Available fields: id, address, businessSectors, candidateSource, category, categories, certifications, comments, companyName, companyURL, dateAdded, dateAvailable, dateAvailableEnd, dateI9Expiration, dateLastComment, dateLastModified, dateNextCall, dateOfBirth, dayRate, dayRateLow, degreeList, description, desiredLocations, disability, educationDegree, email, email2, email3, employeeType, employmentPreference, ethnicity, experience, externalID, fax, fax2, fax3, firstName, gender, hourlyRate, hourlyRateLow, i9OnFile, interviews, isDeleted, lastName, leads, mobile, name, namePrefix, nameSuffix, nickName, numCategories, numOwners, occupation, owner, pager, paperWorkOnFile, phone, phone2, phone3, placements, preferredContact, primarySkills, recentClientList, referredBy, referredByPerson, salary, salaryLow, secondaryAddress, secondaryOwners, secondarySkills, sendouts, skillSet, smsOptIn, source, specialties, status, submissions, tasks, timeZoneOffsetEST, travelLimit, travelMethod, type, username, veteran, webResponses, willRelocate, workAuthorized, workPhone, plus customDate1-13, customFloat1-23, customInt1-23, customText1-40, customTextBlock1-10.',
	},

	// ------ Create: required fields ------
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['candidate'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['candidate'], operation: ['create'] } },
		default: '',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['candidate'], operation: ['create'] } },
		default: '',
		description: 'Full name (Bullhorn requires this alongside firstName/lastName)',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['candidate'], operation: ['create'] } },
		default: 'New Lead',
		description: 'e.g. "New Lead", "Active", "Placed"',
	},

	// ------ Create / Update: additional fields ------
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: { show: { resource: ['candidate'], operation: ['create', 'update'] } },
		default: {},
		options: [
			{ displayName: 'Email', name: 'email', type: 'string', default: '' },
			{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
			{ displayName: 'Mobile', name: 'mobile', type: 'string', default: '' },
			{ displayName: 'Address 1', name: 'address1', type: 'string', default: '' },
			{ displayName: 'City', name: 'city', type: 'string', default: '' },
			{ displayName: 'State', name: 'state', type: 'string', default: '' },
			{ displayName: 'Zip', name: 'zip', type: 'string', default: '' },
			{ displayName: 'Occupation', name: 'occupation', type: 'string', default: '', description: 'Current occupation or job title' },
			{ displayName: 'Source', name: 'source', type: 'string', default: '', description: 'Candidate source' },
			{ displayName: 'Category ID', name: 'category', type: 'number', default: 0 },
			{ displayName: 'Owner ID', name: 'owner', type: 'number', default: 0, description: 'CorporateUser ID of the owner' },
			{
				displayName: 'Custom Fields (JSON)',
				name: 'customFields',
				type: 'json',
				default: '{}',
				description: 'Additional fields as a JSON object, merged into the request body',
			},
		],
	},

	// ------ Get All: search options ------
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'hidden',
		displayOptions: { show: { resource: ['candidate'], operation: ['getAll'] } },
		default: 'search',
	},
	{
		displayName: 'Search Query (Lucene)',
		name: 'queryString',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['candidate'], operation: ['getAll'] } },
		default: 'isDeleted:false',
		description: 'Lucene query syntax (e.g. "firstName:John AND status:Active")',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: { resource: ['candidate'], operation: ['getAll'] } },
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: { show: { resource: ['candidate'], operation: ['getAll'], returnAll: [false] } },
		typeOptions: { minValue: 1, maxValue: 500 },
		default: 50,
	},
];
