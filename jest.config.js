/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    preset: 'ts-jest/presets/default-esm',
    extensionsToTreatAsEsm: ['.ts'],

    // A list of paths to directories that Jest should use to search for files in
    roots: ['<rootDir>/src', '<rootDir>/tests'],

    // The test environment that will be used for testing
    testEnvironment: 'node',

    // The file patterns Jest uses to detect test files
    testMatch: ['**/tests/**/*.test.ts', '**/?(*.)+(spec|test).ts'],

    // Automatically clear mock calls and instances between every test
    clearMocks: true,

    // Indicates whether the coverage information should be collected while executing the test
    collectCoverage: true,

    // The directory where Jest should output its coverage files
    coverageDirectory: 'coverage',

    // Transform configuration for ES modules and TypeScript
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            useESM: true
        }]
    },

    // Module name mapping for ES module imports
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    }
}; 