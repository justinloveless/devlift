import { Config, loadConfig } from './config.js';
import { getClonePath } from '../utils/path.js';
import { isValidGitUrl } from '../utils/validation.js';
import { simpleGit } from 'simple-git';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';

interface ProjectDependency {
    name: string;
    repository: string;
    branch?: string;
    tag?: string;
    path?: string;
}

interface ResolvedDependency {
    name: string;
    path: string;
    config: Config | null;
}

export class DependencyResolver {
    private setupCache = new Set<string>();
    private resolutionStack = new Set<string>();

    /**
     * Resolves and sets up all dependencies for a project recursively
     */
    async resolveDependencies(config: Config, projectPath: string): Promise<ResolvedDependency[]> {
        if (!config.dependencies || config.dependencies.length === 0) {
            return [];
        }

        console.log(chalk.blue(`📦 Resolving ${config.dependencies.length} project dependencies...`));

        const resolved: ResolvedDependency[] = [];

        for (const dependency of config.dependencies) {
            const resolvedDep = await this.resolveDependency(dependency, projectPath);
            resolved.push(resolvedDep);
        }

        return resolved;
    }

    /**
     * Resolves a single dependency
     */
    private async resolveDependency(dependency: ProjectDependency, parentPath: string): Promise<ResolvedDependency> {
        const dependencyId = this.getDependencyId(dependency);

        // Check for circular dependencies
        if (this.resolutionStack.has(dependencyId)) {
            const stack = Array.from(this.resolutionStack).join(' -> ');
            throw new Error(`Circular dependency detected: ${stack} -> ${dependencyId}`);
        }

        this.resolutionStack.add(dependencyId);

        try {
            let dependencyPath: string;

            if (dependency.path) {
                // Local dependency
                dependencyPath = path.resolve(parentPath, dependency.path);
                if (!fs.existsSync(dependencyPath)) {
                    throw new Error(`Local dependency path not found: ${dependencyPath}`);
                }
                console.log(chalk.cyan(`📁 Using local dependency: ${dependency.name} at ${dependencyPath}`));
            } else {
                // Remote dependency - clone it
                dependencyPath = await this.cloneDependency(dependency);
            }

            // Load the dependency's config
            const dependencyConfig = loadConfig(dependencyPath);

            // Recursively resolve the dependency's dependencies
            if (dependencyConfig && dependencyConfig.dependencies) {
                await this.resolveDependencies(dependencyConfig, dependencyPath);
            }

            return {
                name: dependency.name,
                path: dependencyPath,
                config: dependencyConfig
            };
        } finally {
            this.resolutionStack.delete(dependencyId);
        }
    }

    /**
     * Clones a remote dependency
     */
    private async cloneDependency(dependency: ProjectDependency): Promise<string> {
        if (!isValidGitUrl(dependency.repository)) {
            throw new Error(`Invalid repository URL: ${dependency.repository}`);
        }

        const clonePath = getClonePath(dependency.repository);
        const dependencyId = this.getDependencyId(dependency);

        // Check if already cloned and set up
        if (this.setupCache.has(dependencyId) && fs.existsSync(clonePath)) {
            console.log(chalk.green(`✅ Dependency already set up: ${dependency.name}`));
            return clonePath;
        }

        console.log(chalk.blue(`🔄 Cloning dependency: ${dependency.name} from ${dependency.repository}`));

        const git = simpleGit();

        // Remove existing directory if it exists
        if (fs.existsSync(clonePath)) {
            await fs.remove(clonePath);
        }

        // Ensure parent directory exists
        await fs.ensureDir(path.dirname(clonePath));

        // Clone the repository
        await git.clone(dependency.repository, clonePath);

        // Checkout specific branch or tag if specified
        if (dependency.branch || dependency.tag) {
            const gitRepo = simpleGit(clonePath);
            const ref = dependency.branch || dependency.tag;
            console.log(chalk.blue(`🔀 Checking out ${dependency.branch ? 'branch' : 'tag'}: ${ref}`));
            await gitRepo.checkout(ref!);
        }

        this.setupCache.add(dependencyId);
        console.log(chalk.green(`✅ Dependency cloned: ${dependency.name}`));

        return clonePath;
    }

    /**
     * Generates a unique ID for a dependency
     */
    private getDependencyId(dependency: ProjectDependency): string {
        const base = dependency.path || dependency.repository;
        const ref = dependency.branch || dependency.tag || 'main';
        return `${base}#${ref}`;
    }

    /**
     * Checks if a dependency has already been set up
     */
    isDependencySetup(dependency: ProjectDependency): boolean {
        const dependencyId = this.getDependencyId(dependency);
        return this.setupCache.has(dependencyId);
    }

    /**
     * Marks a dependency as set up
     */
    markDependencyAsSetup(dependency: ProjectDependency): void {
        const dependencyId = this.getDependencyId(dependency);
        this.setupCache.add(dependencyId);
    }

    /**
     * Clears the setup cache (useful for testing)
     */
    clearCache(): void {
        this.setupCache.clear();
        this.resolutionStack.clear();
    }
} 