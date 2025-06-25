import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import path from 'path';

// Create manual mocks
const mockPathExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockHomedir = jest.fn();

// Mock the modules before importing the function under test
jest.unstable_mockModule('fs-extra', () => ({
    default: {
        pathExistsSync: mockPathExistsSync,
        readFileSync: mockReadFileSync
    }
}));

jest.unstable_mockModule('os', () => ({
    homedir: mockHomedir
}));

// Import after mocking
const { getClonePath } = await import('../../src/utils/path.js');

describe('getClonePath', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockHomedir.mockReturnValue('/mock/home');
    });

    it('should generate a clone path for HTTPS URLs with default config', () => {
        // No config file exists
        mockPathExistsSync.mockReturnValue(false);

        const repoUrl = 'https://github.com/test-user/test-repo.git';
        const actualPath = getClonePath(repoUrl);

        expect(actualPath).toBe(path.join('/mock/home', 'devlift', 'clones', 'github.com', 'test-user', 'test-repo'));
    });

    it('should handle URLs without .git extension', () => {
        mockPathExistsSync.mockReturnValue(false);

        const repoUrl = 'https://github.com/test-user/test-repo';
        const actualPath = getClonePath(repoUrl);

        expect(actualPath).toBe(path.join('/mock/home', 'devlift', 'clones', 'github.com', 'test-user', 'test-repo'));
    });

    it('should handle SSH URLs', () => {
        mockPathExistsSync.mockReturnValue(false);

        const repoUrl = 'git@github.com:test-user/test-repo.git';
        const actualPath = getClonePath(repoUrl);

        expect(actualPath).toBe(path.join('/mock/home', 'devlift', 'clones', 'github.com', 'test-user', 'test-repo'));
    });

    it('should use custom basePath from global config when config file exists and is valid', () => {
        const config = { basePath: '/custom/dev/path' };

        mockPathExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(JSON.stringify(config));

        const repoUrl = 'https://github.com/test-user/test-repo.git';
        const actualPath = getClonePath(repoUrl);

        expect(actualPath).toBe(path.join('/custom/dev/path', 'github.com', 'test-user', 'test-repo'));
    });

    it('should fall back to default path when config file exists but contains invalid JSON', () => {
        mockPathExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue('invalid json{');

        const repoUrl = 'https://github.com/test-user/test-repo.git';
        const actualPath = getClonePath(repoUrl);

        // Should fall back to default path when config parsing fails
        expect(actualPath).toBe(path.join('/mock/home', 'devlift', 'clones', 'github.com', 'test-user', 'test-repo'));
    });

    it('should fall back to default path when config file exists but readFileSync throws error', () => {
        mockPathExistsSync.mockReturnValue(true);
        mockReadFileSync.mockImplementation(() => {
            throw new Error('File read error');
        });

        const repoUrl = 'https://github.com/test-user/test-repo.git';
        const actualPath = getClonePath(repoUrl);

        // Should fall back to default path when file reading fails
        expect(actualPath).toBe(path.join('/mock/home', 'devlift', 'clones', 'github.com', 'test-user', 'test-repo'));
    });

    it('should use empty object as config when config file has valid JSON but empty object', () => {
        mockPathExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue('{}');

        const repoUrl = 'https://github.com/test-user/test-repo.git';
        const actualPath = getClonePath(repoUrl);

        // Should use default path when config is empty object
        expect(actualPath).toBe(path.join('/mock/home', 'devlift', 'clones', 'github.com', 'test-user', 'test-repo'));
    });
}); 