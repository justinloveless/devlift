import { loadConfig, getSupportedConfigFiles, configExists, getConfigFileInfo } from '../../src/core/config';
import yaml from 'js-yaml';
import fs from 'fs-extra';
import path from 'path';
import { jest } from '@jest/globals';

// Type for fs.existsSync mock
type PathLike = string | Buffer | URL;

describe('Config Loader', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('loadConfig', () => {
        it('should return null if no config file exists', () => {
            const spy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
            expect(loadConfig('/test/dir')).toBeNull();
            spy.mockRestore();
        });

        it('should load and parse a valid YAML config file (dev.yml)', () => {
            const mockConfig = { version: '1', project_name: 'test', setup: [] };
            const yamlContent = yaml.dump(mockConfig);

            const existsSpy = jest.spyOn(fs, 'existsSync')
                .mockImplementation((filePath: PathLike) => {
                    return String(filePath).endsWith('dev.yml');
                });
            const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent);

            const result = loadConfig('/test/dir');
            expect(result).toEqual(mockConfig);
            expect(readSpy).toHaveBeenCalledWith(expect.stringMatching(/[/\\]test[/\\]dir[/\\]dev\.yml$/), 'utf8');

            existsSpy.mockRestore();
            readSpy.mockRestore();
        });

        it('should load and parse a valid YAML config file (dev.yaml)', () => {
            const mockConfig = { version: '1', project_name: 'test', setup: [] };
            const yamlContent = yaml.dump(mockConfig);

            const existsSpy = jest.spyOn(fs, 'existsSync')
                .mockImplementation((filePath: PathLike) => {
                    return String(filePath).endsWith('dev.yaml');
                });
            const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent);

            const result = loadConfig('/test/dir');
            expect(result).toEqual(mockConfig);
            expect(readSpy).toHaveBeenCalledWith(expect.stringMatching(/[/\\]test[/\\]dir[/\\]dev\.yaml$/), 'utf8');

            existsSpy.mockRestore();
            readSpy.mockRestore();
        });

        it('should load and parse a valid JSON config file (dev.json)', () => {
            const mockConfig = {
                version: '1',
                project_name: 'test',
                setup: [],
                "$schema": "https://raw.githubusercontent.com/justinloveless/devlift/main/schema/dev-config.schema.json"
            };
            const jsonContent = JSON.stringify(mockConfig, null, 2);

            const existsSpy = jest.spyOn(fs, 'existsSync')
                .mockImplementation((filePath: PathLike) => {
                    return String(filePath).endsWith('dev.json');
                });
            const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(jsonContent);

            const result = loadConfig('/test/dir');
            expect(result).toEqual(mockConfig);
            expect(readSpy).toHaveBeenCalledWith(expect.stringMatching(/[/\\]test[/\\]dir[/\\]dev\.json$/), 'utf8');

            existsSpy.mockRestore();
            readSpy.mockRestore();
        });

        it('should prioritize dev.yml over dev.json when both exist', () => {
            const yamlConfig = { version: '1', project_name: 'yaml-config', setup: [] };
            const jsonConfig = { version: '1', project_name: 'json-config', setup: [] };
            const yamlContent = yaml.dump(yamlConfig);

            const existsSpy = jest.spyOn(fs, 'existsSync')
                .mockImplementation((filePath: PathLike) => {
                    const pathStr = String(filePath);
                    return pathStr.endsWith('dev.yml') || pathStr.endsWith('dev.json');
                });
            const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(yamlContent);

            const result = loadConfig('/test/dir');
            expect(result).toEqual(yamlConfig);
            expect(readSpy).toHaveBeenCalledWith(expect.stringMatching(/[/\\]test[/\\]dir[/\\]dev\.yml$/), 'utf8');

            existsSpy.mockRestore();
            readSpy.mockRestore();
        });

        it('should throw error for invalid YAML format', () => {
            const invalidYaml = '{ invalid yaml content [';

            const existsSpy = jest.spyOn(fs, 'existsSync')
                .mockImplementation((filePath: PathLike) => String(filePath).endsWith('dev.yml'));
            const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(invalidYaml);

            expect(() => loadConfig('/test/dir')).toThrow('Failed to parse YAML configuration file');

            existsSpy.mockRestore();
            readSpy.mockRestore();
        });

        it('should throw error for invalid JSON format', () => {
            const invalidJson = '{ "invalid": json content }';

            const existsSpy = jest.spyOn(fs, 'existsSync')
                .mockImplementation((filePath: PathLike) => String(filePath).endsWith('dev.json'));
            const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(invalidJson);

            expect(() => loadConfig('/test/dir')).toThrow('Failed to parse JSON configuration file');

            existsSpy.mockRestore();
            readSpy.mockRestore();
        });

        it('should throw error for non-object configuration', () => {
            const existsSpy = jest.spyOn(fs, 'existsSync')
                .mockImplementation((filePath: PathLike) => String(filePath).endsWith('dev.json'));
            const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue('"just a string"');

            expect(() => loadConfig('/test/dir')).toThrow('Configuration file does not contain a valid object');

            existsSpy.mockRestore();
            readSpy.mockRestore();
        });
    });

    describe('getSupportedConfigFiles', () => {
        it('should return list of supported config files', () => {
            const supported = getSupportedConfigFiles();
            expect(supported).toEqual(['dev.yml', 'dev.yaml', 'dev.json']);
        });
    });

    describe('configExists', () => {
        it('should return true when config file exists', () => {
            const spy = jest.spyOn(fs, 'existsSync')
                .mockImplementation((filePath: PathLike) => String(filePath).endsWith('dev.yml'));

            expect(configExists('/test/dir')).toBe(true);
            spy.mockRestore();
        });

        it('should return false when no config file exists', () => {
            const spy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);

            expect(configExists('/test/dir')).toBe(false);
            spy.mockRestore();
        });
    });

    describe('getConfigFileInfo', () => {
        it('should return config file info for YAML file', () => {
            const spy = jest.spyOn(fs, 'existsSync')
                .mockImplementation((filePath: PathLike) => String(filePath).endsWith('dev.yml'));

            const result = getConfigFileInfo('/test/dir');
            expect(result?.format).toBe('yaml');
            expect(result?.path).toMatch(/[/\\]test[/\\]dir[/\\]dev\.yml$/);
            spy.mockRestore();
        });

        it('should return config file info for JSON file', () => {
            const spy = jest.spyOn(fs, 'existsSync')
                .mockImplementation((filePath: PathLike) => String(filePath).endsWith('dev.json'));

            const result = getConfigFileInfo('/test/dir');
            expect(result?.format).toBe('json');
            expect(result?.path).toMatch(/[/\\]test[/\\]dir[/\\]dev\.json$/);
            spy.mockRestore();
        });

        it('should return null when no config file exists', () => {
            const spy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);

            const result = getConfigFileInfo('/test/dir');
            expect(result).toBeNull();
            spy.mockRestore();
        });
    });
});
