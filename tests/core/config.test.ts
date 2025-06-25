import { loadConfig } from '../../src/core/config';
import yaml from 'js-yaml';
import fs from 'fs-extra';
import path from 'path';
import { jest } from '@jest/globals';

describe('Config Loader', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return null if config file does not exist', () => {
        const spy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
        expect(loadConfig('/test/dir')).toBeNull();
        spy.mockRestore();
    });

    it('should load and parse a valid YAML config file', () => {
        const mockConfig = { version: '1', setup: [] };
        const yamlDump = yaml.dump(mockConfig);
        const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(yamlDump);
        const loadSpy = jest.spyOn(yaml, 'load').mockReturnValue(mockConfig);

        expect(loadConfig('/test/dir')).toEqual(mockConfig);

        existsSpy.mockRestore();
        readSpy.mockRestore();
        loadSpy.mockRestore();
    });
});
