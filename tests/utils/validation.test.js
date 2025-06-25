import { isValidGitUrl } from '../../src/utils/validation.js';

describe('Git URL Validator', () => {
    it('should return true for valid HTTPS URLs', () => {
        expect(isValidGitUrl('https://github.com/user/repo.git')).toBe(true);
        expect(isValidGitUrl('https://gitlab.com/user/repo.git')).toBe(true);
    });

    it('should return true for valid SSH URLs', () => {
        expect(isValidGitUrl('git@github.com:user/repo.git')).toBe(true);
        expect(isValidGitUrl('git@gitlab.com:user/repo.git')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
        expect(isValidGitUrl('ftp://github.com/user/repo.git')).toBe(false);
        expect(isValidGitUrl('not-a-url')).toBe(false);
        expect(isValidGitUrl('https://github.com/user')).toBe(false);
    });
}); 