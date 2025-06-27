import fs from 'fs-extra';
import path from 'path';

export enum ProjectType {
    NODEJS = 'nodejs',
    PYTHON = 'python',
    DOCKER = 'docker',
    DATABASE = 'database'
}

export enum ProjectIndicator {
    // Node.js indicators
    PACKAGE_JSON = 'package.json',
    YARN_LOCK = 'yarn.lock',
    PNPM_LOCK = 'pnpm-lock.yaml',
    PACKAGE_LOCK = 'package-lock.json',
    NODE_MODULES = 'node_modules',

    // Python indicators
    REQUIREMENTS_TXT = 'requirements.txt',
    SETUP_PY = 'setup.py',
    PYPROJECT_TOML = 'pyproject.toml',
    PIPFILE = 'Pipfile',
    POETRY_LOCK = 'poetry.lock',

    // Docker indicators
    DOCKERFILE = 'Dockerfile',
    DOCKER_COMPOSE = 'docker-compose.yml',
    DOCKER_COMPOSE_YAML = 'docker-compose.yaml',

    // Database indicators
    MIGRATIONS_DIR = 'migrations/',
    SCHEMA_SQL = 'schema.sql',
    PRISMA_SCHEMA = 'prisma/schema.prisma',

    // Environment indicators
    ENV_EXAMPLE = '.env.example',
    ENV_TEMPLATE = '.env.template'
}

export interface DetectedProject {
    type: ProjectType;
    confidence: number;
    indicators: ProjectIndicator[];
    metadata: Record<string, any>;
}

export interface ProjectDetectionResult {
    detectedTypes: ProjectType[];
    projects: DetectedProject[];
    confidence: number;
    environmentVariables: string[];
}

export interface ProjectDetectorDependencies {
    fs: typeof fs;
}

export class ProjectDetector {
    private deps: ProjectDetectorDependencies;

    constructor(deps?: Partial<ProjectDetectorDependencies>) {
        this.deps = {
            fs: fs,
            ...deps
        };
    }

    /**
     * Main entry point to detect project types in a directory
     */
    async detectProjectTypes(directory: string): Promise<ProjectDetectionResult> {
        try {
            const projects: DetectedProject[] = [];
            const environmentVariables: string[] = [];

            // Detect each project type
            const nodeProject = await this.detectNodeJs(directory);
            if (nodeProject) projects.push(nodeProject);

            const pythonProject = await this.detectPython(directory);
            if (pythonProject) projects.push(pythonProject);

            const dockerProject = await this.detectDocker(directory);
            if (dockerProject) projects.push(dockerProject);

            const databaseProject = await this.detectDatabase(directory);
            if (databaseProject) projects.push(databaseProject);

            // Detect environment variables
            const envVars = await this.detectEnvironmentVariables(directory);
            environmentVariables.push(...envVars);

            // Calculate overall confidence
            const overallConfidence = projects.length > 0
                ? projects.reduce((sum, p) => sum + p.confidence, 0) / projects.length
                : 0;

            return {
                detectedTypes: projects.map(p => p.type),
                projects,
                confidence: overallConfidence,
                environmentVariables
            };
        } catch (error) {
            // Return empty result on error
            return {
                detectedTypes: [],
                projects: [],
                confidence: 0,
                environmentVariables: []
            };
        }
    }

    /**
     * Detect Node.js projects
     */
    private async detectNodeJs(directory: string): Promise<DetectedProject | null> {
        const indicators: ProjectIndicator[] = [];
        const metadata: Record<string, any> = {};

        // Check for package.json
        const packageJsonPath = path.join(directory, 'package.json');
        if (!this.deps.fs.existsSync(packageJsonPath)) {
            return null;
        }

        indicators.push(ProjectIndicator.PACKAGE_JSON);

        try {
            const packageJson = JSON.parse(this.deps.fs.readFileSync(packageJsonPath, 'utf8'));
            metadata.name = packageJson.name;
            metadata.scripts = packageJson.scripts || {};
            metadata.dependencies = Object.keys(packageJson.dependencies || {});
            metadata.devDependencies = Object.keys(packageJson.devDependencies || {});
        } catch (error) {
            // Continue even if package.json is malformed
        }

        // Detect package manager
        if (this.deps.fs.existsSync(path.join(directory, 'pnpm-lock.yaml'))) {
            indicators.push(ProjectIndicator.PNPM_LOCK);
            metadata.packageManager = 'pnpm';
        } else if (this.deps.fs.existsSync(path.join(directory, 'yarn.lock'))) {
            indicators.push(ProjectIndicator.YARN_LOCK);
            metadata.packageManager = 'yarn';
        } else if (this.deps.fs.existsSync(path.join(directory, 'package-lock.json'))) {
            indicators.push(ProjectIndicator.PACKAGE_LOCK);
            metadata.packageManager = 'npm';
        } else {
            metadata.packageManager = 'npm'; // Default
        }

        // Check for node_modules
        if (this.deps.fs.existsSync(path.join(directory, 'node_modules'))) {
            indicators.push(ProjectIndicator.NODE_MODULES);
        }

        // Calculate confidence based on indicators and content
        const confidence = this.calculateConfidence(indicators, metadata);

        return {
            type: ProjectType.NODEJS,
            confidence,
            indicators,
            metadata
        };
    }

    /**
     * Detect Python projects
     */
    private async detectPython(directory: string): Promise<DetectedProject | null> {
        const indicators: ProjectIndicator[] = [];
        const metadata: Record<string, any> = {};
        let hasAnyPythonIndicator = false;

        // Check for requirements.txt
        const requirementsPath = path.join(directory, 'requirements.txt');
        if (this.deps.fs.existsSync(requirementsPath)) {
            indicators.push(ProjectIndicator.REQUIREMENTS_TXT);
            metadata.packageManager = 'pip';
            hasAnyPythonIndicator = true;

            try {
                const requirements = this.deps.fs.readFileSync(requirementsPath, 'utf8');
                metadata.dependencies = requirements.split('\n')
                    .filter(line => line.trim() && !line.startsWith('#'))
                    .map(line => line.split('==')[0].split('>=')[0].split('<=')[0].trim());
            } catch (error) {
                // Continue even if requirements.txt is malformed
            }
        }

        // Check for Poetry
        const pyprojectPath = path.join(directory, 'pyproject.toml');
        if (this.deps.fs.existsSync(pyprojectPath)) {
            indicators.push(ProjectIndicator.PYPROJECT_TOML);
            metadata.packageManager = 'poetry';
            hasAnyPythonIndicator = true;
        }

        if (this.deps.fs.existsSync(path.join(directory, 'poetry.lock'))) {
            indicators.push(ProjectIndicator.POETRY_LOCK);
            metadata.packageManager = 'poetry';
            hasAnyPythonIndicator = true;
        }

        // Check for Pipenv
        const pipfilePath = path.join(directory, 'Pipfile');
        if (this.deps.fs.existsSync(pipfilePath)) {
            indicators.push(ProjectIndicator.PIPFILE);
            metadata.packageManager = 'pipenv';
            hasAnyPythonIndicator = true;
        }

        // Check for setup.py
        if (this.deps.fs.existsSync(path.join(directory, 'setup.py'))) {
            indicators.push(ProjectIndicator.SETUP_PY);
            hasAnyPythonIndicator = true;
        }

        if (!hasAnyPythonIndicator) {
            return null;
        }

        const confidence = this.calculateConfidence(indicators, metadata);

        return {
            type: ProjectType.PYTHON,
            confidence,
            indicators,
            metadata
        };
    }

    /**
     * Detect Docker projects
     */
    private async detectDocker(directory: string): Promise<DetectedProject | null> {
        const indicators: ProjectIndicator[] = [];
        const metadata: Record<string, any> = {};
        let hasAnyDockerIndicator = false;

        // Check for Dockerfile
        const dockerfilePath = path.join(directory, 'Dockerfile');
        if (this.deps.fs.existsSync(dockerfilePath)) {
            indicators.push(ProjectIndicator.DOCKERFILE);
            hasAnyDockerIndicator = true;

            try {
                const dockerfile = this.deps.fs.readFileSync(dockerfilePath, 'utf8');
                const fromMatch = dockerfile.match(/^FROM\s+(.+)$/m);
                if (fromMatch) {
                    metadata.baseImage = fromMatch[1].trim();
                }
            } catch (error) {
                // Continue even if Dockerfile is malformed
            }
        }

        // Check for docker-compose files
        const composeFiles = ['docker-compose.yml', 'docker-compose.yaml'];
        for (const file of composeFiles) {
            if (this.deps.fs.existsSync(path.join(directory, file))) {
                if (file.endsWith('.yml')) {
                    indicators.push(ProjectIndicator.DOCKER_COMPOSE);
                } else {
                    indicators.push(ProjectIndicator.DOCKER_COMPOSE_YAML);
                }
                metadata.hasCompose = true;
                hasAnyDockerIndicator = true;
                break;
            }
        }

        if (!hasAnyDockerIndicator) {
            return null;
        }

        const confidence = this.calculateConfidence(indicators, metadata);

        return {
            type: ProjectType.DOCKER,
            confidence,
            indicators,
            metadata
        };
    }

    /**
     * Detect database projects
     */
    private async detectDatabase(directory: string): Promise<DetectedProject | null> {
        const indicators: ProjectIndicator[] = [];
        const metadata: Record<string, any> = {};
        let hasAnyDatabaseIndicator = false;

        // Check for migrations directory
        const migrationsPath = path.join(directory, 'migrations');
        if (this.deps.fs.existsSync(migrationsPath)) {
            try {
                const stat = this.deps.fs.statSync(migrationsPath);
                if (stat.isDirectory()) {
                    indicators.push(ProjectIndicator.MIGRATIONS_DIR);
                    hasAnyDatabaseIndicator = true;
                }
            } catch (error) {
                // Continue if stat fails
            }
        }

        // Check for schema.sql
        if (this.deps.fs.existsSync(path.join(directory, 'schema.sql'))) {
            indicators.push(ProjectIndicator.SCHEMA_SQL);
            hasAnyDatabaseIndicator = true;
        }

        // Check for Prisma
        const prismaSchemaPath = path.join(directory, 'prisma', 'schema.prisma');
        if (this.deps.fs.existsSync(prismaSchemaPath)) {
            indicators.push(ProjectIndicator.PRISMA_SCHEMA);
            metadata.orm = 'prisma';
            hasAnyDatabaseIndicator = true;
        }

        if (!hasAnyDatabaseIndicator) {
            return null;
        }

        const confidence = this.calculateConfidence(indicators, metadata);

        return {
            type: ProjectType.DATABASE,
            confidence,
            indicators,
            metadata
        };
    }

    /**
     * Detect environment variables from .env files
     */
    private async detectEnvironmentVariables(directory: string): Promise<string[]> {
        const envFiles = ['.env.example', '.env.template'];
        const variables: string[] = [];

        for (const file of envFiles) {
            const filePath = path.join(directory, file);
            if (this.deps.fs.existsSync(filePath)) {
                try {
                    const content = this.deps.fs.readFileSync(filePath, 'utf8');
                    const lines = content.split('\n');

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                            const varName = trimmed.split('=')[0].trim();
                            if (varName && !variables.includes(varName)) {
                                variables.push(varName);
                            }
                        }
                    }
                } catch (error) {
                    // Continue if file read fails
                }
            }
        }

        return variables;
    }

    /**
     * Calculate confidence score based on indicators and metadata
     */
    private calculateConfidence(indicators: ProjectIndicator[], metadata: Record<string, any>): number {
        let score = 0;
        const baseScore = 0.5; // Base score for having any indicators
        const indicatorWeight = 0.1; // Each indicator adds 10%
        const metadataWeight = 0.05; // Each metadata field adds 5%

        // Base score for detection
        score += baseScore;

        // Add score for each indicator
        score += indicators.length * indicatorWeight;

        // Add score for rich metadata
        const metadataKeys = Object.keys(metadata);
        score += metadataKeys.length * metadataWeight;

        // Bonus for specific high-confidence indicators
        if (indicators.some(i => [
            ProjectIndicator.PACKAGE_JSON,
            ProjectIndicator.REQUIREMENTS_TXT,
            ProjectIndicator.DOCKERFILE
        ].includes(i))) {
            score += 0.2;
        }

        // Cap at 1.0
        return Math.min(score, 1.0);
    }
} 