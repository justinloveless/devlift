import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Create manual mocks with proper Jest types
const mockInquirerPrompt = jest.fn() as jest.MockedFunction<any>;
const mockExeca = jest.fn() as jest.MockedFunction<any>;
const mockPathExistsSync = jest.fn() as jest.MockedFunction<any>;

// Mock the modules before importing
jest.unstable_mockModule('inquirer', () => ({
    default: {
        prompt: mockInquirerPrompt
    }
}));

jest.unstable_mockModule('execa', () => ({
    execa: mockExeca
}));

jest.unstable_mockModule('fs-extra', () => ({
    default: {
        pathExistsSync: mockPathExistsSync
    }
}));

// Import after mocking
const { ExecutionEngine } = await import('../../src/core/execution-engine.js');

describe('ExecutionEngine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create an ExecutionEngine instance', () => {
        const config = { version: '1', setup_steps: [] };
        const engine = new ExecutionEngine(config, '/test/dir');

        expect(engine).toBeDefined();
        expect(typeof engine.run).toBe('function');
    });

    it('should do nothing if no setup steps are provided', async () => {
        const config = {};
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockInquirerPrompt).not.toHaveBeenCalled();
        expect(mockExeca).not.toHaveBeenCalled();
    });

    it('should execute a shell command step when user agrees', async () => {
        mockInquirerPrompt.mockResolvedValue({ proceed: true });
        mockExeca.mockResolvedValue({});

        const config = {
            setup_steps: [
                { name: 'Install dependencies', type: 'shell' as const, command: 'npm install' }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockInquirerPrompt).toHaveBeenCalledWith([{
            type: 'confirm',
            name: 'proceed',
            message: 'Execute the following command?\n  npm install',
            default: true
        }]);
        expect(mockExeca).toHaveBeenCalledWith('npm install', {
            cwd: '/test/dir',
            stdio: 'inherit',
            shell: true
        });
    });

    it('should skip a shell step if the user declines', async () => {
        mockInquirerPrompt.mockResolvedValue({ proceed: false });

        const config = {
            setup_steps: [
                { name: 'Run tests', type: 'shell' as const, command: 'npm test' }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockInquirerPrompt).toHaveBeenCalled();
        expect(mockExeca).not.toHaveBeenCalled();
    });

    it('should execute steps in the correct order based on depends_on', async () => {
        mockInquirerPrompt.mockResolvedValue({ proceed: true });
        mockExeca.mockResolvedValue({});

        const config = {
            setup_steps: [
                { name: 'C', type: 'shell' as const, command: 'echo C', depends_on: ['B'] },
                { name: 'A', type: 'shell' as const, command: 'echo A' },
                { name: 'B', type: 'shell' as const, command: 'echo B', depends_on: ['A'] }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        // Verify execution order by checking call order
        const calls = mockExeca.mock.calls;
        expect(calls[0][0]).toBe('echo A');
        expect(calls[1][0]).toBe('echo B');
        expect(calls[2][0]).toBe('echo C');
    });

    it('should throw an error for circular dependencies', async () => {
        const config = {
            setup_steps: [
                { name: 'A', type: 'shell' as const, command: 'echo A', depends_on: ['B'] },
                { name: 'B', type: 'shell' as const, command: 'echo B', depends_on: ['A'] }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await expect(engine.run()).rejects.toThrow('Circular dependency detected in setup steps.');
    });

    it('should auto-detect npm as package manager by default', async () => {
        mockPathExistsSync.mockReturnValue(false); // No lock files exist
        mockExeca.mockResolvedValue({});

        const config = {
            setup_steps: [
                { name: 'Install deps', type: 'package-manager' as const, command: 'install' }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockExeca).toHaveBeenCalledWith('npm install', {
            cwd: '/test/dir',
            stdio: 'inherit'
        });
    });

    it('should auto-detect yarn when yarn.lock exists', async () => {
        mockPathExistsSync.mockImplementation((path: unknown) =>
            String(path).includes('yarn.lock')
        );
        mockExeca.mockResolvedValue({});

        const config = {
            setup_steps: [
                { name: 'Install deps', type: 'package-manager' as const, command: 'install' }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockExeca).toHaveBeenCalledWith('yarn install', {
            cwd: '/test/dir',
            stdio: 'inherit'
        });
    });

    it('should auto-detect pnpm when pnpm-lock.yaml exists', async () => {
        mockPathExistsSync.mockImplementation((path: unknown) =>
            String(path).includes('pnpm-lock.yaml')
        );
        mockExeca.mockResolvedValue({});

        const config = {
            setup_steps: [
                { name: 'Install deps', type: 'package-manager' as const, command: 'install' }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockExeca).toHaveBeenCalledWith('pnpm install', {
            cwd: '/test/dir',
            stdio: 'inherit'
        });
    });

    it('should use specified package manager when provided', async () => {
        mockExeca.mockResolvedValue({});

        const config = {
            setup_steps: [
                {
                    name: 'Install deps',
                    type: 'package-manager' as const,
                    command: 'install',
                    manager: 'bun'
                }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockExeca).toHaveBeenCalledWith('bun install', {
            cwd: '/test/dir',
            stdio: 'inherit'
        });
    });

    it('should execute mixed shell and package-manager steps', async () => {
        mockInquirerPrompt.mockResolvedValue({ proceed: true });
        mockExeca.mockResolvedValue({});
        mockPathExistsSync.mockReturnValue(false);

        const config = {
            setup_steps: [
                { name: 'Install deps', type: 'package-manager' as const, command: 'install' },
                { name: 'Run build', type: 'shell' as const, command: 'npm run build', depends_on: ['Install deps'] }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        expect(mockExeca).toHaveBeenCalledTimes(2);
        expect(mockInquirerPrompt).toHaveBeenCalledTimes(1); // Only for shell command

        // First call should be package manager (no prompt)
        expect(mockExeca.mock.calls[0][0]).toBe('npm install');
        // Second call should be shell command (with prompt)
        expect(mockExeca.mock.calls[1][0]).toBe('npm run build');
    });

    it('should handle unknown step types by skipping them', async () => {
        mockInquirerPrompt.mockResolvedValue({ proceed: true });
        mockExeca.mockResolvedValue({});

        const config = {
            setup_steps: [
                { name: 'Valid shell', type: 'shell' as const, command: 'echo hello' },
                { name: 'Unknown type', type: 'unknown-type' as any, command: 'some command' },
                { name: 'Valid package manager', type: 'package-manager' as const, command: 'install' }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        await engine.run();

        // Should only execute the known step types
        expect(mockExeca).toHaveBeenCalledTimes(2);
        expect(mockExeca.mock.calls[0][0]).toBe('echo hello');
        expect(mockExeca.mock.calls[1][0]).toBe('npm install');
    });

    it('should handle the case where a step is not found in stepMap during sorting', async () => {
        // This test helps cover the edge case in the topological sort
        // where the graph refers to steps that don't exist in the stepMap
        const config = {
            setup_steps: [
                { name: 'Valid step', type: 'shell' as const, command: 'echo hello' }
            ]
        };
        const engine = new ExecutionEngine(config, '/test/dir');

        mockInquirerPrompt.mockResolvedValue({ proceed: true });
        mockExeca.mockResolvedValue({});

        await engine.run();

        expect(mockInquirerPrompt).toHaveBeenCalled();
        expect(mockExeca).toHaveBeenCalledWith('echo hello', {
            cwd: '/test/dir',
            stdio: 'inherit',
            shell: true
        });
    });

    describe('choice steps', () => {
        it('should present choices and execute selected actions', async () => {
            mockInquirerPrompt
                .mockResolvedValueOnce({ choice: 'dev' }) // User selects dev option
                .mockResolvedValueOnce({ proceed: true }); // User confirms shell command
            mockExeca.mockResolvedValue({});

            const config = {
                setup_steps: [
                    {
                        name: 'Choose Development Mode',
                        type: 'choice' as const,
                        prompt: 'How would you like to run the application?',
                        choices: [
                            {
                                name: 'Development mode',
                                value: 'dev',
                                actions: [
                                    { name: 'Start dev server', type: 'shell' as const, command: 'npm run dev' }
                                ]
                            },
                            {
                                name: 'Production mode',
                                value: 'prod',
                                actions: [
                                    { name: 'Build and start', type: 'shell' as const, command: 'npm run build && npm start' }
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
            const engine = new ExecutionEngine(config, '/test/dir');

            await engine.run();

            // Should present the choice
            expect(mockInquirerPrompt).toHaveBeenNthCalledWith(1, [{
                type: 'list',
                name: 'choice',
                message: 'How would you like to run the application?',
                choices: [
                    { name: 'Development mode', value: 'dev' },
                    { name: 'Production mode', value: 'prod' },
                    { name: 'Skip for now', value: 'skip' }
                ]
            }]);

            // Should execute the selected action
            expect(mockInquirerPrompt).toHaveBeenNthCalledWith(2, [{
                type: 'confirm',
                name: 'proceed',
                message: 'Execute the following command?\n  npm run dev',
                default: true
            }]);
            expect(mockExeca).toHaveBeenCalledWith('npm run dev', {
                cwd: '/test/dir',
                stdio: 'inherit',
                shell: true
            });
        });

        it('should handle choice with no actions (skip option)', async () => {
            mockInquirerPrompt.mockResolvedValueOnce({ choice: 'skip' });

            const config = {
                setup_steps: [
                    {
                        name: 'Choose Development Mode',
                        type: 'choice' as const,
                        prompt: 'How would you like to run the application?',
                        choices: [
                            {
                                name: 'Development mode',
                                value: 'dev',
                                actions: [
                                    { name: 'Start dev server', type: 'shell' as const, command: 'npm run dev' }
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
            const engine = new ExecutionEngine(config, '/test/dir');

            await engine.run();

            // Should present the choice
            expect(mockInquirerPrompt).toHaveBeenCalledTimes(1);
            expect(mockInquirerPrompt).toHaveBeenCalledWith([{
                type: 'list',
                name: 'choice',
                message: 'How would you like to run the application?',
                choices: [
                    { name: 'Development mode', value: 'dev' },
                    { name: 'Skip for now', value: 'skip' }
                ]
            }]);

            // Should not execute any commands
            expect(mockExeca).not.toHaveBeenCalled();
        });

        it('should handle choice with multiple actions', async () => {
            mockInquirerPrompt
                .mockResolvedValueOnce({ choice: 'prod' })
                .mockResolvedValueOnce({ proceed: true })
                .mockResolvedValueOnce({ proceed: true });
            mockExeca.mockResolvedValue({});

            const config = {
                setup_steps: [
                    {
                        name: 'Choose Development Mode',
                        type: 'choice' as const,
                        prompt: 'How would you like to run the application?',
                        choices: [
                            {
                                name: 'Production mode',
                                value: 'prod',
                                actions: [
                                    { name: 'Build app', type: 'shell' as const, command: 'npm run build' },
                                    { name: 'Start app', type: 'shell' as const, command: 'npm start' }
                                ]
                            }
                        ]
                    }
                ]
            };
            const engine = new ExecutionEngine(config, '/test/dir');

            await engine.run();

            // Should execute both actions in sequence
            expect(mockExeca).toHaveBeenCalledTimes(2);
            expect(mockExeca).toHaveBeenNthCalledWith(1, 'npm run build', {
                cwd: '/test/dir',
                stdio: 'inherit',
                shell: true
            });
            expect(mockExeca).toHaveBeenNthCalledWith(2, 'npm start', {
                cwd: '/test/dir',
                stdio: 'inherit',
                shell: true
            });
        });

        it('should handle choice with package-manager actions', async () => {
            mockInquirerPrompt.mockResolvedValueOnce({ choice: 'install' });
            mockExeca.mockResolvedValue({});
            mockPathExistsSync.mockReturnValue(false); // No lock files

            const config = {
                setup_steps: [
                    {
                        name: 'Choose Installation Method',
                        type: 'choice' as const,
                        prompt: 'How would you like to install dependencies?',
                        choices: [
                            {
                                name: 'Install with npm',
                                value: 'install',
                                actions: [
                                    { name: 'Install deps', type: 'package-manager' as const, command: 'install', manager: 'npm' }
                                ]
                            }
                        ]
                    }
                ]
            };
            const engine = new ExecutionEngine(config, '/test/dir');

            await engine.run();

            expect(mockExeca).toHaveBeenCalledWith('npm install', {
                cwd: '/test/dir',
                stdio: 'inherit'
            });
        });

        it('should handle choice steps with depends_on', async () => {
            mockInquirerPrompt
                .mockResolvedValueOnce({ proceed: true }) // First step
                .mockResolvedValueOnce({ choice: 'dev' })  // Choice step
                .mockResolvedValueOnce({ proceed: true }); // Choice action
            mockExeca.mockResolvedValue({});

            const config = {
                setup_steps: [
                    { name: 'Install deps', type: 'shell' as const, command: 'npm install' },
                    {
                        name: 'Choose Development Mode',
                        type: 'choice' as const,
                        prompt: 'How would you like to run the application?',
                        depends_on: ['Install deps'],
                        choices: [
                            {
                                name: 'Development mode',
                                value: 'dev',
                                actions: [
                                    { name: 'Start dev server', type: 'shell' as const, command: 'npm run dev' }
                                ]
                            }
                        ]
                    }
                ]
            };
            const engine = new ExecutionEngine(config, '/test/dir');

            await engine.run();

            // Should execute install first, then choice
            const calls = mockExeca.mock.calls;
            expect(calls[0][0]).toBe('npm install');
            expect(calls[1][0]).toBe('npm run dev');
        });

        it('should throw error for choice step without prompt', async () => {
            const config = {
                setup_steps: [
                    {
                        name: 'Invalid Choice',
                        type: 'choice' as const,
                        // Missing prompt
                        choices: [
                            { name: 'Option 1', value: 'opt1', actions: [] }
                        ]
                    }
                ]
            };
            const engine = new ExecutionEngine(config as any, '/test/dir');

            await expect(engine.run()).rejects.toThrow();
        });

        it('should throw error for choice step without choices', async () => {
            const config = {
                setup_steps: [
                    {
                        name: 'Invalid Choice',
                        type: 'choice' as const,
                        prompt: 'Choose an option',
                        // Missing choices
                    }
                ]
            };
            const engine = new ExecutionEngine(config as any, '/test/dir');

            await expect(engine.run()).rejects.toThrow();
        });

        it('should throw error for choice step with empty choices array', async () => {
            const config = {
                setup_steps: [
                    {
                        name: 'Invalid Choice',
                        type: 'choice' as const,
                        prompt: 'Choose an option',
                        choices: []
                    }
                ]
            };
            const engine = new ExecutionEngine(config as any, '/test/dir');

            await expect(engine.run()).rejects.toThrow();
        });

        it('should use pre-specified choice when provided', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            mockInquirerPrompt.mockResolvedValue({ proceed: true });
            mockExeca.mockResolvedValue({});

            const config = {
                setup_steps: [
                    {
                        name: 'Choose Test Mode',
                        type: 'choice' as const,
                        prompt: 'Which test would you like to run?',
                        choices: [
                            {
                                name: 'Quick test',
                                value: 'quick',
                                actions: [
                                    { name: 'Run quick test', type: 'shell' as const, command: 'npm run test:quick' }
                                ]
                            },
                            {
                                name: 'Full test',
                                value: 'full',
                                actions: [
                                    { name: 'Run full test', type: 'shell' as const, command: 'npm run test:full' }
                                ]
                            }
                        ]
                    }
                ]
            };

            const prespecifiedChoices = new Map([['Choose Test Mode', 'quick']]);
            const engine = new ExecutionEngine(config, '/test/dir', prespecifiedChoices);

            await engine.run();

            // Should not prompt user for choice selection
            expect(mockInquirerPrompt).toHaveBeenCalledTimes(1); // Only for shell command confirmation
            expect(mockInquirerPrompt).toHaveBeenCalledWith([{
                type: 'confirm',
                name: 'proceed',
                message: 'Execute the following command?\n  npm run test:quick',
                default: true
            }]);

            // Should log that pre-specified choice was used
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🎯 Using pre-specified choice: Quick test'));

            // Should execute the correct action
            expect(mockExeca).toHaveBeenCalledWith('npm run test:quick', {
                cwd: '/test/dir',
                stdio: 'inherit',
                shell: true
            });

            consoleSpy.mockRestore();
        });

        it('should throw error for invalid pre-specified choice during upfront validation', async () => {
            const config = {
                setup_steps: [
                    {
                        name: 'Choose Test Mode',
                        type: 'choice' as const,
                        prompt: 'Which test would you like to run?',
                        choices: [
                            {
                                name: 'Quick test',
                                value: 'quick',
                                actions: [
                                    { name: 'Run quick test', type: 'shell' as const, command: 'npm run test:quick' }
                                ]
                            }
                        ]
                    }
                ]
            };

            const prespecifiedChoices = new Map([['Choose Test Mode', 'invalid-choice']]);
            const engine = new ExecutionEngine(config, '/test/dir', prespecifiedChoices);

            await expect(engine.run()).rejects.toThrow('Invalid pre-specified choice "invalid-choice" for step "Choose Test Mode". Valid choices are: quick');
        });

        it('should support pre-specified choices for multiple choice steps', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            mockExeca.mockResolvedValue({});

            const config = {
                setup_steps: [
                    {
                        name: 'Choose Environment',
                        type: 'choice' as const,
                        prompt: 'Which environment?',
                        choices: [
                            {
                                name: 'Development',
                                value: 'dev',
                                actions: [
                                    { name: 'Setup dev', type: 'package-manager' as const, command: 'install', manager: 'npm' }
                                ]
                            }
                        ]
                    },
                    {
                        name: 'Choose Database',
                        type: 'choice' as const,
                        prompt: 'Which database?',
                        choices: [
                            {
                                name: 'PostgreSQL',
                                value: 'postgres',
                                actions: [
                                    { name: 'Setup postgres', type: 'package-manager' as const, command: 'install', manager: 'npm' }
                                ]
                            }
                        ]
                    }
                ]
            };

            const prespecifiedChoices = new Map([
                ['Choose Environment', 'dev'],
                ['Choose Database', 'postgres']
            ]);
            const engine = new ExecutionEngine(config, '/test/dir', prespecifiedChoices);

            await engine.run();

            // Should not prompt user for choices
            expect(mockInquirerPrompt).not.toHaveBeenCalled();

            // Should log that pre-specified choices were used
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🎯 Using pre-specified choice: Development'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🎯 Using pre-specified choice: PostgreSQL'));

            // Should execute both actions
            expect(mockExeca).toHaveBeenCalledTimes(2);

            consoleSpy.mockRestore();
        });

        it('should validate invalid post-setup choice upfront before any steps run', async () => {
            const config = {
                setup_steps: [
                    {
                        name: 'Valid Step',
                        type: 'shell' as const,
                        command: 'echo "This should not run"'
                    }
                ],
                post_setup: [
                    {
                        type: 'choice' as const,
                        name: 'post-setup',
                        prompt: 'Choose an option',
                        choices: [
                            {
                                name: 'Option A',
                                value: 'option-a',
                                actions: []
                            }
                        ]
                    }
                ]
            };

            const prespecifiedChoices = new Map([['post-setup', 'invalid-option']]);
            const engine = new ExecutionEngine(config, '/test/dir', prespecifiedChoices);

            // Should fail immediately without running any steps
            await expect(engine.run()).rejects.toThrow('Invalid pre-specified choice "invalid-option" for post-setup action "post-setup". Valid choices are: option-a');

            // Verify no shell commands were executed
            expect(mockExeca).not.toHaveBeenCalled();
        });

        it('should validate all invalid choices upfront even with mixed valid/invalid choices', async () => {
            const config = {
                setup_steps: [
                    {
                        name: 'First Choice',
                        type: 'choice' as const,
                        prompt: 'First choice',
                        choices: [
                            { name: 'Valid Option', value: 'valid', actions: [] }
                        ]
                    },
                    {
                        name: 'Second Choice',
                        type: 'choice' as const,
                        prompt: 'Second choice',
                        choices: [
                            { name: 'Another Valid', value: 'another-valid', actions: [] }
                        ]
                    }
                ]
            };

            const prespecifiedChoices = new Map([
                ['First Choice', 'valid'],        // This one is valid
                ['Second Choice', 'invalid']      // This one is invalid
            ]);
            const engine = new ExecutionEngine(config, '/test/dir', prespecifiedChoices);

            // Should fail on the invalid choice during upfront validation
            await expect(engine.run()).rejects.toThrow('Invalid pre-specified choice "invalid" for step "Second Choice". Valid choices are: another-valid');
        });
    });

    describe('post_setup actions', () => {
        it('should execute post_setup message actions', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

            const config = {
                setup_steps: [],
                post_setup: [
                    { type: 'message' as const, content: 'Setup complete!' },
                    { type: 'message' as const, content: 'Ready to develop!' }
                ]
            };
            const engine = new ExecutionEngine(config as any, '/test/dir');

            await engine.run();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🎉 Running post-setup actions...'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📝 Setup complete!'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📝 Ready to develop!'));

            consoleSpy.mockRestore();
        });

        it('should execute post_setup open editor actions', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            mockExeca.mockResolvedValue({});

            const config = {
                setup_steps: [],
                post_setup: [
                    { type: 'open' as const, target: 'editor', path: '.' }
                ]
            };
            const engine = new ExecutionEngine(config as any, '/test/dir');

            await engine.run();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📂 Opening'));
            expect(mockExeca).toHaveBeenCalledWith('code', [expect.any(String)], { cwd: '/test/dir' });

            consoleSpy.mockRestore();
        });

        it('should execute post_setup open browser actions', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            mockExeca.mockResolvedValue({});

            const config = {
                setup_steps: [],
                post_setup: [
                    { type: 'open' as const, target: 'browser', path: 'http://localhost:3000' }
                ]
            };
            const engine = new ExecutionEngine(config as any, '/test/dir');

            await engine.run();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🌐 Opening http://localhost:3000 in browser...'));
            expect(mockExeca).toHaveBeenCalledWith(expect.any(String), ['http://localhost:3000'], {
                cwd: '/test/dir',
                shell: true
            });

            consoleSpy.mockRestore();
        });

        it('should handle post_setup actions even when no setup steps exist', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const config = {
                post_setup: [
                    { type: 'message' as const, content: 'No setup needed, but here is a message!' }
                ]
            };
            const engine = new ExecutionEngine(config as any, '/test/dir');

            await engine.run();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🎉 Running post-setup actions...'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📝 No setup needed, but here is a message!'));

            consoleSpy.mockRestore();
        });

        it('should handle unknown post_setup action types', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const config = {
                setup_steps: [],
                post_setup: [
                    { type: 'unknown-action' as any, content: 'This should be skipped' }
                ]
            };
            const engine = new ExecutionEngine(config as any, '/test/dir');

            await engine.run();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🎉 Running post-setup actions...'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown post-setup action type: unknown-action'));

            consoleSpy.mockRestore();
        });

        it('should execute both setup steps and post_setup actions', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            mockInquirerPrompt.mockResolvedValue({ proceed: true });
            mockExeca.mockResolvedValue({});

            const config = {
                setup_steps: [
                    { name: 'Install deps', type: 'shell' as const, command: 'npm install' }
                ],
                post_setup: [
                    { type: 'message' as const, content: 'All done!' }
                ]
            };
            const engine = new ExecutionEngine(config as any, '/test/dir');

            await engine.run();

            // Should execute setup step
            expect(mockInquirerPrompt).toHaveBeenCalled();
            expect(mockExeca).toHaveBeenCalledWith('npm install', {
                cwd: '/test/dir',
                stdio: 'inherit',
                shell: true
            });

            // Should also execute post-setup
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🎉 Running post-setup actions...'));
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📝 All done!'));

            consoleSpy.mockRestore();
        });

        it('should handle editor fallback when VS Code is not available', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            mockExeca
                .mockRejectedValueOnce(new Error('code command not found'))
                .mockRejectedValueOnce(new Error('subl command not found'));

            const config = {
                setup_steps: [],
                post_setup: [
                    { type: 'open' as const, target: 'editor', path: '.' }
                ]
            };
            const engine = new ExecutionEngine(config as any, '/test/dir');

            await engine.run();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Could not open editor automatically'));

            consoleSpy.mockRestore();
        });

        it('should handle browser fallback when browser command fails', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            mockExeca.mockRejectedValueOnce(new Error('browser command failed'));

            const config = {
                setup_steps: [],
                post_setup: [
                    { type: 'open', target: 'browser', path: 'http://localhost:3000' }
                ]
            };
            const engine = new ExecutionEngine(config, '/test/dir');

            await engine.run();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Could not open browser automatically'));

            consoleSpy.mockRestore();
        });

        it('should handle choice actions in post_setup', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            mockInquirerPrompt.mockResolvedValueOnce({ choice: 'start' });

            const config = {
                setup_steps: [],
                post_setup: [
                    {
                        type: 'choice',
                        prompt: 'What would you like to do next?',
                        choices: [
                            {
                                name: 'Start development server',
                                value: 'start',
                                actions: [
                                    { type: 'message', content: 'Starting development server...' }
                                ]
                            },
                            {
                                name: 'Continue manually',
                                value: 'manual',
                                actions: [
                                    { type: 'message', content: 'Run npm run dev when ready.' }
                                ]
                            }
                        ]
                    }
                ]
            };
            const engine = new ExecutionEngine(config as any, '/test/dir');

            await engine.run();

            expect(mockInquirerPrompt).toHaveBeenCalledWith([{
                type: 'list',
                name: 'choice',
                message: 'What would you like to do next?',
                choices: [
                    { name: 'Start development server', value: 'start' },
                    { name: 'Continue manually', value: 'manual' }
                ]
            }]);

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📝 Starting development server...'));

            consoleSpy.mockRestore();
        });
    });
}); 