/**
 * Validates if the given string is a valid Git URL (HTTPS or SSH).
 * @param {string} url - The URL to validate.
 * @returns {boolean} - True if the URL is a valid Git URL, false otherwise.
 */
export function isValidGitUrl(url) {
    const gitUrlRegex = /^(https|git)(:\/\/|@)([^/:]+)[\/:]([^/:]+)\/([^/:]+)(\.git)?$/;
    return gitUrlRegex.test(url);
} 