import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Loads and parses the dev.yml configuration file from a given directory.
 * @param {string} directory - The directory to search for the dev.yml file.
 * @returns {object | null} The parsed configuration object, or null if the file doesn't exist.
 */
export function loadConfig(directory) {
    const configPath = path.join(directory, 'dev.yml');

    if (!fs.existsSync(configPath)) {
        // In a real scenario, we might want to throw an error or handle this differently.
        // For now, returning null for the test case.
        return null;
    }

    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents);

    return config;
}

const SUPPORTED_VERSIONS = ['1'];
const SUPPORTED_STEP_TYPES = ['shell'];

/**
 * Validates the configuration object.
 * @param {object} config - The configuration object to validate.
 */
export function validateConfig(config) {
    if (!SUPPORTED_VERSIONS.includes(config.version)) {
        throw new Error('Unsupported configuration version');
    }

    if (config.setup) {
        for (const step of config.setup) {
            if (!SUPPORTED_STEP_TYPES.includes(step.type)) {
                throw new Error(`Invalid step type: ${step.type}`);
            }
        }
    }
} 