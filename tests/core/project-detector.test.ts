import { jest } from '@jest/globals';
import path from 'path';

// Mock dependencies
const mockFs = {
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn(),
    readFileSync: jest.fn()
};

// Import the class we'll create
import { ProjectDetector, ProjectType, DetectedProject, ProjectIndicator } from '../../src/core/project-detector.js';

describe('ProjectDetector', () => {
    let detector: ProjectDetector;
    let mockDependencies: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDependencies = {
            fs: mockFs
        };

        detector = new ProjectDetector(mockDependencies);
    });

    describe('Node.js project detection', () => {
        it('should detect Node.js project with package.json', async () => {
            mockFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('package.json');
            });
            mockFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'test-project',
                scripts: { start: 'node index.js', dev: 'nodemon index.js' }
            }));

            const result = await detector.detectProjectTypes('/test/path');

            expect(result.detectedTypes).toContain(ProjectType.NODEJS);
            const nodeProject = result.projects.find(p => p.type === ProjectType.NODEJS);
            expect(nodeProject).toBeDefined();
            expect(nodeProject?.confidence).toBeGreaterThan(0.8);
            expect(nodeProject?.indicators).toContain(ProjectIndicator.PACKAGE_JSON);
        });

        it('should detect package manager from lockfiles', async () => {
            mockFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('package.json') || filePath.includes('pnpm-lock.yaml');
            });
            mockFs.readFileSync.mockReturnValue(JSON.stringify({ name: 'test' }));

            const result = await detector.detectProjectTypes('/test/path');

            const nodeProject = result.projects.find(p => p.type === ProjectType.NODEJS);
            expect(nodeProject?.metadata.packageManager).toBe('pnpm');
            expect(nodeProject?.indicators).toContain(ProjectIndicator.PNPM_LOCK);
        });

        it('should detect yarn from yarn.lock', async () => {
            mockFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('package.json') || filePath.includes('yarn.lock');
            });
            mockFs.readFileSync.mockReturnValue(JSON.stringify({ name: 'test' }));

            const result = await detector.detectProjectTypes('/test/path');

            const nodeProject = result.projects.find(p => p.type === ProjectType.NODEJS);
            expect(nodeProject?.metadata.packageManager).toBe('yarn');
        });

        it('should default to npm when no lockfile found', async () => {
            mockFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('package.json');
            });
            mockFs.readFileSync.mockReturnValue(JSON.stringify({ name: 'test' }));

            const result = await detector.detectProjectTypes('/test/path');

            const nodeProject = result.projects.find(p => p.type === ProjectType.NODEJS);
            expect(nodeProject?.metadata.packageManager).toBe('npm');
        });
    });

    describe('Python project detection', () => {
        it('should detect Python project with requirements.txt', async () => {
            mockFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('requirements.txt');
            });
            mockFs.readFileSync.mockReturnValue('flask==2.0.1\nrequests==2.25.1');

            const result = await detector.detectProjectTypes('/test/path');

            expect(result.detectedTypes).toContain(ProjectType.PYTHON);
            const pythonProject = result.projects.find(p => p.type === ProjectType.PYTHON);
            expect(pythonProject?.indicators).toContain(ProjectIndicator.REQUIREMENTS_TXT);
            expect(pythonProject?.metadata.dependencies).toContain('flask');
        });

        it('should detect Poetry project', async () => {
            mockFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('pyproject.toml') || filePath.includes('poetry.lock');
            });
            mockFs.readFileSync.mockReturnValue('[tool.poetry]\nname = "test"');

            const result = await detector.detectProjectTypes('/test/path');

            const pythonProject = result.projects.find(p => p.type === ProjectType.PYTHON);
            expect(pythonProject?.metadata.packageManager).toBe('poetry');
            expect(pythonProject?.indicators).toContain(ProjectIndicator.PYPROJECT_TOML);
        });

        it('should detect Pipenv project', async () => {
            mockFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('Pipfile');
            });
            mockFs.readFileSync.mockReturnValue('[packages]\nflask = "*"');

            const result = await detector.detectProjectTypes('/test/path');

            const pythonProject = result.projects.find(p => p.type === ProjectType.PYTHON);
            expect(pythonProject?.metadata.packageManager).toBe('pipenv');
        });
    });

    describe('Docker project detection', () => {
        it('should detect Docker project with Dockerfile', async () => {
            mockFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('Dockerfile');
            });
            mockFs.readFileSync.mockReturnValue('FROM node:16\nWORKDIR /app');

            const result = await detector.detectProjectTypes('/test/path');

            expect(result.detectedTypes).toContain(ProjectType.DOCKER);
            const dockerProject = result.projects.find(p => p.type === ProjectType.DOCKER);
            expect(dockerProject?.indicators).toContain(ProjectIndicator.DOCKERFILE);
            expect(dockerProject?.metadata.baseImage).toBe('node:16');
        });

        it('should detect Docker Compose project', async () => {
            mockFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('docker-compose.yml');
            });
            mockFs.readFileSync.mockReturnValue('version: "3"\nservices:\n  web:\n    build: .');

            const result = await detector.detectProjectTypes('/test/path');

            const dockerProject = result.projects.find(p => p.type === ProjectType.DOCKER);
            expect(dockerProject?.indicators).toContain(ProjectIndicator.DOCKER_COMPOSE);
            expect(dockerProject?.metadata.hasCompose).toBe(true);
        });
    });

    describe('Database project detection', () => {
        it('should detect database project with migrations folder', async () => {
            mockFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('migrations') || filePath.includes('schema.sql');
            });
            mockFs.statSync.mockReturnValue({ isDirectory: () => true });

            const result = await detector.detectProjectTypes('/test/path');

            expect(result.detectedTypes).toContain(ProjectType.DATABASE);
            const dbProject = result.projects.find(p => p.type === ProjectType.DATABASE);
            expect(dbProject?.indicators).toContain(ProjectIndicator.MIGRATIONS_DIR);
        });

        it('should detect Prisma project', async () => {
            mockFs.existsSync.mockImplementation((filePath: any) => {
                // Handle both forward and backward slashes for cross-platform compatibility
                const normalizedPath = filePath.replace(/\\/g, '/');
                return normalizedPath.endsWith('prisma/schema.prisma');
            });
            mockFs.readFileSync.mockReturnValue('generator client {\n  provider = "prisma-client-js"\n}');

            const result = await detector.detectProjectTypes('/test/path');

            const dbProject = result.projects.find(p => p.type === ProjectType.DATABASE);
            expect(dbProject?.metadata.orm).toBe('prisma');
            expect(dbProject?.indicators).toContain(ProjectIndicator.PRISMA_SCHEMA);
        });
    });

    describe('Multi-technology projects', () => {
        it('should detect multiple project types', async () => {
            mockFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('package.json') ||
                    filePath.includes('Dockerfile') ||
                    filePath.includes('requirements.txt');
            });
            mockFs.readFileSync.mockImplementation((filePath: string) => {
                if (filePath.includes('package.json')) {
                    return JSON.stringify({ name: 'test' });
                }
                if (filePath.includes('Dockerfile')) {
                    return 'FROM python:3.9';
                }
                if (filePath.includes('requirements.txt')) {
                    return 'flask==2.0.1';
                }
                return '';
            });

            const result = await detector.detectProjectTypes('/test/path');

            expect(result.detectedTypes).toContain(ProjectType.NODEJS);
            expect(result.detectedTypes).toContain(ProjectType.PYTHON);
            expect(result.detectedTypes).toContain(ProjectType.DOCKER);
            expect(result.projects).toHaveLength(3);
        });

        it('should calculate confidence scores correctly', async () => {
            mockFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('package.json') || filePath.includes('yarn.lock');
            });
            mockFs.readFileSync.mockReturnValue(JSON.stringify({
                name: 'test',
                scripts: { start: 'node index.js', dev: 'nodemon', test: 'jest' }
            }));

            const result = await detector.detectProjectTypes('/test/path');

            const nodeProject = result.projects.find(p => p.type === ProjectType.NODEJS);
            expect(nodeProject?.confidence).toBeGreaterThan(0.9); // High confidence with multiple indicators
        });
    });

    describe('unknown projects', () => {
        it('should return empty result for unknown project types', async () => {
            mockFs.existsSync.mockReturnValue(false);

            const result = await detector.detectProjectTypes('/test/path');

            expect(result.detectedTypes).toHaveLength(0);
            expect(result.projects).toHaveLength(0);
            expect(result.confidence).toBe(0);
        });

        it('should handle file read errors gracefully', async () => {
            // Mock to indicate files exist but reading fails
            mockFs.existsSync.mockImplementation((filePath: any) => {
                return filePath.includes('package.json');
            });
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error('File read error');
            });

            const result = await detector.detectProjectTypes('/test/path');

            // Should still detect the project type but with limited metadata
            expect(result.detectedTypes).toContain(ProjectType.NODEJS);
            const nodeProject = result.projects.find(p => p.type === ProjectType.NODEJS);
            expect(nodeProject?.metadata.name).toBeUndefined(); // No metadata due to read error
        });
    });

    describe('environment variable detection', () => {
        it('should detect environment variables from .env.example', async () => {
            mockFs.existsSync.mockImplementation((filePath: string) => {
                return filePath.includes('.env.example') || filePath.includes('package.json');
            });
            mockFs.readFileSync.mockImplementation((filePath: string) => {
                if (filePath.includes('.env.example')) {
                    return 'DATABASE_URL=postgresql://localhost:5432/test\nAPI_KEY=your_key_here';
                }
                return JSON.stringify({ name: 'test' });
            });

            const result = await detector.detectProjectTypes('/test/path');

            expect(result.environmentVariables).toContain('DATABASE_URL');
            expect(result.environmentVariables).toContain('API_KEY');
        });
    });
}); 