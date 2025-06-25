const SUPPORTED_VERSION = '1';
const VALID_STEP_TYPES = ['package-manager', 'shell'];
const REQUIRED_STEP_FIELDS = ['name', 'type'];

export function validateConfig(config) {
    if (!config.version) {
        throw new Error('Missing required field: version');
    }

    if (config.version !== SUPPORTED_VERSION) {
        throw new Error(`Unsupported configuration version: ${config.version}`);
    }

    if (config.setup_steps) {
        for (const step of config.setup_steps) {
            for (const field of REQUIRED_STEP_FIELDS) {
                if (!step[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            if (!VALID_STEP_TYPES.includes(step.type)) {
                throw new Error(`Invalid step type: ${step.type}`);
            }
        }
    }
} 