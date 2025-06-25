import { describe, it, expect } from '@jest/globals';
import { validateConfig } from '../../src/core/validator.js';

describe('Configuration Validator', () => {
    it('should not throw an error for a valid configuration', () => {
        const config: any = {
            version: '1',
            project_name: 'My Awesome Web App',
            environment: {
                example_file: '.env.example',
                variables: [
                    { name: 'DATABASE_URL', prompt: 'Enter the local database connection string:', default: 'postgresql://user:pass@localhost:5432/mydb' },
                    { name: 'API_KEY', prompt: 'Enter your personal API key for the external service:', secret: true }
                ]
            },
            setup: [
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
        const config: any = { version: '2', setup: [] };
        expect(() => validateConfig(config)).toThrow('Unsupported configuration version: 2');
    });

    it('should throw an error for a configuration with invalid step types', () => {
        const config: any = {
            version: '1',
            setup: [
                { name: 'Invalid Step', type: 'invalid-type' }
            ]
        };
        expect(() => validateConfig(config)).toThrow('Invalid step type: invalid-type');
    });

    it('should throw an error for a configuration with a missing required field', () => {
        const config: any = {
            version: '1',
            setup: [
                { name: 'Missing Type' }
            ]
        };
        expect(() => validateConfig(config)).toThrow('Missing required field: type');
    });

    it('should throw an error for a configuration with a missing version field', () => {
        const config: any = {
            setup: [
                { name: 'Valid Step', type: 'shell', command: 'echo "Hello"' }
            ]
        };
        expect(() => validateConfig(config)).toThrow('Missing required field: version');
    });

    it('should handle config with legacy "setup" field instead of "setup_steps"', () => {
        const config = {
            version: '1',
            setup: [
                {
                    name: 'Install dependencies',
                    type: 'shell',
                    command: 'npm install'
                }
            ]
        };

        expect(() => validateConfig(config as any)).not.toThrow();
    });

    it('should validate steps in legacy "setup" field', () => {
        const config = {
            version: '1',
            setup: [
                {
                    name: 'Install deps',
                    type: 'invalid-type',
                    command: 'npm install'
                }
            ]
        };

        expect(() => validateConfig(config as any))
            .toThrow('Invalid step type: invalid-type');
    });

    it('should pass validation when config has no setup steps at all', () => {
        const config = {
            version: '1'
            // No setup or setup_steps field
        };

        expect(() => validateConfig(config as any)).not.toThrow();
    });
}); 