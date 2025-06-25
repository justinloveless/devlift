import { loadConfig, validateConfig } from '../../src/core/config.js';
import yaml from 'js-yaml';
import fs from 'fs-extra';
import path from 'path';

describe('Configuration Loader', () => {
    const testDir = path.resolve('./test-config-dir');

    beforeEach(() => {
        fs.emptyDirSync(testDir);
    });

    afterAll(() => {
        fs.removeSync(testDir);
    });

    it('should load and parse a valid dev.yml file', () => {
        const configData = {
            version: '1',
            setup: [
                { type: 'shell', command: 'echo "Hello"' }
            ]
        };
        const yamlStr = yaml.dump(configData);
        fs.writeFileSync(path.join(testDir, 'dev.yml'), yamlStr);

        const config = loadConfig(testDir);
        expect(config).toEqual(configData);
    });

    it('should return null if dev.yml does not exist', () => {
        const config = loadConfig(testDir);
        expect(config).toBeNull();
    });
});

describe('Configuration Validator', () => {
    it('should not throw an error for a valid configuration', () => {
        const config = {
            version: '1',
            setup: [
                { type: 'shell', command: 'echo "Test"' }
            ]
        };
        expect(() => validateConfig(config)).not.toThrow();
    });

    it('should throw an error for an unsupported version', () => {
        const config = { version: '2' };
        expect(() => validateConfig(config)).toThrow('Unsupported configuration version');
    });

    it('should throw an error for an invalid step type', () => {
        const config = {
            version: '1',
            setup: [
                { type: 'invalid-type', command: 'foo' }
            ]
        };
        expect(() => validateConfig(config)).toThrow('Invalid step type: invalid-type');
    });

    it('should throw an error for an unknown step type', () => {
        const config = {
            version: '1',
            setup: [
                { type: 'unknown', command: 'foo' }
            ]
        };
        expect(() => validateConfig(config)).toThrow('Invalid step type: unknown');
    });

    it('should not throw for a valid config with no setup steps', () => {
        const config = { version: '1' };
        expect(() => validateConfig(config)).not.toThrow();
    });
}); 