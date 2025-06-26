import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { validateConfig } from './validator.js';

interface SetupStep {
    name: string;
    type: 'shell' | 'package-manager';
    command: string;
    depends_on?: string[];
    manager?: string;
}

interface ProjectDependency {
    name: string;
    repository: string;
    branch?: string;
    tag?: string;
    path?: string;  // For local dependencies
}

export interface Config {
    project_name?: string;
    setup_steps?: SetupStep[];
    setup?: SetupStep[];  // For backward compatibility with tests
    version?: string;
    dependencies?: ProjectDependency[];
}

/**
 * Loads and parses the dev.yml configuration file from a given directory.
 * @param directory - The directory to search for the dev.yml file.
 * @returns The parsed configuration object, or null if the file doesn't exist.
 */
export function loadConfig(directory: string): Config | null {
    const configPath = path.join(directory, 'dev.yml');

    if (!fs.existsSync(configPath)) {
        // In a real scenario, we might want to throw an error or handle this differently.
        // For now, returning null for the test case.
        return null;
    }

    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents) as Config;

    validateConfig(config);

    return config;
} 