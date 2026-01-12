export default {
    name: 'Resource',
    type: 'object',
    properties: {
        task_id: {
            type: 'string',
            description: 'Reference to the parent task',
        },
        type: {
            type: 'string',
            enum: ['url', 'text', 'pdf'],
            description: 'Type of resource',
        },
        resource_url: {
            type: 'string',
            description: 'URL for external link resources',
        },
        resource_text: {
            type: 'string',
            description: 'Content for text resources',
        },
        storage_path: {
            type: 'string',
            description: 'Storage path for file resources',
        },
        storage_bucket: {
            type: 'string',
            description: 'Storage bucket name',
        },
    },
    required: ['task_id', 'type'],
};
