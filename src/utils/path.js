import * as os from 'os';
import path from 'path';

/**
 * Generates a standardized local path to clone a repository into.
 * @param {string} repoUrl - The Git repository URL.
 * @returns {string} The absolute local path for cloning.
 */
export function getClonePath(repoUrl) {
    // Normalize the URL to remove protocol and .git extension for path creation
    const normalizedUrl = repoUrl
        .replace(/^(https:\/\/|git@)/, '')
        .replace(/\.git$/, '')
        .replace(/:/, '/');

    const basePath = path.join(os.homedir(), 'dev-cli', 'clones');

    return path.join(basePath, normalizedUrl);
} 