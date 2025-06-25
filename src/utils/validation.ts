/**
 * Validates if the given string is a valid Git URL (HTTPS or SSH).
 * @param url - The URL to validate.
 * @returns True if the URL is a valid Git URL, false otherwise.
 */
export function isValidGitUrl(url: string): boolean {
    const gitUrlRegex = /^(https|git)(:\/\/|@)([^/:]+)[\/:]([^/:]+)\/([^/:]+)(\.git)?$/;
    return gitUrlRegex.test(url);
} 