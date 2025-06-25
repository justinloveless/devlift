export default {
    // A list of paths to directories that Jest should use to search for files in
    roots: ['<rootDir>/src', '<rootDir>/tests'],

    // The test environment that will be used for testing
    testEnvironment: 'node',

    // The file patterns Jest uses to detect test files
    testMatch: ['**/tests/**/*.test.js', '**/?(*.)+(spec|test).js'],

    // Automatically clear mock calls and instances between every test
    clearMocks: true,

    // Indicates whether the coverage information should be collected while executing the test
    collectCoverage: true,

    // The directory where Jest should output its coverage files
    coverageDirectory: 'coverage',

    // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
    transformIgnorePatterns: ['/node_modules/'],
}; 