import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { validateConfig } from './validator.js';

interface Choice {
    name: string;
    value: string;
    actions: SetupStep[];
}

interface SetupStep {
    name: string;
    type: 'shell' | 'package-manager' | 'choice';
    command?: string;
    depends_on?: string[];
    manager?: string;
    prompt?: string;
    choices?: Choice[];
}

interface ProjectDependency {
    name: string;
    repository: string;
    branch?: string;
    tag?: string;
    path?: string;  // For local dependencies
}

interface PostSetupChoice {
    name: string;
    value: string;
    actions: PostSetupAction[];
}

interface PostSetupAction {
    type: 'message' | 'open' | 'choice';
    content?: string;
    target?: string;
    path?: string;
    prompt?: string;
    choices?: PostSetupChoice[];
}

export interface Config {
    project_name?: string;
    setup_steps?: SetupStep[];
    setup?: SetupStep[];  // For backward compatibility with tests
    version?: string;
    dependencies?: ProjectDependency[];
    post_setup?: PostSetupAction[];
}

/**
 * Configuration file detection result
 */
interface ConfigFileInfo {
    path: string;
    format: 'yaml' | 'json';
}

/**
 * Finds the configuration file in the given directory.
 * Checks for dev.yml, dev.yaml, and dev.json in that order.
 * @param directory - The directory to search for configuration files.
 * @returns ConfigFileInfo if found, null otherwise.
 */
function findConfigFile(directory: string): ConfigFileInfo | null {
    // Priority order: YAML files first, then JSON
    const configFiles = [
        { name: 'dev.yml', format: 'yaml' as const },
        { name: 'dev.yaml', format: 'yaml' as const },
        { name: 'dev.json', format: 'json' as const }
    ];

    for (const { name, format } of configFiles) {
        const configPath = path.join(directory, name);
        if (fs.existsSync(configPath)) {
            return { path: configPath, format };
        }
    }

    return null;
}

/**
 * Loads and parses the dev configuration file from a given directory.
 * Supports both YAML (.yml, .yaml) and JSON (.json) formats.
 * @param directory - The directory to search for the configuration file.
 * @returns The parsed configuration object, or null if no config file exists.
 */
export function loadConfig(directory: string): Config | null {
    const configFile = findConfigFile(directory);

    if (!configFile) {
        return null;
    }

    const fileContents = fs.readFileSync(configFile.path, 'utf8');
    let config: Config;

    try {
        if (configFile.format === 'yaml') {
            config = yaml.load(fileContents) as Config;
        } else {
            config = JSON.parse(fileContents) as Config;
        }
    } catch (error) {
        const formatName = configFile.format.toUpperCase();
        throw new Error(`Failed to parse ${formatName} configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (!config || typeof config !== 'object') {
        throw new Error('Configuration file does not contain a valid object');
    }

    validateConfig(config);

    return config;
}

/**
 * Gets the list of supported configuration file names
 */
export function getSupportedConfigFiles(): string[] {
    return ['dev.yml', 'dev.yaml', 'dev.json'];
}

/**
 * Checks if a configuration file exists in the given directory
 */
export function configExists(directory: string): boolean {
    return findConfigFile(directory) !== null;
}

/**
 * Gets the path and format of the existing config file in a directory
 */
export function getConfigFileInfo(directory: string): ConfigFileInfo | null {
    return findConfigFile(directory);
} 