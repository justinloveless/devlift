import fs from 'fs-extra';
import path from 'path';

// Type definitions for the analyzer
export interface EnvironmentVariable {
    name: string;
    defaultValue?: string;
    description?: string;
    isSecret?: boolean;
}

export interface TechnologyInfo {
    platform: string;
    platforms?: string[];
    packageManager?: string;
    frameworks: string[];
    databases: string[];
    hasDocker?: boolean;
    hasDockerCompose?: boolean;
}

export interface CommandInfo {
    install: string[];
    dev: string[];
    build: string[];
    test: string[];
    database: string[];
    docker?: string[];
}

export interface ProjectAnalysisResult {
    projectName?: string;
    technologies: TechnologyInfo;
    environmentVariables: EnvironmentVariable[];
    commands: CommandInfo;
    files: Record<string, string>;
}

/**
 * ProjectAnalyzer analyzes project files to extract information for AI generation
 */
export class ProjectAnalyzer {
    private readonly MAX_DEPTH = 3;
    private readonly IGNORE_DIRS = ['node_modules', '.git', '.vscode', '.idea', 'dist', 'build', 'coverage'];
    private readonly RELEVANT_FILES = [
        // Package managers
        'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
        'requirements.txt', 'Pipfile', 'Pipfile.lock', 'pyproject.toml',
        'go.mod', 'go.sum', 'Cargo.toml', 'Cargo.lock',
        'composer.json', 'composer.lock',
        'Gemfile', 'Gemfile.lock',

        // Build and configuration
        'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
        'Makefile', 'makefile',
        'webpack.config.js', 'vite.config.js', 'rollup.config.js',
        'tsconfig.json', 'jsconfig.json',
        'next.config.js', 'nuxt.config.js',

        // Environment and config
        '.env', '.env.example', '.env.template', '.env.local',
        'config.yml', 'config.yaml', 'config.json',

        // Documentation
        'README.md', 'README.rst', 'README.txt',
        'CONTRIBUTING.md', 'SETUP.md', 'INSTALL.md',

        // CI/CD
        '.github/workflows/*.yml', '.github/workflows/*.yaml',
        '.gitlab-ci.yml', '.travis.yml', 'circle.yml',
        'azure-pipelines.yml', 'buildspec.yml'
    ];

    /**
     * Analyze a project directory and extract relevant information
     */
    async analyzeProject(directory: string): Promise<ProjectAnalysisResult> {
        const files = await this.discoverFiles(directory);
        const content = await this.extractContent(files);

        const technologies = this.detectTechnologies(content);
        const environmentVariables = this.extractEnvironmentVariables(content);
        const commands = this.extractCommands(content);

        // Extract project name from package.json or directory name
        let projectName: string | undefined;
        if (content['package.json']) {
            try {
                const pkg = JSON.parse(content['package.json']);
                projectName = pkg.name;
            } catch {
                // If package.json is malformed, use directory name
                projectName = path.basename(directory);
            }
        } else {
            projectName = path.basename(directory);
        }

        return {
            projectName,
            technologies,
            environmentVariables,
            commands,
            files: content
        };
    }

    /**
     * Discover relevant files in the project directory
     */
    async discoverFiles(directory: string, depth: number = 0): Promise<string[]> {
        if (depth > this.MAX_DEPTH) {
            return [];
        }

        const files: string[] = [];

        try {
            const entries = await fs.readdir(directory);

            for (const entry of entries) {
                const fullPath = path.join(directory, entry);
                const stat = await fs.stat(fullPath);

                if (stat.isDirectory()) {
                    // Skip ignored directories
                    if (this.IGNORE_DIRS.includes(entry)) {
                        continue;
                    }

                    // Recursively scan subdirectories
                    const subFiles = await this.discoverFiles(fullPath, depth + 1);
                    files.push(...subFiles);
                } else if (stat.isFile()) {
                    // Check if this is a relevant file
                    if (this.isRelevantFile(entry, fullPath)) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (error) {
            // If we can't read the directory, skip it
            console.warn(`Could not read directory ${directory}: ${error}`);
        }

        return files;
    }

    /**
     * Extract content from discovered files
     */
    async extractContent(files: string[]): Promise<Record<string, string>> {
        const content: Record<string, string> = {};

        for (const file of files) {
            try {
                const fileContent = await fs.readFile(file, 'utf8');
                const relativePath = path.basename(file);
                content[relativePath] = fileContent;
            } catch (error) {
                // If we can't read the file, skip it
                console.warn(`Could not read file ${file}: ${error}`);
            }
        }

        return content;
    }

    /**
     * Detect technologies used in the project
     */
    detectTechnologies(content: Record<string, string>): TechnologyInfo {
        const platforms: string[] = [];
        const frameworks: string[] = [];
        const databases: string[] = [];
        let packageManager: string | undefined;
        let hasDocker = false;
        let hasDockerCompose = false;

        // Node.js detection
        if (content['package.json']) {
            platforms.push('node');
            try {
                const pkg = JSON.parse(content['package.json']);
                const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

                // Detect frameworks
                const nodeFrameworks = [
                    'react', 'vue', 'angular', 'svelte',
                    'next', 'nuxt', 'gatsby', 'astro',
                    'express', 'fastify', 'koa', 'hapi',
                    'nest', 'apollo', 'graphql'
                ];

                for (const framework of nodeFrameworks) {
                    if (allDeps[framework]) {
                        frameworks.push(framework);
                    }
                }

                // Detect databases and ORMs
                const dbLibs = [
                    'prisma', 'mongoose', 'sequelize', 'typeorm',
                    'knex', 'objection', 'bookshelf'
                ];

                for (const lib of dbLibs) {
                    if (allDeps[lib]) {
                        databases.push(lib);
                    }
                }

                // Detect database drivers
                if (allDeps['pg'] || allDeps['postgres']) databases.push('postgresql');
                if (allDeps['mysql'] || allDeps['mysql2']) databases.push('mysql');
                if (allDeps['mongodb']) databases.push('mongodb');
                if (allDeps['redis']) databases.push('redis');
            } catch {
                // Malformed package.json
            }

            // Detect package manager
            if (content['yarn.lock']) packageManager = 'yarn';
            else if (content['pnpm-lock.yaml']) packageManager = 'pnpm';
            else if (content['package-lock.json']) packageManager = 'npm';
        }

        // Python detection
        if (content['requirements.txt'] || content['Pipfile'] || content['pyproject.toml']) {
            platforms.push('python');

            const pythonContent = content['requirements.txt'] || content['Pipfile'] || '';

            // Detect frameworks
            const pythonFrameworks = ['django', 'flask', 'fastapi', 'tornado', 'pyramid'];
            for (const framework of pythonFrameworks) {
                if (pythonContent.includes(framework)) {
                    frameworks.push(framework);
                }
            }

            // Detect databases
            if (pythonContent.includes('psycopg2') || pythonContent.includes('postgresql')) {
                databases.push('postgresql');
            }
            if (pythonContent.includes('mysql')) databases.push('mysql');
            if (pythonContent.includes('sqlite')) databases.push('sqlite');

            packageManager = packageManager || 'pip';
        }

        // Go detection
        if (content['go.mod']) {
            platforms.push('go');

            const goContent = content['go.mod'];

            // Detect frameworks
            const goFrameworks = ['gin', 'echo', 'fiber', 'buffalo'];
            for (const framework of goFrameworks) {
                if (goContent.includes(framework)) {
                    frameworks.push(framework);
                }
            }
        }

        // Rust detection
        if (content['Cargo.toml']) {
            platforms.push('rust');

            const rustContent = content['Cargo.toml'];

            // Detect frameworks
            const rustFrameworks = ['actix', 'rocket', 'warp', 'axum'];
            for (const framework of rustFrameworks) {
                if (rustContent.includes(framework)) {
                    frameworks.push(framework);
                }
            }
        }

        // Docker detection
        if (content['Dockerfile']) {
            hasDocker = true;
        }

        if (content['docker-compose.yml'] || content['docker-compose.yaml']) {
            hasDockerCompose = true;

            const dockerComposeContent = content['docker-compose.yml'] || content['docker-compose.yaml'];

            // Detect databases from docker-compose
            if (dockerComposeContent.includes('postgres')) databases.push('postgresql');
            if (dockerComposeContent.includes('mysql')) databases.push('mysql');
            if (dockerComposeContent.includes('mongodb') || dockerComposeContent.includes('mongo:')) databases.push('mongodb');
            if (dockerComposeContent.includes('redis')) databases.push('redis');
        }

        // Determine platform
        let platform: string;
        if (platforms.length === 0) {
            platform = 'unknown';
        } else if (platforms.length === 1) {
            platform = platforms[0];
        } else {
            platform = 'multiple';
        }

        return {
            platform,
            platforms: platforms.length > 1 ? platforms : undefined,
            packageManager,
            frameworks: [...new Set(frameworks)], // Remove duplicates
            databases: [...new Set(databases)], // Remove duplicates
            hasDocker,
            hasDockerCompose
        };
    }

    /**
     * Extract environment variables from various sources
     */
    extractEnvironmentVariables(content: Record<string, string>): EnvironmentVariable[] {
        const envVars: EnvironmentVariable[] = [];
        const seen = new Set<string>();

        // Extract from .env files
        const envFiles = ['.env.example', '.env.template', '.env.local', '.env'];
        for (const file of envFiles) {
            if (content[file]) {
                const vars = this.parseEnvFile(content[file]);
                for (const envVar of vars) {
                    if (!seen.has(envVar.name)) {
                        seen.add(envVar.name);
                        envVars.push(envVar);
                    }
                }
            }
        }

        // Extract from documentation
        const docFiles = ['README.md', 'README.rst', 'SETUP.md', 'CONTRIBUTING.md'];
        for (const file of docFiles) {
            if (content[file]) {
                const vars = this.extractEnvFromDocs(content[file]);
                for (const envVar of vars) {
                    if (!seen.has(envVar.name)) {
                        seen.add(envVar.name);
                        envVars.push(envVar);
                    }
                }
            }
        }

        return envVars;
    }

    /**
     * Extract commands from various sources
     */
    extractCommands(content: Record<string, string>): CommandInfo {
        const commands: CommandInfo = {
            install: [],
            dev: [],
            build: [],
            test: [],
            database: []
        };

        // Extract from package.json scripts
        if (content['package.json']) {
            try {
                const pkg = JSON.parse(content['package.json']);
                if (pkg.scripts) {
                    const packageManager = this.detectPackageManager(content);

                    // Always add install command
                    commands.install.push(`${packageManager} install`);

                    for (const [script, command] of Object.entries(pkg.scripts)) {
                        if (script.includes('dev') || script === 'start') {
                            commands.dev.push(`${packageManager} run ${script}`);
                        } else if (script.includes('build')) {
                            commands.build.push(`${packageManager} run ${script}`);
                        } else if (script.includes('test')) {
                            commands.test.push(`${packageManager} run ${script}`);
                        } else if (script.includes('db') || script.includes('migrate') || script.includes('seed')) {
                            commands.database.push(`${packageManager} run ${script}`);
                        }
                    }
                }
            } catch {
                // Malformed package.json
            }
        }

        // Extract from Makefile
        if (content['Makefile'] || content['makefile']) {
            const makeContent = content['Makefile'] || content['makefile'];
            const makeTargets = this.parseMakefile(makeContent);

            for (const target of makeTargets) {
                if (target.includes('install')) {
                    commands.install.push('make install');
                } else if (target.includes('dev') || target.includes('serve')) {
                    commands.dev.push(`make ${target}`);
                } else if (target.includes('build')) {
                    commands.build.push(`make ${target}`);
                } else if (target.includes('test')) {
                    commands.test.push(`make ${target}`);
                } else if (target.includes('db') || target.includes('migrate')) {
                    commands.database.push(`make ${target}`);
                }
            }
        }

        // Extract Docker commands
        if (content['docker-compose.yml'] || content['docker-compose.yaml']) {
            commands.docker = ['docker-compose up -d'];
        }

        return commands;
    }

    /**
     * Check if a file is relevant for analysis
     */
    private isRelevantFile(filename: string, fullPath: string): boolean {
        // Check exact matches
        if (this.RELEVANT_FILES.includes(filename)) {
            return true;
        }

        // Check pattern matches (like .github/workflows/*.yml)
        if (fullPath.includes('.github/workflows/') && (filename.endsWith('.yml') || filename.endsWith('.yaml'))) {
            return true;
        }

        return false;
    }

    /**
     * Parse environment variables from .env file content
     */
    private parseEnvFile(content: string): EnvironmentVariable[] {
        const envVars: EnvironmentVariable[] = [];
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            const [name, ...valueParts] = trimmed.split('=');
            if (name && valueParts.length > 0) {
                const value = valueParts.join('=');
                const isSecret = this.isSecretVariable(name);

                envVars.push({
                    name: name.trim(),
                    defaultValue: value.trim(),
                    description: `Environment variable: ${name}`,
                    isSecret
                });
            }
        }

        return envVars;
    }

    /**
     * Extract environment variables from documentation
     */
    private extractEnvFromDocs(content: string): EnvironmentVariable[] {
        const envVars: EnvironmentVariable[] = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Look for patterns like "- ENV_VAR: description" or "ENV_VAR=value"
            const envPattern = /[-*]\s*([A-Z_][A-Z0-9_]*)\s*[:=]\s*(.+)/;
            const match = line.match(envPattern);

            if (match) {
                const [, name, description] = match;
                const isSecret = this.isSecretVariable(name);

                envVars.push({
                    name: name.trim(),
                    description: description.trim(),
                    isSecret
                });
            }
        }

        return envVars;
    }

    /**
     * Parse Makefile targets
     */
    private parseMakefile(content: string): string[] {
        const targets: string[] = [];
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('\t') && !trimmed.startsWith('#') && trimmed.includes(':')) {
                const [target] = trimmed.split(':');
                targets.push(target.trim());
            }
        }

        return targets;
    }

    /**
     * Detect package manager from lockfiles
     */
    private detectPackageManager(content: Record<string, string>): string {
        if (content['yarn.lock']) return 'yarn';
        if (content['pnpm-lock.yaml']) return 'pnpm';
        if (content['package-lock.json']) return 'npm';
        return 'npm'; // default
    }

    /**
     * Check if an environment variable should be treated as secret
     */
    private isSecretVariable(name: string): boolean {
        const secretKeywords = [
            'key', 'secret', 'password', 'token', 'auth', 'credential',
            'private', 'api_key', 'access', 'jwt', 'oauth', 'ssl'
        ];

        const lowerName = name.toLowerCase();
        return secretKeywords.some(keyword => lowerName.includes(keyword));
    }
} 