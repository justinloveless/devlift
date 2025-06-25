import { jest, describe, it, expect } from '@jest/globals';
import { validateConfig } from '../../src/core/validator';

describe('Configuration Validator', () => {
    it('should not throw an error for a valid configuration', () => {
        const config = {
            version: '1',
            project_name: 'My Awesome Web App',
            environment: {
                example_file: '.env.example',
                variables: [
                    { name: 'DATABASE_URL', prompt: 'Enter the local database connection string:', default: 'postgresql://user:pass@localhost:5432/mydb' },
                    { name: 'API_KEY', prompt: 'Enter your personal API key for the external service:', secret: true }
                ]
            },
            setup_steps: [
                { name: 'Install Node.js Dependencies', type: 'package-manager', manager: 'pnpm', command: 'install' },
                { name: 'Start Local Database', type: 'shell', command: 'docker-compose up -d' },
                { name: 'Run Database Migrations', type: 'shell', command: 'npm run db:migrate', depends_on: ['Start Local Database'] }
            ],
            post_setup: [
                { type: 'message', content: '✅ Setup complete!' },
                { type: 'open', target: 'editor', path: '.' }
            ]
        };
        expect(() => validateConfig(config)).not.toThrow();
    });

    it('should throw an error for a configuration with an unsupported version', () => {
        const config = { version: '2', setup: [] };
        expect(() => validateConfig(config)).toThrow('Unsupported configuration version: 2');
    });

    it('should throw an error for a configuration with invalid step types', () => {
        const config = {
            version: '1',
            setup_steps: [
                { name: 'Invalid Step', type: 'invalid-type' }
            ]
        };
        expect(() => validateConfig(config)).toThrow('Invalid step type: invalid-type');
    });

    it('should throw an error for a configuration with a missing required field', () => {
        const config = {
            version: '1',
            setup_steps: [
                { name: 'Missing Type' }
            ]
        };
        expect(() => validateConfig(config)).toThrow('Missing required field: type');
    });

    it('should throw an error for a configuration with a missing version field', () => {
        const config = {
            setup_steps: [
                { name: 'Valid Step', type: 'shell', command: 'echo "Hello"' }
            ]
        };
        expect(() => validateConfig(config)).toThrow('Missing required field: version');
    });
}); 