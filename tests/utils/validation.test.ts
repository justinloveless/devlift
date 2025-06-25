import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Create manual mocks
const mockPathExistsSync = jest.fn() as jest.MockedFunction<any>;
const mockStatSync = jest.fn() as jest.MockedFunction<any>;
const mockPathResolve = jest.fn() as jest.MockedFunction<any>;

// Mock fs-extra and path modules before importing
jest.unstable_mockModule('fs-extra', () => ({
    default: {
        pathExistsSync: mockPathExistsSync,
        statSync: mockStatSync
    }
}));

jest.unstable_mockModule('path', () => ({
    default: {
        resolve: mockPathResolve
    }
}));

// Import validation functions after mocking
const { isValidGitUrl, isValidLocalPath, getInputType } = await import('../../src/utils/validation.js');

describe('Validation Utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

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

    describe('isValidLocalPath', () => {
        it('should return true for valid existing directories', () => {
            const testPath = '/existing/directory';
            const resolvedPath = '/resolved/existing/directory';

            mockPathResolve.mockReturnValue(resolvedPath);
            mockPathExistsSync.mockReturnValue(true);
            mockStatSync.mockReturnValue({ isDirectory: () => true });

            expect(isValidLocalPath(testPath)).toBe(true);
            expect(mockPathResolve).toHaveBeenCalledWith(testPath);
            expect(mockPathExistsSync).toHaveBeenCalledWith(resolvedPath);
            expect(mockStatSync).toHaveBeenCalledWith(resolvedPath);
        });

        it('should return false for non-existent paths', () => {
            const testPath = '/non/existent/path';
            const resolvedPath = '/resolved/non/existent/path';

            mockPathResolve.mockReturnValue(resolvedPath);
            mockPathExistsSync.mockReturnValue(false);

            expect(isValidLocalPath(testPath)).toBe(false);
            expect(mockPathResolve).toHaveBeenCalledWith(testPath);
            expect(mockPathExistsSync).toHaveBeenCalledWith(resolvedPath);
            expect(mockStatSync).not.toHaveBeenCalled();
        });

        it('should return false for files (not directories)', () => {
            const testPath = '/existing/file.txt';
            const resolvedPath = '/resolved/existing/file.txt';

            mockPathResolve.mockReturnValue(resolvedPath);
            mockPathExistsSync.mockReturnValue(true);
            mockStatSync.mockReturnValue({ isDirectory: () => false });

            expect(isValidLocalPath(testPath)).toBe(false);
            expect(mockStatSync).toHaveBeenCalledWith(resolvedPath);
        });

        it('should return false when path operations throw errors', () => {
            const testPath = '/problematic/path';

            mockPathResolve.mockImplementation(() => {
                throw new Error('Access denied');
            });

            expect(isValidLocalPath(testPath)).toBe(false);
        });
    });

    describe('getInputType', () => {
        it('should return "url" for valid Git URLs', () => {
            expect(getInputType('https://github.com/user/repo.git')).toBe('url');
            expect(getInputType('git@github.com:user/repo.git')).toBe('url');
        });

        it('should return "path" for valid local directories', () => {
            const testPath = '/existing/directory';
            const resolvedPath = '/resolved/existing/directory';

            mockPathResolve.mockReturnValue(resolvedPath);
            mockPathExistsSync.mockReturnValue(true);
            mockStatSync.mockReturnValue({ isDirectory: () => true });

            expect(getInputType(testPath)).toBe('path');
        });

        it('should return "invalid" for neither URL nor path', () => {
            const testInput = 'not-a-valid-input';
            const resolvedPath = '/resolved/not-a-valid-input';

            mockPathResolve.mockReturnValue(resolvedPath);
            mockPathExistsSync.mockReturnValue(false);

            expect(getInputType(testInput)).toBe('invalid');
        });

        it('should prioritize URL over path when both could be valid', () => {
            // This is a theoretical case - in practice this shouldn't happen
            // but it tests the precedence logic
            const input = 'https://github.com/user/repo.git';

            expect(getInputType(input)).toBe('url');
            // Path checking should not be called if URL is valid
            expect(mockPathResolve).not.toHaveBeenCalled();
        });
    });
}); 