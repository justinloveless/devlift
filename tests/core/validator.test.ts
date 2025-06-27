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

    describe('Choice step validation', () => {
        it('should validate a valid choice step', () => {
            const config = {
                version: '1',
                setup_steps: [
                    {
                        name: 'Choose Development Mode',
                        type: 'choice',
                        prompt: 'How would you like to run the application?',
                        choices: [
                            {
                                name: 'Development mode',
                                value: 'dev',
                                actions: [
                                    { name: 'Start dev server', type: 'shell', command: 'npm run dev' }
                                ]
                            },
                            {
                                name: 'Skip for now',
                                value: 'skip',
                                actions: []
                            }
                        ]
                    }
                ]
            };

            expect(() => validateConfig(config as any)).not.toThrow();
        });

        it('should throw error for choice step missing prompt', () => {
            const config = {
                version: '1',
                setup_steps: [
                    {
                        name: 'Invalid Choice',
                        type: 'choice',
                        // Missing prompt
                        choices: [
                            { name: 'Option 1', value: 'opt1', actions: [] }
                        ]
                    }
                ]
            };

            expect(() => validateConfig(config as any))
                .toThrow('Choice step "Invalid Choice" is missing required field: prompt');
        });

        it('should throw error for choice step missing choices', () => {
            const config = {
                version: '1',
                setup_steps: [
                    {
                        name: 'Invalid Choice',
                        type: 'choice',
                        prompt: 'Choose an option'
                        // Missing choices
                    }
                ]
            };

            expect(() => validateConfig(config as any))
                .toThrow('Choice step "Invalid Choice" is missing required field: choices');
        });

        it('should throw error for choice step with empty choices array', () => {
            const config = {
                version: '1',
                setup_steps: [
                    {
                        name: 'Invalid Choice',
                        type: 'choice',
                        prompt: 'Choose an option',
                        choices: []
                    }
                ]
            };

            expect(() => validateConfig(config as any))
                .toThrow('Choice step "Invalid Choice" must have at least one choice');
        });

        it('should throw error for choice with missing name', () => {
            const config = {
                version: '1',
                setup_steps: [
                    {
                        name: 'Invalid Choice',
                        type: 'choice',
                        prompt: 'Choose an option',
                        choices: [
                            {
                                // Missing name
                                value: 'opt1',
                                actions: []
                            }
                        ]
                    }
                ]
            };

            expect(() => validateConfig(config as any))
                .toThrow('Choice in step "Invalid Choice" is missing required field: name');
        });

        it('should throw error for choice with missing value', () => {
            const config = {
                version: '1',
                setup_steps: [
                    {
                        name: 'Invalid Choice',
                        type: 'choice',
                        prompt: 'Choose an option',
                        choices: [
                            {
                                name: 'Option 1',
                                // Missing value
                                actions: []
                            }
                        ]
                    }
                ]
            };

            expect(() => validateConfig(config as any))
                .toThrow('Choice in step "Invalid Choice" is missing required field: value');
        });

        it('should validate nested actions in choice steps', () => {
            const config = {
                version: '1',
                setup_steps: [
                    {
                        name: 'Choose Development Mode',
                        type: 'choice',
                        prompt: 'How would you like to run the application?',
                        choices: [
                            {
                                name: 'Development mode',
                                value: 'dev',
                                actions: [
                                    {
                                        name: 'Invalid action',
                                        type: 'invalid-type',
                                        command: 'npm run dev'
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            expect(() => validateConfig(config as any))
                .toThrow('Invalid step type: invalid-type');
        });

        it('should validate nested choice steps', () => {
            const config = {
                version: '1',
                setup_steps: [
                    {
                        name: 'Choose Development Mode',
                        type: 'choice',
                        prompt: 'How would you like to run the application?',
                        choices: [
                            {
                                name: 'Advanced setup',
                                value: 'advanced',
                                actions: [
                                    {
                                        name: 'Choose Database',
                                        type: 'choice',
                                        prompt: 'Which database?',
                                        choices: [
                                            {
                                                name: 'PostgreSQL',
                                                value: 'postgres',
                                                actions: []
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            expect(() => validateConfig(config as any)).not.toThrow();
        });
    });

    describe('Post-setup choice validation', () => {
        it('should validate a valid post-setup choice action', () => {
            const config = {
                version: '1',
                post_setup: [
                    {
                        type: 'choice',
                        prompt: 'What would you like to do next?',
                        choices: [
                            {
                                name: 'Start development server',
                                value: 'start',
                                actions: [
                                    { type: 'message', content: 'Starting server...' }
                                ]
                            }
                        ]
                    }
                ]
            };

            expect(() => validateConfig(config as any)).not.toThrow();
        });

        it('should throw error for post-setup choice missing prompt', () => {
            const config = {
                version: '1',
                post_setup: [
                    {
                        type: 'choice',
                        // Missing prompt
                        choices: [
                            { name: 'Option 1', value: 'opt1', actions: [] }
                        ]
                    }
                ]
            };

            expect(() => validateConfig(config as any))
                .toThrow('Post-setup choice action is missing required field: prompt');
        });

        it('should throw error for post-setup choice missing choices', () => {
            const config = {
                version: '1',
                post_setup: [
                    {
                        type: 'choice',
                        prompt: 'Choose an option'
                        // Missing choices
                    }
                ]
            };

            expect(() => validateConfig(config as any))
                .toThrow('Post-setup choice action is missing required field: choices');
        });

        it('should throw error for post-setup choice with empty choices array', () => {
            const config = {
                version: '1',
                post_setup: [
                    {
                        type: 'choice',
                        prompt: 'Choose an option',
                        choices: []
                    }
                ]
            };

            expect(() => validateConfig(config as any))
                .toThrow('Post-setup choice action must have at least one choice');
        });

        it('should validate nested post-setup actions in choices', () => {
            const config = {
                version: '1',
                post_setup: [
                    {
                        type: 'choice',
                        prompt: 'What would you like to do next?',
                        choices: [
                            {
                                name: 'Invalid action',
                                value: 'invalid',
                                actions: [
                                    {
                                        type: 'invalid-type',
                                        content: 'This should fail'
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            expect(() => validateConfig(config as any))
                .toThrow('Invalid post-setup action type: invalid-type');
        });
    });
}); 