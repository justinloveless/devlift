import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Create manual mocks
const mockExeca = jest.fn() as jest.MockedFunction<any>;
const mockInquirerPrompt = jest.fn() as jest.MockedFunction<any>;

// Mock execa
jest.unstable_mockModule('execa', () => ({
    execa: mockExeca
}));

// Mock inquirer
jest.unstable_mockModule('inquirer', () => ({
    default: {
        prompt: mockInquirerPrompt
    }
}));

// Import pump command after mocking
const { default: pumpCommand } = await import('../../src/commands/pump.js');

describe('Pump Command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock console methods to avoid cluttering test output
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('should export a Command object', () => {
        expect(pumpCommand).toBeDefined();
        expect(pumpCommand.name()).toBe('pump');
        expect(pumpCommand.description()).toBe('Pump up devlift to the latest version (auto-update)');
    });

    it('should be a valid commander.js command', () => {
        expect(typeof pumpCommand.parseAsync).toBe('function');
        expect(typeof pumpCommand.action).toBe('function');
    });

    it('should show help text with options', () => {
        const helpOutput = pumpCommand.helpInformation();
        expect(helpOutput).toContain('--force');
        expect(helpOutput).toContain('--yes');
        expect(helpOutput).toContain('--check-only');
    });

    describe('version checking', () => {
        it('should check current and latest versions', async () => {
            const currentVersion = '1.0.5';
            const latestVersion = '1.0.7';

            // Mock getCurrentVersion
            mockExeca
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({
                        dependencies: { devlift: { version: currentVersion } }
                    })
                })
                // Mock getLatestVersion
                .mockResolvedValueOnce({ stdout: latestVersion });

            mockInquirerPrompt.mockResolvedValue({ shouldUpdate: false });

            await pumpCommand.parseAsync(['node', 'test']);

            expect(mockExeca).toHaveBeenCalledWith('npm', ['list', '-g', 'devlift', '--depth=0', '--json']);
            expect(mockExeca).toHaveBeenCalledWith('npm', ['view', 'devlift', 'version']);
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining(currentVersion));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining(latestVersion));
        });

        it('should handle when already on latest version', async () => {
            const currentVersion = '1.0.7';
            const latestVersion = '1.0.7';

            mockExeca
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({
                        dependencies: { devlift: { version: currentVersion } }
                    })
                })
                .mockResolvedValueOnce({ stdout: latestVersion });

            await pumpCommand.parseAsync(['node', 'test']);

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('already pumped up')
            );
        });

        it('should handle when running ahead of latest (pre-release)', async () => {
            const currentVersion = '1.1.0';
            const latestVersion = '1.0.7';

            mockExeca
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({
                        dependencies: { devlift: { version: currentVersion } }
                    })
                })
                .mockResolvedValueOnce({ stdout: latestVersion });

            await pumpCommand.parseAsync(['node', 'test']);

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('ahead of the game')
            );
        });
    });

    describe('update scenarios', () => {
        it('should update when outdated version is detected', async () => {
            const currentVersion = '1.0.5';
            const latestVersion = '1.0.7';
            const newVersion = '1.0.7';

            mockExeca
                // getCurrentVersion
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({
                        dependencies: { devlift: { version: currentVersion } }
                    })
                })
                // getLatestVersion
                .mockResolvedValueOnce({ stdout: latestVersion })
                // updateDevlift
                .mockResolvedValueOnce({ stdout: 'updated' })
                // verify update
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({
                        dependencies: { devlift: { version: newVersion } }
                    })
                });

            mockInquirerPrompt.mockResolvedValue({ shouldUpdate: true });

            await pumpCommand.parseAsync(['node', 'test']);

            expect(mockInquirerPrompt).toHaveBeenCalledWith([{
                type: 'confirm',
                name: 'shouldUpdate',
                message: `Ready to pump up to devlift@${latestVersion}?`,
                default: true
            }]);

            expect(mockExeca).toHaveBeenCalledWith('npm', ['install', '-g', 'devlift@latest'], {
                stdio: 'inherit'
            });

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining(`Successfully pumped up to version ${newVersion}`)
            );
        });

        it('should skip update when user declines', async () => {
            const currentVersion = '1.0.5';
            const latestVersion = '1.0.7';

            mockExeca
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({
                        dependencies: { devlift: { version: currentVersion } }
                    })
                })
                .mockResolvedValueOnce({ stdout: latestVersion });

            mockInquirerPrompt.mockResolvedValue({ shouldUpdate: false });

            await pumpCommand.parseAsync(['node', 'test']);

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Skipping pump session')
            );

            // Should not call npm install
            expect(mockExeca).not.toHaveBeenCalledWith(
                'npm',
                ['install', '-g', 'devlift@latest'],
                expect.anything()
            );
        });

        it('should force update with --force flag', async () => {
            const currentVersion = '1.0.7';
            const latestVersion = '1.0.7';

            mockExeca
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({
                        dependencies: { devlift: { version: currentVersion } }
                    })
                })
                .mockResolvedValueOnce({ stdout: latestVersion })
                .mockResolvedValueOnce({ stdout: 'updated' })
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({
                        dependencies: { devlift: { version: latestVersion } }
                    })
                });

            mockInquirerPrompt.mockResolvedValue({ shouldUpdate: true });

            await pumpCommand.parseAsync(['node', 'test', '--force']);

            expect(mockInquirerPrompt).toHaveBeenCalledWith([{
                type: 'confirm',
                name: 'shouldUpdate',
                message: `Force reinstall devlift@${latestVersion}?`,
                default: true
            }]);

            expect(mockExeca).toHaveBeenCalledWith('npm', ['install', '-g', 'devlift@latest'], {
                stdio: 'inherit'
            });
        });

        it('should skip prompts with --yes flag', async () => {
            const currentVersion = '1.0.5';
            const latestVersion = '1.0.7';

            mockExeca
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({
                        dependencies: { devlift: { version: currentVersion } }
                    })
                })
                .mockResolvedValueOnce({ stdout: latestVersion })
                .mockResolvedValueOnce({ stdout: 'updated' })
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({
                        dependencies: { devlift: { version: latestVersion } }
                    })
                });

            await pumpCommand.parseAsync(['node', 'test', '--yes']);

            expect(mockInquirerPrompt).not.toHaveBeenCalled();
            expect(mockExeca).toHaveBeenCalledWith('npm', ['install', '-g', 'devlift@latest'], {
                stdio: 'inherit'
            });
        });

        it('should only check versions with --check-only flag', async () => {
            const currentVersion = '1.0.5';
            const latestVersion = '1.0.7';

            mockExeca
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({
                        dependencies: { devlift: { version: currentVersion } }
                    })
                })
                .mockResolvedValueOnce({ stdout: latestVersion });

            await pumpCommand.parseAsync(['node', 'test', '--check-only']);

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('Check complete! Use "dev pump"')
            );

            // Should not prompt or update
            expect(mockInquirerPrompt).not.toHaveBeenCalled();
            expect(mockExeca).not.toHaveBeenCalledWith(
                'npm',
                ['install', '-g', 'devlift@latest'],
                expect.anything()
            );
        });
    });

    describe('error handling', () => {
        it('should handle npm list command failure gracefully', async () => {
            // First call to npm list fails, fallback to npm view
            mockExeca
                .mockRejectedValueOnce(new Error('npm list failed'))
                .mockResolvedValueOnce({ stdout: '1.0.5' }) // fallback getCurrentVersion
                .mockResolvedValueOnce({ stdout: '1.0.7' }); // getLatestVersion

            mockInquirerPrompt.mockResolvedValue({ shouldUpdate: false });

            await pumpCommand.parseAsync(['node', 'test']);

            expect(mockExeca).toHaveBeenCalledWith('npm', ['view', 'devlift', 'version']);
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1.0.5'));
        });

        it('should handle npm view command failure', async () => {
            mockExeca
                .mockRejectedValueOnce(new Error('npm list failed'))
                .mockRejectedValueOnce(new Error('npm view failed'))
                .mockResolvedValueOnce({ stdout: '1.0.7' }); // getLatestVersion still works

            await expect(pumpCommand.parseAsync(['node', 'test']))
                .rejects.toThrow('Could not determine current devlift version');
        });

        it('should handle update failure', async () => {
            const currentVersion = '1.0.5';
            const latestVersion = '1.0.7';

            mockExeca
                .mockResolvedValueOnce({
                    stdout: JSON.stringify({
                        dependencies: { devlift: { version: currentVersion } }
                    })
                })
                .mockResolvedValueOnce({ stdout: latestVersion })
                .mockRejectedValueOnce(new Error('npm install failed'));

            mockInquirerPrompt.mockResolvedValue({ shouldUpdate: true });

            await expect(pumpCommand.parseAsync(['node', 'test']))
                .rejects.toThrow('Failed to update devlift');

            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('Pump session failed')
            );
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('Troubleshooting tips')
            );
        });
    });

    describe('version comparison', () => {
        it('should correctly identify outdated versions', async () => {
            const testCases = [
                { current: '1.0.5', latest: '1.0.7', expected: 'outdated' },
                { current: '1.0.0', latest: '1.1.0', expected: 'outdated' },
                { current: '0.9.9', latest: '1.0.0', expected: 'outdated' },
            ];

            for (const testCase of testCases) {
                mockExeca
                    .mockResolvedValueOnce({
                        stdout: JSON.stringify({
                            dependencies: { devlift: { version: testCase.current } }
                        })
                    })
                    .mockResolvedValueOnce({ stdout: testCase.latest });

                mockInquirerPrompt.mockResolvedValue({ shouldUpdate: false });

                await pumpCommand.parseAsync(['node', 'test']);

                expect(console.log).toHaveBeenCalledWith(
                    expect.stringContaining('Time to level up!')
                );

                jest.clearAllMocks();
                jest.spyOn(console, 'log').mockImplementation(() => { });
            }
        });
    });
}); 