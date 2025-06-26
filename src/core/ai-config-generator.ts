import yaml from 'js-yaml';
import { AIProvider } from './ai-providers.js';
import { ProjectAnalysisResult } from './project-analyzer.js';

/**
 * Interface for the generated dev.yml configuration
 */
export interface DevYmlConfig {
    project_name: string;
    version: string;
    environment?: {
        example_file?: string;
        variables?: Array<{
            name: string;
            prompt?: string;
            default?: string;
            secret?: boolean;
        }>;
    };
    setup_steps?: Array<{
        name: string;
        type: string;
        manager?: string;
        command?: string;
        depends_on?: string[];
    }>;
    post_setup?: Array<{
        type: string;
        content?: string;
        target?: string;
        path?: string;
    }>;
}

/**
 * AIConfigGenerator uses AI providers to generate dev.yml configurations
 */
export class AIConfigGenerator {
    /**
     * Generate a dev.yml configuration using AI analysis
     */
    async generateConfig(projectData: ProjectAnalysisResult, aiProvider: AIProvider): Promise<DevYmlConfig> {
        try {
            const prompt = this.buildPrompt(projectData);
            const aiResponse = await aiProvider.generateResponse(prompt);
            const parsedConfig = this.parseAIResponse(aiResponse, projectData);
            this.validateGeneratedConfig(parsedConfig);

            return parsedConfig;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`AI configuration generation failed: ${error.message}`);
            } else {
                throw new Error('AI configuration generation failed: Unknown error');
            }
        }
    }

    /**
     * Build a comprehensive prompt for AI analysis
     */
    buildPrompt(projectData: ProjectAnalysisResult): string {
        const { projectName, technologies, environmentVariables, commands, files } = projectData;

        let prompt = `Please analyze the following project information and generate a comprehensive dev.yml configuration for the DevLift tool.

## Project Information

**Project Name:** ${projectName || 'Unknown Project'}

**Platform:** ${this.formatTechnology(technologies)}

**Package Manager:** ${technologies.packageManager || 'Not detected'}

**Frameworks:** ${technologies.frameworks.length > 0 ? technologies.frameworks.join(', ') : 'None detected'}

**Databases:** ${technologies.databases.length > 0 ? technologies.databases.join(', ') : 'None detected'}

**Docker:** ${technologies.hasDocker ? 'Yes' : 'No'}${technologies.hasDockerCompose ? ' (with Docker Compose)' : ''}

## Environment Variables
${this.formatEnvironmentVariables(environmentVariables)}

## Available Commands
${this.formatCommands(commands)}

## Key Project Files
${this.formatProjectFiles(files)}

## Requirements

Please generate a dev.yml configuration that includes:

1. **Project metadata** (name and version)
2. **Environment setup** with variables from the analysis
3. **Setup steps** that install dependencies, start services, and run initial setup
4. **Post-setup instructions** with helpful information for developers

## Guidelines

- Use proper dependency ordering with \`depends_on\` where needed
- Include appropriate environment variable prompts and defaults
- Add helpful comments and instructions
- Consider the detected technologies when creating setup steps
- Include database setup if databases are detected
- Add Docker commands if Docker is detected
- Make the configuration comprehensive but not overly complex
- Ensure all setup steps have proper names and types

## Output Format

Please respond with ONLY the YAML configuration. The configuration MUST include these required fields:

- \`project_name\`: Use "${projectName || 'My Project'}" or derive from the project information
- \`version\`: Must be "1"

Example structure:
\`\`\`yaml
project_name: "${projectName || 'My Project'}"
version: "1"
environment:
  example_file: ".env.example"
  variables:
    - name: "DATABASE_URL"
      prompt: "Enter database connection string"
      default: "postgresql://localhost:5432/mydb"
setup_steps:
  - name: "Install Dependencies"
    type: "package-manager"
    command: "install"
  - name: "Setup Database"
    type: "shell"
    command: "npm run db:setup"
    depends_on: ["Install Dependencies"]
post_setup:
  - type: "message"
    content: "Setup complete! Run 'npm run dev' to start development."
\`\`\`

Please respond with ONLY the YAML configuration (no markdown code blocks or additional text):

`;

        return prompt;
    }

    /**
     * Parse AI response and extract YAML configuration
     */
    parseAIResponse(response: string, projectData?: ProjectAnalysisResult): DevYmlConfig {
        try {
            // Try to extract YAML from markdown code blocks if present
            let yamlContent = response;

            const yamlBlockMatch = response.match(/```(?:yaml|yml)?\s*\n([\s\S]*?)\n```/);
            if (yamlBlockMatch) {
                yamlContent = yamlBlockMatch[1];
            }

            // Remove any leading/trailing whitespace and comments
            yamlContent = yamlContent.trim();

            // Parse the YAML
            const parsed = yaml.load(yamlContent) as DevYmlConfig;

            if (!parsed || typeof parsed !== 'object') {
                throw new Error('Parsed YAML is not a valid object');
            }

            // Ensure required fields are present with fallbacks
            if (!parsed.project_name) {
                parsed.project_name = projectData?.projectName || 'My Project';
            }

            if (!parsed.version) {
                parsed.version = '1';
            }

            return parsed;
        } catch (error) {
            throw new Error(`Failed to parse AI-generated YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validate the generated configuration structure
     */
    validateGeneratedConfig(config: any): void {
        // Check required top-level fields
        const requiredFields = ['project_name', 'version'];
        for (const field of requiredFields) {
            if (!config[field]) {
                throw new Error(`Generated configuration is missing required field: ${field}`);
            }
        }

        // Validate version format
        if (config.version !== '1') {
            throw new Error(`Unsupported version: ${config.version}. Expected: "1"`);
        }

        // Validate environment section if present
        if (config.environment) {
            if (config.environment.variables && Array.isArray(config.environment.variables)) {
                for (const variable of config.environment.variables) {
                    if (!variable.name) {
                        throw new Error('Environment variable is missing required field: name');
                    }
                }
            }
        }

        // Validate setup_steps if present
        if (config.setup_steps && Array.isArray(config.setup_steps)) {
            for (const step of config.setup_steps) {
                if (!step.name) {
                    throw new Error('Setup step is missing required field: name');
                }
                if (!step.type) {
                    throw new Error('Setup step is missing required field: type');
                }

                // Validate step types
                const validTypes = ['package-manager', 'shell'];
                if (!validTypes.includes(step.type)) {
                    throw new Error(`Invalid setup step type: ${step.type}. Valid types: ${validTypes.join(', ')}`);
                }

                // Validate package-manager steps
                if (step.type === 'package-manager' && !step.command) {
                    throw new Error('Package-manager step is missing required field: command');
                }

                // Validate shell steps
                if (step.type === 'shell' && !step.command) {
                    throw new Error('Shell step is missing required field: command');
                }
            }
        }

        // Validate post_setup if present
        if (config.post_setup && Array.isArray(config.post_setup)) {
            for (const action of config.post_setup) {
                if (!action.type) {
                    throw new Error('Post-setup action is missing required field: type');
                }

                const validPostTypes = ['message', 'open'];
                if (!validPostTypes.includes(action.type)) {
                    throw new Error(`Invalid post-setup action type: ${action.type}. Valid types: ${validPostTypes.join(', ')}`);
                }

                if (action.type === 'message' && !action.content) {
                    throw new Error('Message post-setup action is missing required field: content');
                }

                if (action.type === 'open' && !action.target) {
                    throw new Error('Open post-setup action is missing required field: target');
                }
            }
        }
    }

    /**
     * Format technology information for the prompt
     */
    private formatTechnology(technologies: any): string {
        if (technologies.platform === 'multiple') {
            return `Multiple platforms: ${technologies.platforms?.join(', ') || 'Unknown'}`;
        }

        const platformNames = {
            node: 'Node.js',
            python: 'Python',
            go: 'Go',
            rust: 'Rust',
            java: 'Java',
            php: 'PHP',
            ruby: 'Ruby'
        };

        return platformNames[technologies.platform as keyof typeof platformNames] || technologies.platform || 'Unknown';
    }

    /**
     * Format environment variables for the prompt
     */
    private formatEnvironmentVariables(envVars: any[]): string {
        if (envVars.length === 0) {
            return 'No environment variables detected.';
        }

        const formatted = envVars.map(envVar => {
            const parts = [`- **${envVar.name}**`];

            if (envVar.defaultValue) {
                parts.push(`Default: \`${envVar.defaultValue}\``);
            }

            if (envVar.description) {
                parts.push(`Description: ${envVar.description}`);
            }

            if (envVar.isSecret) {
                parts.push('(Secret)');
            }

            return parts.join(' - ');
        });

        return formatted.join('\n');
    }

    /**
     * Format commands for the prompt
     */
    private formatCommands(commands: any): string {
        const sections = [];

        if (commands.install?.length > 0) {
            sections.push(`**Install:** ${commands.install.join(', ')}`);
        }

        if (commands.dev?.length > 0) {
            sections.push(`**Development:** ${commands.dev.join(', ')}`);
        }

        if (commands.build?.length > 0) {
            sections.push(`**Build:** ${commands.build.join(', ')}`);
        }

        if (commands.test?.length > 0) {
            sections.push(`**Test:** ${commands.test.join(', ')}`);
        }

        if (commands.database?.length > 0) {
            sections.push(`**Database:** ${commands.database.join(', ')}`);
        }

        if (commands.docker?.length > 0) {
            sections.push(`**Docker:** ${commands.docker.join(', ')}`);
        }

        return sections.length > 0 ? sections.join('\n') : 'No commands detected.';
    }

    /**
     * Format project files for the prompt
     */
    private formatProjectFiles(files: Record<string, string>): string {
        const relevantFiles = Object.keys(files).slice(0, 10); // Limit to first 10 files

        if (relevantFiles.length === 0) {
            return 'No relevant files detected.';
        }

        const formatted = relevantFiles.map(fileName => {
            const content = files[fileName];
            const truncated = content.length > 200 ? content.substring(0, 200) + '...' : content;
            return `**${fileName}:**\n\`\`\`\n${truncated}\n\`\`\``;
        });

        return formatted.join('\n\n');
    }
} 