import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	NodeOperationError,
} from 'n8n-workflow';

import { bullhornApiRequest, bullhornApiRequestAllItems, getCustomFieldsMeta } from './GenericFunctions';

import { candidateOperations, candidateFields } from './descriptions/CandidateDescription';
import { jobOrderOperations, jobOrderFields } from './descriptions/JobOrderDescription';
import { jobSubmissionOperations, jobSubmissionFields } from './descriptions/JobSubmissionDescription';
import { placementOperations, placementFields } from './descriptions/PlacementDescription';
import { clientContactOperations, clientContactFields } from './descriptions/ClientContactDescription';
import { clientCorporationOperations, clientCorporationFields } from './descriptions/ClientCorporationDescription';
import { noteOperations, noteFields } from './descriptions/NoteDescription';
import { leadOperations, leadFields } from './descriptions/LeadDescription';
import { opportunityOperations, opportunityFields } from './descriptions/OpportunityDescription';
import { appointmentOperations, appointmentFields } from './descriptions/AppointmentDescription';
import { taskOperations, taskFields } from './descriptions/TaskDescription';

// Map of n8n resource names → Bullhorn PascalCase entity names
const ENTITY_MAP: Record<string, string> = {
	candidate: 'Candidate',
	jobOrder: 'JobOrder',
	jobSubmission: 'JobSubmission',
	placement: 'Placement',
	clientContact: 'ClientContact',
	clientCorporation: 'ClientCorporation',
	note: 'Note',
	lead: 'Lead',
	opportunity: 'Opportunity',
	appointment: 'Appointment',
	task: 'Task',
};

// Required fields per resource for the Create operation.
// These are the field names as they appear in the n8n parameter definitions.
const REQUIRED_CREATE_FIELDS: Record<string, string[]> = {
	candidate: ['firstName', 'lastName', 'name', 'status'],
	jobOrder: ['title', 'clientCorporation', 'clientContact', 'status'],
	jobSubmission: ['candidate', 'jobOrder', 'status'],
	placement: ['candidate', 'jobOrder', 'status', 'dateBegin', 'payRate', 'clientBillRate'],
	clientContact: ['firstName', 'lastName', 'clientCorporation', 'name', 'status'],
	clientCorporation: ['name', 'status'],
	note: ['action', 'comments'],
	lead: ['firstName', 'lastName', 'name'],
	opportunity: ['title', 'clientCorporation', 'status'],
	appointment: ['subject', 'dateBegin', 'dateEnd'],
	task: ['subject'],
};

// Entities where Bullhorn enforces a unique association constraint even on soft-deleted records.
// Attempting to create when a deleted record exists for the same key fields returns
// IMPROPERLY_STRUCTURED_ASSOCIATION (HTTP 500). The fix is to restore+update the deleted record.
// Key = n8n resource name → association fields that form the unique key.
const RESTORE_ON_CONFLICT: Record<string, string[]> = {
	jobSubmission: ['candidate', 'jobOrder'],
	placement: ['candidate', 'jobOrder'],
};

// Fields that reference other entities and must be sent as { id: value }
const ENTITY_REF_FIELDS = new Set([
	'clientCorporation', 'clientContact', 'candidate', 'jobOrder', 'jobSubmission',
	'owner', 'sendingUser', 'personReference', 'candidateReference', 'category',
]);

// Fields that must be nested inside an `address` object for the Bullhorn API
const ADDRESS_FIELDS = new Set(['address1', 'address2', 'city', 'state', 'zip', 'countryID']);

// Collect all dateTime field names from the entity descriptions automatically,
// so any new dateTime field added to a description is picked up without changes here.
function collectDateTimeFields(...propArrays: INodeProperties[][]): Set<string> {
	const names = new Set<string>();
	for (const props of propArrays) {
		for (const prop of props) {
			if (prop.type === 'dateTime') names.add(prop.name);
			if (Array.isArray(prop.options)) {
				for (const opt of prop.options) {
					if ('type' in opt && (opt as INodeProperties).type === 'dateTime') {
						names.add((opt as INodeProperties).name);
					}
				}
			}
		}
	}
	return names;
}

const DATE_FIELDS = collectDateTimeFields(
	candidateFields, jobOrderFields, jobSubmissionFields, placementFields,
	clientContactFields, clientCorporationFields, noteFields, leadFields,
	opportunityFields, appointmentFields, taskFields,
);

/**
 * Convert a date value (ISO string or existing timestamp) to a Bullhorn
 * millisecond-epoch timestamp. Uses noon UTC to avoid timezone edge cases.
 */
function toBullhornTimestamp(value: unknown): number | null {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value === 'number') return value;
	const str = String(value);
	const dateOnly = str.split('T')[0];
	const [year, month, day] = dateOnly.split('-').map(Number);
	if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
	return Date.UTC(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Wrap an ID value as a Bullhorn entity reference: { id: <number> }
 */
function toEntityRef(value: unknown): IDataObject {
	if (typeof value === 'number' && value > 0) {
		return { id: value };
	}
	return value as IDataObject;
}

/**
 * Build request body from required fields + additionalFields + customFields.
 */
function buildBody(
	context: IExecuteFunctions,
	resource: string,
	index: number,
	includeRequired: boolean,
): IDataObject {
	const body: IDataObject = {};

	// Collect required fields for create
	if (includeRequired) {
		const requiredFields = REQUIRED_CREATE_FIELDS[resource] || [];
		for (const field of requiredFields) {
			const value = context.getNodeParameter(field, index);
			if (ENTITY_REF_FIELDS.has(field)) {
				body[field] = toEntityRef(value);
			} else if (DATE_FIELDS.has(field)) {
				const ts = toBullhornTimestamp(value);
				if (ts !== null) body[field] = ts;
			} else {
				body[field] = value as IDataObject;
			}
		}
	}

	// For updates, collect top-level fields that are shown in the UI but not in additionalFields
	// (e.g. status is a required create field that is also editable during updates)
	if (!includeRequired) {
		const UPDATE_FIELDS: Record<string, string[]> = {
			jobOrder: ['title', 'status'],
			candidate: ['status'],
			jobSubmission: ['status'],
			placement: ['status'],
			clientContact: ['status'],
			clientCorporation: ['status'],
			opportunity: ['status'],
		};
		const updateFields = UPDATE_FIELDS[resource] || [];
		for (const field of updateFields) {
			try {
				const value = context.getNodeParameter(field, index, undefined);
				if (value !== undefined && value !== '' && value !== null) {
					body[field] = value as IDataObject;
				}
			} catch {
				// Field not displayed for this operation — skip
			}
		}
	}

	// Collect additional fields
	const additionalFields = context.getNodeParameter('additionalFields', index, {}) as IDataObject;
	let customFieldsRaw: string | undefined;

	const addressFields: IDataObject = {};

	for (const [key, value] of Object.entries(additionalFields)) {
		if (key === 'customFields') {
			customFieldsRaw = value as string;
			continue;
		}
		if (value === '' || value === 0 || value === undefined || value === null) continue;

		if (ADDRESS_FIELDS.has(key)) {
			addressFields[key] = value;
		} else if (ENTITY_REF_FIELDS.has(key)) {
			body[key] = toEntityRef(value);
		} else if (DATE_FIELDS.has(key)) {
			const ts = toBullhornTimestamp(value);
			if (ts !== null) body[key] = ts;
		} else {
			body[key] = value as IDataObject;
		}
	}

	// Nest address fields under `address` as required by the Bullhorn API
	if (Object.keys(addressFields).length > 0) {
		body.address = addressFields;
	}

	// Merge custom fields JSON (from additionalFields)
	if (customFieldsRaw && customFieldsRaw !== '{}') {
		try {
			const custom = JSON.parse(customFieldsRaw) as IDataObject;
			for (const [k, v] of Object.entries(custom)) {
				if (/^customDate/i.test(k)) {
					const ts = toBullhornTimestamp(v);
					if (ts !== null) body[k] = ts;
				} else {
					body[k] = v as IDataObject;
				}
			}
		} catch {
			// Ignore malformed JSON — will be caught at runtime
		}
	}

	// Merge custom fields from the dynamic dropdown (customFieldValues fixedCollection)
	const customFieldValues = context.getNodeParameter('customFieldValues', index, {}) as IDataObject;
	if (customFieldValues.field) {
		const fieldEntries = customFieldValues.field as IDataObject[];
		for (const entry of fieldEntries) {
			const fieldName = entry.fieldName as string;
			const fieldValue = entry.fieldValue;
			if (fieldName && fieldValue != null && fieldValue !== '') {
				if (/^customDate/i.test(fieldName)) {
					const ts = toBullhornTimestamp(fieldValue);
					if (ts !== null) body[fieldName] = ts;
				} else {
					// Auto-coerce to number if applicable
					const strVal = String(fieldValue);
					const numVal = Number(strVal);
					if (!isNaN(numVal) && strVal.trim() !== '') {
						body[fieldName] = numVal;
					} else {
						body[fieldName] = fieldValue;
					}
				}
			}
		}
	}

	return body;
}

export class Bullhorn implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bullhorn',
		name: 'bullhorn',
		icon: 'file:bullhorn.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Bullhorn CRM API',
		defaults: { name: 'Bullhorn' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'bullhornApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Appointment', value: 'appointment' },
					{ name: 'Candidate', value: 'candidate' },
					{ name: 'Client Contact', value: 'clientContact' },
					{ name: 'Client Corporation', value: 'clientCorporation' },
					{ name: 'Job Order', value: 'jobOrder' },
					{ name: 'Job Submission', value: 'jobSubmission' },
					{ name: 'Lead', value: 'lead' },
					{ name: 'Note', value: 'note' },
					{ name: 'Opportunity', value: 'opportunity' },
					{ name: 'Placement', value: 'placement' },
					{ name: 'Task', value: 'task' },
				],
				default: 'candidate',
			},
			// Operations & fields for each resource
			...candidateOperations, ...candidateFields,
			...jobOrderOperations, ...jobOrderFields,
			...jobSubmissionOperations, ...jobSubmissionFields,
			...placementOperations, ...placementFields,
			...clientContactOperations, ...clientContactFields,
			...clientCorporationOperations, ...clientCorporationFields,
			...noteOperations, ...noteFields,
			...leadOperations, ...leadFields,
			...opportunityOperations, ...opportunityFields,
			...appointmentOperations, ...appointmentFields,
			...taskOperations, ...taskFields,

			// Custom Fields — dynamic dropdown from /meta (applies to all resources)
			{
				displayName: 'Custom Fields',
				name: 'customFieldValues',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				displayOptions: { show: { operation: ['create', 'update'] } },
				default: {},
				description: 'Set custom fields by their display name (only shows fields with user-assigned labels)',
				options: [
					{
						displayName: 'Field',
						name: 'field',
						values: [
							{
								displayName: 'Field Name',
								name: 'fieldName',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description: 'Select a custom field',
							},
							{
								displayName: 'Value',
								name: 'fieldValue',
								type: 'string',
								default: '',
								description: 'Value to set',
							},
						],
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const resource = this.getCurrentNodeParameter('resource') as string;
				const entityName = ENTITY_MAP[resource];
				if (!entityName) return [];

				// Collect field names already selected in the customFieldValues fixedCollection
				const alreadySelected = new Set<string>();
				try {
					const current = this.getCurrentNodeParameter('customFieldValues') as IDataObject | undefined;
					if (current?.field) {
						for (const entry of current.field as IDataObject[]) {
							if (entry.fieldName) {
								alreadySelected.add(entry.fieldName as string);
							}
						}
					}
				} catch {
					// Parameter may not exist yet — ignore
				}

				try {
					const fields = await getCustomFieldsMeta.call(this, entityName);
					return fields
						.filter((f) => !alreadySelected.has(f.name))
						.map((f) => ({
							name: `${f.label} (${f.name})`,
							value: f.name,
							description: `Type: ${f.dataType}`,
						}));
				} catch {
					return [];
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const entityName = ENTITY_MAP[resource];
		if (!entityName) {
			throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
		}

		for (let i = 0; i < items.length; i++) {
			try {
				// ---- CREATE ----
				if (operation === 'create') {
					const body = buildBody(this, resource, i, true);
					const restoreKey = RESTORE_ON_CONFLICT[resource];

					if (restoreKey) {
						// Some entities have a unique association constraint that Bullhorn enforces
						// even on soft-deleted records. Query for a deleted record matching the key
						// fields and restore+update it rather than creating a new one.
						const whereParts = restoreKey.map((field) => {
							const ref = body[field] as IDataObject;
							return `${field}.id=${ref.id}`;
						});
						whereParts.push('isDeleted=true');
						const existing = await bullhornApiRequest.call(
							this, 'GET', `query/${entityName}`, undefined,
							{ where: whereParts.join(' AND '), fields: 'id', count: 1 },
						);
						const existingRecords = (existing.data as IDataObject[]) || [];
						if (existingRecords.length > 0) {
							const existingId = (existingRecords[0] as IDataObject).id as number;
							// Association fields are immutable on update — strip them from the body
							const restoreBody: IDataObject = { ...body, isDeleted: false };
							for (const field of restoreKey) delete restoreBody[field];
							const response = await bullhornApiRequest.call(
								this, 'POST', `entity/${entityName}/${existingId}`, restoreBody,
							);
							returnData.push({ json: response, pairedItem: { item: i } });
						} else {
							const response = await bullhornApiRequest.call(
								this, 'PUT', `entity/${entityName}`, body,
							);
							returnData.push({ json: response, pairedItem: { item: i } });
						}
					} else {
						// Bullhorn uses PUT for entity creation
						const response = await bullhornApiRequest.call(
							this, 'PUT', `entity/${entityName}`, body,
						);
						returnData.push({ json: response, pairedItem: { item: i } });
					}

				// ---- GET ----
				} else if (operation === 'get') {
					const entityId = this.getNodeParameter('entityId', i) as number;
					const fields = this.getNodeParameter('fields', i, 'id') as string;
					const response = await bullhornApiRequest.call(
						this, 'GET', `entity/${entityName}/${entityId}`, undefined, { fields },
					);
					// Bullhorn wraps entity in { data: { ... } }
					const data = (response.data as IDataObject) || response;
					returnData.push({ json: data, pairedItem: { item: i } });

				// ---- UPDATE ----
				} else if (operation === 'update') {
					const entityId = this.getNodeParameter('entityId', i) as number;
					const body = buildBody(this, resource, i, false);
					// Bullhorn uses POST for entity update
					const response = await bullhornApiRequest.call(
						this, 'POST', `entity/${entityName}/${entityId}`, body,
					);
					returnData.push({ json: response, pairedItem: { item: i } });

				// ---- DELETE (soft-delete) ----
				} else if (operation === 'delete') {
					const entityId = this.getNodeParameter('entityId', i) as number;
					// Bullhorn soft-deletes via POST with isDeleted: true
					const response = await bullhornApiRequest.call(
						this, 'POST', `entity/${entityName}/${entityId}`, { isDeleted: true },
					);
					returnData.push({ json: response, pairedItem: { item: i } });

				// ---- GET FILES (list attachments) ----
				} else if (operation === 'getFiles') {
					const candidateId = this.getNodeParameter('candidateFileEntityId', i) as number;
					const response = await bullhornApiRequest.call(
						this, 'GET', `entityFiles/${entityName}/${candidateId}`,
					);
					let files = (response.EntityFiles as IDataObject[]) || [];
					const fileType = this.getNodeParameter('fileType', i, '') as string;
					if (fileType) {
						files = files.filter((f) => f.type === fileType);
					}
					if (files.length === 0) {
						returnData.push({ json: { message: 'No files found' }, pairedItem: { item: i } });
					} else {
						returnData.push(
							...files.map((file) => ({ json: file, pairedItem: { item: i } })),
						);
					}

				// ---- GET FILE (download attachment) ----
				} else if (operation === 'getFile') {
					const candidateId = this.getNodeParameter('candidateFileEntityId', i) as number;
					const fileId = this.getNodeParameter('fileId', i) as number;

					// First get file metadata for the filename
					const metaResponse = await bullhornApiRequest.call(
						this, 'GET', `entityFiles/${entityName}/${candidateId}`,
					);
					const files = (metaResponse.EntityFiles as IDataObject[]) || [];
					const fileMeta = files.find((f) => f.id === fileId);
					const fileName = (fileMeta?.name as string) || `file_${fileId}`;
					const contentType = (fileMeta?.contentType as string) || 'application/octet-stream';

					// Download the file (Bullhorn returns JSON with base64-encoded fileContent)
					const fileResponse = await bullhornApiRequest.call(
						this, 'GET', `file/${entityName}/${candidateId}/${fileId}`,
					);
					const fileData = fileResponse.File as IDataObject;
					const fileBuffer = Buffer.from(fileData.fileContent as string, 'base64');

					returnData.push({
						json: fileMeta || { id: fileId },
						binary: {
							data: await this.helpers.prepareBinaryData(fileBuffer, fileName, contentType),
						},
						pairedItem: { item: i },
					});

				// ---- GET ALL (search / query) ----
				} else if (operation === 'getAll') {
					const searchType = this.getNodeParameter('searchType', i) as string;
					const queryString = this.getNodeParameter('queryString', i) as string;
					const fields = this.getNodeParameter('fields', i, 'id') as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					let endpoint: string;
					const qs: IDataObject = { fields };

					if (searchType === 'search') {
						endpoint = `search/${entityName}`;
						qs.query = queryString.trim() || '*';
					} else {
						endpoint = `query/${entityName}`;
						qs.where = queryString.trim() || 'id > 0';
					}

					if (returnAll) {
						const data = await bullhornApiRequestAllItems.call(
							this, 'GET', endpoint, undefined, qs,
						);
						returnData.push(
							...data.map((item) => ({ json: item, pairedItem: { item: i } })),
						);
					} else {
						const limit = this.getNodeParameter('limit', i, 50) as number;
						qs.count = limit;
						const response = await bullhornApiRequest.call(
							this, 'GET', endpoint, undefined, qs,
						);
						const data = (response.data as IDataObject[]) || [];
						returnData.push(
							...data.map((item) => ({ json: item, pairedItem: { item: i } })),
						);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
