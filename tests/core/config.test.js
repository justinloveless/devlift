import { loadConfig } from '../../src/core/config.js';
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

    it('should throw an error for an invalid configuration', () => {
        const configData = {
            version: '2', // Invalid version
            setup: [
                { type: 'shell', command: 'echo "Hello"' }
            ]
        };
        const yamlStr = yaml.dump(configData);
        fs.writeFileSync(path.join(testDir, 'dev.yml'), yamlStr);

        expect(() => loadConfig(testDir)).toThrow('Unsupported configuration version: 2');
    });
}); 