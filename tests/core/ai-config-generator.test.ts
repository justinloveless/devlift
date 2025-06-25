import { jest } from '@jest/globals';
import { AIConfigGenerator } from '../../src/core/ai-config-generator.js';
import { AIProvider } from '../../src/core/ai-providers.js';
import { ProjectAnalysisResult } from '../../src/core/project-analyzer.js';

// Mock YAML import
jest.mock('js-yaml');

describe('AI Configuration Generator', () => {
    let generator: AIConfigGenerator;
    let mockAIProvider: jest.Mocked<AIProvider>;

    beforeEach(() => {
        generator = new AIConfigGenerator();

        // Create a mock AI provider
        mockAIProvider = {
            generateResponse: jest.fn(),
            validateApiKey: jest.fn()
        } as jest.Mocked<AIProvider>;
    });

    describe('generateConfig', () => {
        test('should generate dev.yml config from project analysis', async () => {
            const mockProjectData: ProjectAnalysisResult = {
                projectName: 'test-app',
                technologies: {
                    platform: 'node',
                    packageManager: 'npm',
                    frameworks: ['next', 'react'],
                    databases: ['prisma', 'postgresql'],
                    hasDocker: true,
                    hasDockerCompose: true
                },
                environmentVariables: [
                    {
                        name: 'DATABASE_URL',
                        defaultValue: 'postgresql://localhost:5432/test',
                        description: 'Database connection string'
                    },
                    {
                        name: 'API_KEY',
                        isSecret: true,
                        description: 'External API key'
                    }
                ],
                commands: {
                    install: ['npm install'],
                    dev: ['npm run dev'],
                    build: ['npm run build'],
                    test: ['npm test'],
                    database: ['npm run db:migrate']
                },
                files: {
                    'package.json': '{"name": "test-app"}',
                    'README.md': '# Test App\nRun npm install'
                }
            };

            const mockAIResponse = `# DevLift Configuration
project_name: "test-app"
version: "1"

environment:
  example_file: ".env.example"
  variables:
    - name: "DATABASE_URL"
      prompt: "Enter the database connection string:"
      default: "postgresql://localhost:5432/test"
    - name: "API_KEY"
      prompt: "Enter your API key:"
      secret: true

setup_steps:
  - name: "Install Dependencies"
    type: "package-manager"
    manager: "npm"
    command: "install"

  - name: "Start Database"
    type: "shell"
    command: "docker-compose up -d"

  - name: "Run Migrations"
    type: "shell"
    command: "npm run db:migrate"
    depends_on: ["Start Database"]

post_setup:
  - type: "message"
    content: |
      ✅ Setup complete!
      
      To start development:
      $ npm run dev
      
      Your app will be available at http://localhost:3000
`;

            mockAIProvider.generateResponse.mockResolvedValue(mockAIResponse);

            const result = await generator.generateConfig(mockProjectData, mockAIProvider);

            expect(mockAIProvider.generateResponse).toHaveBeenCalledWith(
                expect.stringContaining('test-app')
            );
            expect(result).toEqual(expect.objectContaining({
                project_name: 'test-app',
                version: '1',
                environment: expect.objectContaining({
                    example_file: '.env.example',
                    variables: expect.arrayContaining([
                        expect.objectContaining({
                            name: 'DATABASE_URL',
                            default: 'postgresql://localhost:5432/test'
                        }),
                        expect.objectContaining({
                            name: 'API_KEY',
                            secret: true
                        })
                    ])
                }),
                setup_steps: expect.arrayContaining([
                    expect.objectContaining({
                        name: 'Install Dependencies',
                        type: 'package-manager'
                    }),
                    expect.objectContaining({
                        name: 'Run Migrations',
                        depends_on: ['Start Database']
                    })
                ])
            }));
        });

        test('should handle AI response parsing errors', async () => {
            const mockProjectData: ProjectAnalysisResult = {
                projectName: 'test-app',
                technologies: {
                    platform: 'node',
                    frameworks: [],
                    databases: []
                },
                environmentVariables: [],
                commands: {
                    install: [],
                    dev: [],
                    build: [],
                    test: [],
                    database: []
                },
                files: {}
            };

            const invalidYamlResponse = `invalid: yaml: content: [unclosed`;
            mockAIProvider.generateResponse.mockResolvedValue(invalidYamlResponse);

            await expect(generator.generateConfig(mockProjectData, mockAIProvider))
                .rejects.toThrow('Failed to parse AI-generated YAML');
        });

        test('should handle AI provider errors', async () => {
            const mockProjectData: ProjectAnalysisResult = {
                projectName: 'test-app',
                technologies: {
                    platform: 'node',
                    frameworks: [],
                    databases: []
                },
                environmentVariables: [],
                commands: {
                    install: [],
                    dev: [],
                    build: [],
                    test: [],
                    database: []
                },
                files: {}
            };

            mockAIProvider.generateResponse.mockRejectedValue(new Error('API rate limit exceeded'));

            await expect(generator.generateConfig(mockProjectData, mockAIProvider))
                .rejects.toThrow('AI configuration generation failed: API rate limit exceeded');
        });
    });

    describe('buildPrompt', () => {
        test('should build comprehensive prompt for Node.js project', () => {
            const mockProjectData: ProjectAnalysisResult = {
                projectName: 'next-app',
                technologies: {
                    platform: 'node',
                    packageManager: 'yarn',
                    frameworks: ['next', 'react'],
                    databases: ['prisma'],
                    hasDocker: true,
                    hasDockerCompose: true
                },
                environmentVariables: [
                    {
                        name: 'DATABASE_URL',
                        defaultValue: 'postgresql://localhost:5432/app'
                    }
                ],
                commands: {
                    install: ['yarn install'],
                    dev: ['yarn dev'],
                    build: ['yarn build'],
                    test: ['yarn test'],
                    database: ['yarn db:migrate', 'yarn db:seed']
                },
                files: {
                    'package.json': '{"name": "next-app", "scripts": {"dev": "next dev"}}',
                    'docker-compose.yml': 'services:\n  db:\n    image: postgres:13'
                }
            };

            const prompt = generator.buildPrompt(mockProjectData);

            expect(prompt).toContain('next-app');
            expect(prompt).toContain('Node.js');
            expect(prompt).toContain('Next.js');
            expect(prompt).toContain('React');
            expect(prompt).toContain('Prisma');
            expect(prompt).toContain('yarn');
            expect(prompt).toContain('Docker');
            expect(prompt).toContain('DATABASE_URL');
            expect(prompt).toContain('yarn install');
            expect(prompt).toContain('yarn dev');
        });

        test('should build prompt for Python project', () => {
            const mockProjectData: ProjectAnalysisResult = {
                projectName: 'django-app',
                technologies: {
                    platform: 'python',
                    packageManager: 'pip',
                    frameworks: ['django'],
                    databases: ['postgresql']
                },
                environmentVariables: [
                    {
                        name: 'SECRET_KEY',
                        isSecret: true
                    }
                ],
                commands: {
                    install: ['pip install -r requirements.txt'],
                    dev: ['python manage.py runserver'],
                    build: [],
                    test: ['python manage.py test'],
                    database: ['python manage.py migrate']
                },
                files: {
                    'requirements.txt': 'django==4.0.0\npsycopg2-binary==2.9.0'
                }
            };

            const prompt = generator.buildPrompt(mockProjectData);

            expect(prompt).toContain('django-app');
            expect(prompt).toContain('Python');
            expect(prompt).toContain('Django');
            expect(prompt).toContain('PostgreSQL');
            expect(prompt).toContain('SECRET_KEY');
            expect(prompt).toContain('pip install');
            expect(prompt).toContain('python manage.py');
        });

        test('should build prompt for multi-platform project', () => {
            const mockProjectData: ProjectAnalysisResult = {
                projectName: 'full-stack-app',
                technologies: {
                    platform: 'multiple',
                    platforms: ['node', 'python'],
                    frameworks: ['react', 'django'],
                    databases: ['postgresql']
                },
                environmentVariables: [],
                commands: {
                    install: ['npm install', 'pip install -r requirements.txt'],
                    dev: ['npm run dev', 'python manage.py runserver'],
                    build: ['npm run build'],
                    test: ['npm test', 'python manage.py test'],
                    database: ['python manage.py migrate']
                },
                files: {}
            };

            const prompt = generator.buildPrompt(mockProjectData);

            expect(prompt).toContain('full-stack-app');
            expect(prompt).toContain('multiple platforms');
            expect(prompt).toContain('Node.js');
            expect(prompt).toContain('Python');
            expect(prompt).toContain('React');
            expect(prompt).toContain('Django');
        });
    });

    describe('parseAIResponse', () => {
        test('should parse valid YAML response', () => {
            const yamlResponse = `
project_name: "test-app"
version: "1"
environment:
  example_file: ".env.example"
  variables:
    - name: "DATABASE_URL"
      prompt: "Enter database URL:"
      default: "postgresql://localhost:5432/test"
setup_steps:
  - name: "Install Dependencies"
    type: "package-manager"
    manager: "npm"
    command: "install"
post_setup:
  - type: "message"
    content: "Setup complete!"
`;

            const result = generator.parseAIResponse(yamlResponse);

            expect(result).toEqual(expect.objectContaining({
                project_name: 'test-app',
                version: '1',
                environment: expect.objectContaining({
                    example_file: '.env.example'
                }),
                setup_steps: expect.arrayContaining([
                    expect.objectContaining({
                        name: 'Install Dependencies',
                        type: 'package-manager'
                    })
                ])
            }));
        });

        test('should throw error for invalid YAML', () => {
            const invalidYaml = `invalid: yaml: [unclosed`;

            expect(() => generator.parseAIResponse(invalidYaml))
                .toThrow('Failed to parse AI-generated YAML');
        });

        test('should extract YAML from markdown code blocks', () => {
            const markdownResponse = `
Here's your dev.yml configuration:

\`\`\`yaml
project_name: "test-app"
version: "1"
setup_steps:
  - name: "Install"
    type: "package-manager"
\`\`\`

This configuration will help you set up your project.
`;

            const result = generator.parseAIResponse(markdownResponse);

            expect(result).toEqual(expect.objectContaining({
                project_name: 'test-app',
                version: '1'
            }));
        });
    });

    describe('validateGeneratedConfig', () => {
        test('should validate correct dev.yml structure', () => {
            const validConfig = {
                project_name: 'test-app',
                version: '1',
                environment: {
                    example_file: '.env.example',
                    variables: [
                        {
                            name: 'DATABASE_URL',
                            prompt: 'Enter database URL:',
                            default: 'postgresql://localhost:5432/test'
                        }
                    ]
                },
                setup_steps: [
                    {
                        name: 'Install Dependencies',
                        type: 'package-manager',
                        manager: 'npm',
                        command: 'install'
                    }
                ],
                post_setup: [
                    {
                        type: 'message',
                        content: 'Setup complete!'
                    }
                ]
            };

            expect(() => generator.validateGeneratedConfig(validConfig))
                .not.toThrow();
        });

        test('should throw error for missing required fields', () => {
            const invalidConfig = {
                project_name: 'test-app'
                // Missing version and other required fields
            };

            expect(() => generator.validateGeneratedConfig(invalidConfig))
                .toThrow('Generated configuration is missing required field: version');
        });

        test('should throw error for invalid setup steps', () => {
            const invalidConfig = {
                project_name: 'test-app',
                version: '1',
                setup_steps: [
                    {
                        name: 'Install',
                        // Missing type
                        command: 'npm install'
                    }
                ]
            };

            expect(() => generator.validateGeneratedConfig(invalidConfig))
                .toThrow('Setup step is missing required field: type');
        });

        test('should throw error for invalid environment variables', () => {
            const invalidConfig = {
                project_name: 'test-app',
                version: '1',
                environment: {
                    variables: [
                        {
                            // Missing name
                            prompt: 'Enter value:'
                        }
                    ]
                }
            };

            expect(() => generator.validateGeneratedConfig(invalidConfig))
                .toThrow('Environment variable is missing required field: name');
        });
    });
}); 