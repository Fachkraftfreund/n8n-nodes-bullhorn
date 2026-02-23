import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
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
	jobOrder: ['title', 'clientCorporation', 'status'],
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

// Fields that reference other entities and must be sent as { id: value }
const ENTITY_REF_FIELDS = new Set([
	'clientCorporation', 'candidate', 'jobOrder', 'jobSubmission',
	'owner', 'sendingUser', 'personReference', 'candidateReference', 'category',
]);

// Fields that must be nested inside an `address` object for the Bullhorn API
const ADDRESS_FIELDS = new Set(['address1', 'address2', 'city', 'state', 'zip', 'countryID']);

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
			} else {
				body[field] = value as IDataObject;
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
			Object.assign(body, custom);
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
			const fieldValue = entry.fieldValue as string;
			if (fieldName && fieldValue !== undefined && fieldValue !== '') {
				// Auto-coerce to number if applicable
				const numVal = Number(fieldValue);
				if (!isNaN(numVal) && fieldValue.trim() !== '') {
					body[fieldName] = numVal;
				} else {
					body[fieldName] = fieldValue;
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
					// Bullhorn uses PUT for entity creation
					const response = await bullhornApiRequest.call(
						this, 'PUT', `entity/${entityName}`, body,
					);
					returnData.push({ json: response, pairedItem: { item: i } });

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
						qs.query = queryString;
					} else {
						endpoint = `query/${entityName}`;
						qs.where = queryString;
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
