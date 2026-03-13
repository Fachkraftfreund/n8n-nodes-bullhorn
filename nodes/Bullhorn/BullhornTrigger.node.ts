import {
	IPollFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

import { bullhornApiRequest } from './GenericFunctions';

export class BullhornTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bullhorn Trigger',
		name: 'bullhornTrigger',
		icon: 'file:bullhorn.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["entityNames"].join(", ")}}',
		description: 'Triggers on Bullhorn entity events (create, update, delete) via polling',
		defaults: { name: 'Bullhorn Trigger' },
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'bullhornApi',
				required: true,
			},
		],
		polling: true,
		properties: [
			{
				displayName: 'Entity Names',
				name: 'entityNames',
				type: 'multiOptions',
				required: true,
				options: [
					{ name: 'Appointment', value: 'Appointment' },
					{ name: 'Candidate', value: 'Candidate' },
					{ name: 'Client Contact', value: 'ClientContact' },
					{ name: 'Client Corporation', value: 'ClientCorporation' },
					{ name: 'Job Order', value: 'JobOrder' },
					{ name: 'Job Submission', value: 'JobSubmission' },
					{ name: 'Lead', value: 'Lead' },
					{ name: 'Note', value: 'Note' },
					{ name: 'Opportunity', value: 'Opportunity' },
					{ name: 'Placement', value: 'Placement' },
					{ name: 'Task', value: 'Task' },
				],
				default: ['Candidate'],
				description: 'Entity types to subscribe to',
			},
			{
				displayName: 'Event Types',
				name: 'eventTypes',
				type: 'multiOptions',
				required: true,
				options: [
					{ name: 'Inserted', value: 'INSERTED' },
					{ name: 'Updated', value: 'UPDATED' },
					{ name: 'Deleted', value: 'DELETED' },
				],
				default: ['INSERTED', 'UPDATED'],
				description: 'Types of events to listen for',
			},
			{
				displayName: 'Max Events Per Poll',
				name: 'maxEvents',
				type: 'number',
				default: 100,
				typeOptions: { minValue: 1, maxValue: 500 },
				description: 'Maximum number of events to retrieve per poll cycle',
			},
			{
				displayName: 'Deduplicate Events',
				name: 'deduplicateEvents',
				type: 'boolean',
				default: true,
				description: 'Whether to keep only the latest event per entity and event type, removing duplicates from the same poll cycle',
			},
			{
				displayName: 'Updated Field',
				name: 'updatedField',
				type: 'string',
				default: '',
				description: 'Optional field name filter. When set, the trigger only fires for events where this field appears in updatedProperties',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const staticData = this.getWorkflowStaticData('node');
		const entityNames = this.getNodeParameter('entityNames') as string[];
		const eventTypes = this.getNodeParameter('eventTypes') as string[];
		const maxEvents = this.getNodeParameter('maxEvents', 100) as number;

		// Build a deterministic subscription ID from workflow + node
		const workflowId = this.getWorkflow().id;
		const subscriptionId = `n8n_${workflowId}`.replace(/[^a-zA-Z0-9_]/g, '_');

		// Check if subscription needs to be (re)created
		let needsSubscription = !staticData.subscriptionCreated;

		if (!needsSubscription) {
			// Detect config changes
			const prevEntities = (staticData.entityNames as string[]) || [];
			const prevEvents = (staticData.eventTypes as string[]) || [];
			if (
				JSON.stringify([...prevEntities].sort()) !== JSON.stringify([...entityNames].sort()) ||
				JSON.stringify([...prevEvents].sort()) !== JSON.stringify([...eventTypes].sort())
			) {
				needsSubscription = true;
			}
		}

		if (needsSubscription) {
			try {
				// Delete existing subscription first (ignoring errors if it doesn't exist)
				try {
					await bullhornApiRequest.call(
						this,
						'DELETE',
						`event/subscription/${subscriptionId}`,
					);
				} catch {
					// Subscription may not exist — that's fine
				}

				// Create new subscription
				await bullhornApiRequest.call(
					this,
					'PUT',
					`event/subscription/${subscriptionId}`,
					undefined,
					{
						type: 'entity',
						names: entityNames.join(','),
						eventTypes: eventTypes.join(','),
					},
				);
				staticData.subscriptionCreated = true;
				staticData.entityNames = entityNames;
				staticData.eventTypes = eventTypes;
			} catch {
				// Subscription creation failed — will retry next poll
				return null;
			}
		}

		// Poll for events
		try {
			const response = await bullhornApiRequest.call(
				this,
				'GET',
				`event/subscription/${subscriptionId}`,
				undefined,
				{ maxEvents },
			);

			const events = (response.events as IDataObject[]) || [];

			if (events.length === 0) {
				return null;
			}

			const deduplicateEvents = this.getNodeParameter('deduplicateEvents', true) as boolean;
			const updatedField = (this.getNodeParameter('updatedField', '') as string).trim();
			let processedEvents = events;

			if (deduplicateEvents) {
				// Keep only the latest event per entity+eventType combo
				const latestByKey = new Map<string, IDataObject>();
				for (const event of events) {
					const key = `${event.entityName}_${event.entityId}_${event.eventType}`;
					const existing = latestByKey.get(key);
					if (!existing || (event.eventTimestamp as number) > (existing.eventTimestamp as number)) {
						latestByKey.set(key, event);
					}
				}
				processedEvents = Array.from(latestByKey.values());
			}

			if (updatedField !== '') {
				const normalizedUpdatedField = updatedField.toLowerCase();
				processedEvents = processedEvents.filter((event) => {
					const updatedPropertiesRaw = event.updatedProperties;
					const updatedProperties = Array.isArray(updatedPropertiesRaw)
						? (updatedPropertiesRaw as string[])
						: typeof updatedPropertiesRaw === 'string'
							? updatedPropertiesRaw.split(',').map((value) => value.trim()).filter((value) => value !== '')
							: [];

					return updatedProperties.some(
						(field) => typeof field === 'string' && field.toLowerCase() === normalizedUpdatedField,
					);
				});
			}

			if (processedEvents.length === 0) {
				return null;
			}

			const returnData: INodeExecutionData[] = processedEvents.map((event) => ({
				json: {
					eventType: event.eventType,
					entityName: event.entityName,
					entityId: event.entityId,
					eventId: event.eventId,
					updatedProperties: event.updatedProperties || [],
					eventTimestamp: event.eventTimestamp,
					eventMetadata: event.eventMetadata || {},
					...event,
				},
			}));

			return [returnData];
		} catch (error) {
			// If subscription expired or not found, reset and recreate on next poll
			const msg = (error as Error).message || '';
			if (msg.includes('404') || msg.toLowerCase().includes('subscription')) {
				staticData.subscriptionCreated = false;
			}
			return null;
		}
	}
}
