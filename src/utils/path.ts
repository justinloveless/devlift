import * as os from 'os';
import path from 'path';
import fs from 'fs-extra';

interface GlobalConfig {
    basePath?: string;
}

function getGlobalConfig(): GlobalConfig {
    const configPath = path.join(os.homedir(), '.devlift', 'config.json');
    if (fs.pathExistsSync(configPath)) {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch (error) {
            return {};
        }
    }
    return {};
}

/**
 * Generates a standardized local path to clone a repository into.
 * @param repoUrl - The Git repository URL.
 * @returns The absolute local path for cloning.
 */
export function getClonePath(repoUrl: string): string {
    // Normalize the URL to remove protocol and .git extension for path creation
    const normalizedUrl = repoUrl
        .replace(/^(https:\/\/|git@)/, '')
        .replace(/\.git$/, '')
        .replace(/:/, '/');

    const config = getGlobalConfig();
    const basePath = config.basePath || path.join(os.homedir(), 'devlift', 'clones');

    return path.join(basePath, normalizedUrl);
} 