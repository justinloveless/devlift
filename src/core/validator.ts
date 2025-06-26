import { Config } from './config.js';

const SUPPORTED_VERSION = '1';
const VALID_STEP_TYPES = [
    'package-manager',
    'shell',
    'docker-compose',
    'docker',
    'database',
    'service'
];
const REQUIRED_STEP_FIELDS = ['name', 'type'];

export function validateConfig(config: Config): void {
    if (!config.version) {
        throw new Error('Missing required field: version');
    }

    if (config.version !== SUPPORTED_VERSION) {
        throw new Error(`Unsupported configuration version: ${config.version}`);
    }

    // Handle both 'setup' and 'setup_steps' for backward compatibility
    const steps = (config as any).setup || config.setup_steps;

    if (steps) {
        for (const step of steps) {
            for (const field of REQUIRED_STEP_FIELDS) {
                if (!step[field as keyof typeof step]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            if (!VALID_STEP_TYPES.includes(step.type)) {
                throw new Error(`Invalid step type: ${step.type}`);
            }
        }
    }
} 