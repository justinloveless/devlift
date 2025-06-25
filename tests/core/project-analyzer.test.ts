import { jest } from '@jest/globals';
import { ProjectAnalyzer } from '../../src/core/project-analyzer.js';
import fs from 'fs-extra';
import path from 'path';

// Mock fs-extra
jest.mock('fs-extra');

describe('Project Content Analyzer', () => {
    let analyzer: ProjectAnalyzer;
    const mockFs = fs as jest.Mocked<typeof fs>;

    beforeEach(() => {
        jest.clearAllMocks();
        analyzer = new ProjectAnalyzer();
    });

    describe('discoverFiles', () => {
        test('should discover relevant project files', async () => {
            const mockFiles = [
                'package.json',
                'requirements.txt',
                'docker-compose.yml',
                '.env.example',
                'README.md',
                'src/index.js',
                'node_modules/test.js', // Should be ignored
                '.git/config', // Should be ignored
                'Dockerfile',
                'Makefile',
                'go.mod',
                'Cargo.toml'
            ];

            mockFs.readdir.mockResolvedValue(mockFiles as any);
            mockFs.stat.mockImplementation((filePath: string) => {
                const fileName = path.basename(filePath as string);
                return Promise.resolve({
                    isDirectory: () => ['node_modules', '.git', 'src'].includes(fileName),
                    isFile: () => !['node_modules', '.git', 'src'].includes(fileName)
                } as any);
            });

            const result = await analyzer.discoverFiles('/test/project');

            expect(result).toEqual(expect.arrayContaining([
                expect.stringContaining('package.json'),
                expect.stringContaining('requirements.txt'),
                expect.stringContaining('docker-compose.yml'),
                expect.stringContaining('.env.example'),
                expect.stringContaining('README.md'),
                expect.stringContaining('Dockerfile'),
                expect.stringContaining('Makefile'),
                expect.stringContaining('go.mod'),
                expect.stringContaining('Cargo.toml')
            ]));

            expect(result).not.toEqual(expect.arrayContaining([
                expect.stringContaining('node_modules'),
                expect.stringContaining('.git')
            ]));
        });

        test('should handle directories recursively up to max depth', async () => {
            mockFs.readdir.mockImplementation((dirPath: string) => {
                if (dirPath.includes('src')) {
                    return Promise.resolve(['index.js', 'config.js'] as any);
                }
                return Promise.resolve(['package.json', 'src'] as any);
            });

            mockFs.stat.mockImplementation((filePath: string) => {
                const fileName = path.basename(filePath as string);
                return Promise.resolve({
                    isDirectory: () => fileName === 'src',
                    isFile: () => fileName !== 'src'
                } as any);
            });

            const result = await analyzer.discoverFiles('/test/project');

            expect(mockFs.readdir).toHaveBeenCalledWith('/test/project');
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('extractContent', () => {
        test('should extract content from various file types', async () => {
            const mockFiles = [
                '/test/package.json',
                '/test/README.md',
                '/test/.env.example',
                '/test/docker-compose.yml'
            ];

            const mockContents = {
                '/test/package.json': JSON.stringify({
                    name: 'test-project',
                    scripts: {
                        dev: 'next dev',
                        build: 'next build',
                        start: 'next start',
                        'db:migrate': 'prisma migrate dev'
                    },
                    dependencies: {
                        'next': '^13.0.0',
                        'prisma': '^4.0.0'
                    }
                }),
                '/test/README.md': '# Test Project\n\n## Setup\n\nRun `npm install` then `npm run dev`',
                '/test/.env.example': 'DATABASE_URL=postgresql://localhost:5432/test\nAPI_KEY=your-api-key-here',
                '/test/docker-compose.yml': 'version: "3.8"\nservices:\n  db:\n    image: postgres:13'
            };

            mockFs.readFile.mockImplementation((filePath: string) => {
                return Promise.resolve(mockContents[filePath as keyof typeof mockContents] || '');
            });

            const result = await analyzer.extractContent(mockFiles);

            expect(result).toHaveProperty('package.json');
            expect(result).toHaveProperty('README.md');
            expect(result).toHaveProperty('.env.example');
            expect(result).toHaveProperty('docker-compose.yml');

            expect(result['package.json']).toContain('test-project');
            expect(result['README.md']).toContain('npm install');
            expect(result['.env.example']).toContain('DATABASE_URL');
            expect(result['docker-compose.yml']).toContain('postgres');
        });

        test('should handle file read errors gracefully', async () => {
            const mockFiles = ['/test/package.json', '/test/missing.json'];

            mockFs.readFile.mockImplementation((filePath: string) => {
                if (filePath.includes('missing')) {
                    return Promise.reject(new Error('File not found'));
                }
                return Promise.resolve('{"name": "test"}');
            });

            const result = await analyzer.extractContent(mockFiles);

            expect(result).toHaveProperty('package.json');
            expect(result).not.toHaveProperty('missing.json');
        });
    });

    describe('detectTechnologies', () => {
        test('should detect Node.js/JavaScript technologies', () => {
            const content = {
                'package.json': JSON.stringify({
                    dependencies: {
                        'next': '^13.0.0',
                        'react': '^18.0.0',
                        'prisma': '^4.0.0',
                        'express': '^4.18.0'
                    }
                }),
                'yarn.lock': 'yarn lock file content'
            };

            const result = analyzer.detectTechnologies(content);

            expect(result).toEqual(expect.objectContaining({
                platform: 'node',
                packageManager: 'yarn',
                frameworks: expect.arrayContaining(['next', 'react', 'express']),
                databases: expect.arrayContaining(['prisma'])
            }));
        });

        test('should detect Python technologies', () => {
            const content = {
                'requirements.txt': 'django==4.0.0\npsycopg2-binary==2.9.0\ncelery==5.2.0',
                'Pipfile': '[packages]\ndjango = "*"'
            };

            const result = analyzer.detectTechnologies(content);

            expect(result).toEqual(expect.objectContaining({
                platform: 'python',
                packageManager: 'pip',
                frameworks: expect.arrayContaining(['django']),
                databases: expect.arrayContaining(['postgresql'])
            }));
        });

        test('should detect Docker setup', () => {
            const content = {
                'Dockerfile': 'FROM node:18\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install',
                'docker-compose.yml': 'services:\n  app:\n    build: .\n  db:\n    image: postgres:13'
            };

            const result = analyzer.detectTechnologies(content);

            expect(result).toEqual(expect.objectContaining({
                hasDocker: true,
                hasDockerCompose: true,
                databases: expect.arrayContaining(['postgresql'])
            }));
        });

        test('should detect multiple platforms', () => {
            const content = {
                'package.json': JSON.stringify({ dependencies: { 'express': '^4.0.0' } }),
                'requirements.txt': 'flask==2.0.0',
                'go.mod': 'module test\ngo 1.19'
            };

            const result = analyzer.detectTechnologies(content);

            expect(result.platform).toBe('multiple');
            expect(result.platforms).toEqual(expect.arrayContaining(['node', 'python', 'go']));
        });
    });

    describe('extractEnvironmentVariables', () => {
        test('should extract environment variables from .env files', () => {
            const content = {
                '.env.example': 'DATABASE_URL=postgresql://localhost:5432/test\nAPI_KEY=your-api-key\nPORT=3000',
                '.env.template': 'REDIS_URL=redis://localhost:6379\nSECRET_KEY=change-me'
            };

            const result = analyzer.extractEnvironmentVariables(content);

            expect(result).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    name: 'DATABASE_URL',
                    defaultValue: 'postgresql://localhost:5432/test',
                    description: expect.any(String)
                }),
                expect.objectContaining({
                    name: 'API_KEY',
                    defaultValue: 'your-api-key',
                    isSecret: true
                }),
                expect.objectContaining({
                    name: 'PORT',
                    defaultValue: '3000'
                })
            ]));
        });

        test('should extract environment variables from documentation', () => {
            const content = {
                'README.md': `# Setup
                
                Set the following environment variables:
                - DATABASE_URL: Connection string for the database
                - API_KEY: Your API key (keep this secret!)
                - DEBUG: Set to true for development
                `
            };

            const result = analyzer.extractEnvironmentVariables(content);

            expect(result).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    name: 'DATABASE_URL',
                    description: expect.stringContaining('database')
                }),
                expect.objectContaining({
                    name: 'API_KEY',
                    isSecret: true
                }),
                expect.objectContaining({
                    name: 'DEBUG'
                })
            ]));
        });
    });

    describe('extractCommands', () => {
        test('should extract commands from package.json scripts', () => {
            const content = {
                'package.json': JSON.stringify({
                    scripts: {
                        dev: 'next dev',
                        build: 'next build',
                        start: 'next start',
                        test: 'jest',
                        'db:migrate': 'prisma migrate dev',
                        'db:seed': 'node scripts/seed.js'
                    }
                })
            };

            const result = analyzer.extractCommands(content);

            expect(result).toEqual(expect.objectContaining({
                install: expect.arrayContaining(['npm install']),
                dev: expect.arrayContaining(['npm run dev']),
                build: expect.arrayContaining(['npm run build']),
                test: expect.arrayContaining(['npm run test']),
                database: expect.arrayContaining(['npm run db:migrate', 'npm run db:seed'])
            }));
        });

        test('should extract commands from Makefile', () => {
            const content = {
                'Makefile': `
install:
\tnpm install
\techo "Installation complete"

dev:
\tnpm run dev

build:
\tnpm run build

test:
\tnpm test

db-setup:
\tdocker-compose up -d db
\tnpm run db:migrate
`
            };

            const result = analyzer.extractCommands(content);

            expect(result).toEqual(expect.objectContaining({
                install: expect.arrayContaining(['make install']),
                dev: expect.arrayContaining(['make dev']),
                build: expect.arrayContaining(['make build']),
                test: expect.arrayContaining(['make test']),
                database: expect.arrayContaining(['make db-setup'])
            }));
        });

        test('should extract commands from docker-compose.yml', () => {
            const content = {
                'docker-compose.yml': `
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: testdb
`
            };

            const result = analyzer.extractCommands(content);

            expect(result.docker).toEqual(expect.arrayContaining([
                'docker-compose up -d'
            ]));
        });
    });

    describe('analyzeProject', () => {
        test('should perform complete project analysis', async () => {
            const mockFiles = ['/test/package.json', '/test/README.md', '/test/.env.example'];
            const mockContents = {
                '/test/package.json': JSON.stringify({
                    name: 'test-project',
                    scripts: { dev: 'next dev' },
                    dependencies: { 'next': '^13.0.0' }
                }),
                '/test/README.md': '# Test Project\nRun npm install',
                '/test/.env.example': 'DATABASE_URL=postgresql://localhost:5432/test'
            };

            mockFs.readdir.mockResolvedValue(['package.json', 'README.md', '.env.example'] as any);
            mockFs.stat.mockResolvedValue({ isDirectory: () => false, isFile: () => true } as any);
            mockFs.readFile.mockImplementation((filePath: string) => {
                return Promise.resolve(mockContents[filePath as keyof typeof mockContents] || '');
            });

            const result = await analyzer.analyzeProject('/test/project');

            expect(result).toEqual(expect.objectContaining({
                projectName: 'test-project',
                technologies: expect.objectContaining({
                    platform: 'node',
                    frameworks: expect.arrayContaining(['next'])
                }),
                environmentVariables: expect.arrayContaining([
                    expect.objectContaining({ name: 'DATABASE_URL' })
                ]),
                commands: expect.objectContaining({
                    dev: expect.arrayContaining(['npm run dev'])
                }),
                files: expect.objectContaining({
                    'package.json': expect.any(String)
                })
            }));
        });
    });
}); 