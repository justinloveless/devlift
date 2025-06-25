import { isValidGitUrl } from '../../src/utils/validation.js';
import { describe, it, expect } from '@jest/globals';

describe('isValidGitUrl', () => {
    it('should return true for valid HTTPS Git URLs', () => {
        expect(isValidGitUrl('https://github.com/user/repo.git')).toBe(true);
        expect(isValidGitUrl('https://gitlab.com/user/project')).toBe(true);
        expect(isValidGitUrl('https://bitbucket.org/user/repository.git')).toBe(true);
    });

    it('should return true for valid SSH Git URLs', () => {
        expect(isValidGitUrl('git@github.com:user/repo.git')).toBe(true);
        expect(isValidGitUrl('git@gitlab.com:user/project.git')).toBe(true);
        expect(isValidGitUrl('git@bitbucket.org:user/repository.git')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
        expect(isValidGitUrl('not-a-url')).toBe(false);
        expect(isValidGitUrl('http://example.com')).toBe(false);
        expect(isValidGitUrl('')).toBe(false);
        expect(isValidGitUrl('ftp://github.com/user/repo.git')).toBe(false);
    });
}); 