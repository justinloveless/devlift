import { Config } from './config.js';

const SUPPORTED_VERSION = '1';
const VALID_STEP_TYPES = [
    'package-manager',
    'shell',
    'docker-compose',
    'docker',
    'database',
    'service',
    'choice'
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

            // Validate choice-specific fields
            if (step.type === 'choice') {
                if (!step.prompt) {
                    throw new Error(`Choice step "${step.name}" is missing required field: prompt`);
                }
                if (!step.choices || !Array.isArray(step.choices)) {
                    throw new Error(`Choice step "${step.name}" is missing required field: choices`);
                }
                if (step.choices.length === 0) {
                    throw new Error(`Choice step "${step.name}" must have at least one choice`);
                }

                // Validate each choice
                for (const choice of step.choices) {
                    if (!choice.name) {
                        throw new Error(`Choice in step "${step.name}" is missing required field: name`);
                    }
                    if (!choice.value) {
                        throw new Error(`Choice in step "${step.name}" is missing required field: value`);
                    }
                    if (choice.actions && Array.isArray(choice.actions)) {
                        // Recursively validate actions within choices
                        validateSteps(choice.actions);
                    }
                }
            }
        }
    }

    // Validate post_setup actions if they exist
    if (config.post_setup) {
        validatePostSetupActions(config.post_setup);
    }
}

function validateSteps(steps: any[]): void {
    for (const step of steps) {
        for (const field of REQUIRED_STEP_FIELDS) {
            if (!step[field as keyof typeof step]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (!VALID_STEP_TYPES.includes(step.type)) {
            throw new Error(`Invalid step type: ${step.type}`);
        }

        // Validate choice-specific fields
        if (step.type === 'choice') {
            if (!step.prompt) {
                throw new Error(`Choice step "${step.name}" is missing required field: prompt`);
            }
            if (!step.choices || !Array.isArray(step.choices)) {
                throw new Error(`Choice step "${step.name}" is missing required field: choices`);
            }
            if (step.choices.length === 0) {
                throw new Error(`Choice step "${step.name}" must have at least one choice`);
            }

            // Validate each choice
            for (const choice of step.choices) {
                if (!choice.name) {
                    throw new Error(`Choice in step "${step.name}" is missing required field: name`);
                }
                if (!choice.value) {
                    throw new Error(`Choice in step "${step.name}" is missing required field: value`);
                }
                if (choice.actions && Array.isArray(choice.actions)) {
                    // Recursively validate actions within choices
                    validateSteps(choice.actions);
                }
            }
        }
    }
}

function validatePostSetupActions(actions: any[]): void {
    const VALID_POST_SETUP_TYPES = ['message', 'open', 'choice'];

    for (const action of actions) {
        if (!action.type) {
            throw new Error('Post-setup action is missing required field: type');
        }

        if (!VALID_POST_SETUP_TYPES.includes(action.type)) {
            throw new Error(`Invalid post-setup action type: ${action.type}`);
        }

        // Validate choice-specific fields in post_setup
        if (action.type === 'choice') {
            if (!action.prompt) {
                throw new Error('Post-setup choice action is missing required field: prompt');
            }
            if (!action.choices || !Array.isArray(action.choices)) {
                throw new Error('Post-setup choice action is missing required field: choices');
            }
            if (action.choices.length === 0) {
                throw new Error('Post-setup choice action must have at least one choice');
            }

            // Validate each choice in post_setup
            for (const choice of action.choices) {
                if (!choice.name) {
                    throw new Error('Choice in post-setup action is missing required field: name');
                }
                if (!choice.value) {
                    throw new Error('Choice in post-setup action is missing required field: value');
                }
                if (choice.actions && Array.isArray(choice.actions)) {
                    // Recursively validate actions within post_setup choices
                    validatePostSetupActions(choice.actions);
                }
            }
        }
    }
} 