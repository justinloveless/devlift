import fs from 'fs-extra';
import path from 'path';

/**
 * Validates if the given string is a valid Git URL (HTTPS or SSH).
 * @param url - The URL to validate.
 * @returns True if the URL is a valid Git URL, false otherwise.
 */
export function isValidGitUrl(url: string): boolean {
    const gitUrlRegex = /^(https|git)(:\/\/|@)([^/:]+)[\/:]([^/:]+)\/([^/:]+)(\.git)?$/;
    return gitUrlRegex.test(url);
}

/**
 * Validates if the given string is a valid local directory path.
 * @param dirPath - The directory path to validate.
 * @returns True if the path exists and is a directory, false otherwise.
 */
export function isValidLocalPath(dirPath: string): boolean {
    try {
        const resolvedPath = path.resolve(dirPath);
        return fs.pathExistsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory();
    } catch {
        return false;
    }
}

/**
 * Determines if the input is a Git URL or a local path.
 * @param input - The input string to analyze.
 * @returns 'url' if it's a Git URL, 'path' if it's a local path, or 'invalid' if neither.
 */
export function getInputType(input: string): 'url' | 'path' | 'invalid' {
    if (isValidGitUrl(input)) {
        return 'url';
    }
    if (isValidLocalPath(input)) {
        return 'path';
    }
    return 'invalid';
} 