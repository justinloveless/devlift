# Devlift

`devlift` is a universal command-line tool designed to automate and standardize the process of setting up any repository for local development. It's like a "dead lift" for your dev environment - one command to get everything up and running.

With a single command, you can clone a repository and have it ready to go, complete with all dependencies installed, environment variables set up, and initialization scripts run.

## The Problem
Setting up a new project locally is often a manual, time-consuming, and error-prone process. `devlift` solves this by using a simple `dev.yml` configuration file to define the entire setup process, making project onboarding seamless and consistent.

## Installation

**Requirements:** Node.js 18.0.0 or higher

Install `devlift` globally via npm:

```bash
npm install -g devlift
```

This will make the `dev` command available in your terminal, allowing you to `lift` any repository that has a `dev.yml` file.

## Core Commands

### `dev lift <repository_url>`
This is the primary command. It "lifts" the specified repository into your local environment, cloning it and then automatically executing the setup steps defined in its `dev.yml` file.

**Usage:**
```bash
dev lift https://github.com/some-org/some-repo.git
```
The tool will clone the repository into a standardized path (`~/devlift/clones/`) and then the Execution Engine will take over to complete the setup.

If the target repository does not contain a `dev.yml` file, you will be prompted to `prep` one.

### `dev prep`
This command launches an interactive wizard to help you `prep` a `dev.yml` file for your own project, getting it ready for a `lift`. It will guide you through defining the setup steps, such as running shell commands.

**Usage:**
```bash
cd /path/to/your/project
dev prep
```
This will generate a `dev.yml` file in your current directory.

## Configuration (`dev.yml`)

The `dev.yml` file is the heart of the tool. It defines all the steps required to set up a project.

**Example `dev.yml`:**
```yaml
version: '1'
setup:
  - type: shell
    description: Install NPM dependencies
    command: npm install
  - type: shell
    description: Run database migrations
    command: npm run db:migrate
```

Currently, the only supported step `type` is `shell`. More step types will be added in future versions.

## Development & Publishing

### Version Management

This project uses a `VERSION` file as the single source of truth for version numbers. The version is automatically synced to `package.json` during the publishing process.

#### Available Scripts

- **Check current version**: `npm run version:current`
- **Bump version**: `npm run version:bump <major|minor|patch>`
  - `npm run version:bump patch` - 1.0.1 → 1.0.2
  - `npm run version:bump minor` - 1.0.1 → 1.1.0
  - `npm run version:bump major` - 1.0.1 → 2.0.0
- **Sync version**: `npm run version:sync` (syncs VERSION file to package.json)
- **Safe publish**: `npm run publish:safe` (builds, tests, and publishes)

#### Publishing Workflow

**Recommended: GitHub Actions Publishing** 🚀
```bash
# Prepare release and trigger GitHub Actions
npm run release:prepare

# Test the workflow without pushing
npm run release:prepare:dry-run
```

This modern workflow:
1. **Interactive version bump** - Choose patch/minor/major
2. **Run tests locally** - Validates before push  
3. **Create git tag** - Triggers GitHub Actions
4. **Automated CI/CD** - GitHub Actions handles publishing
5. **Security** - Uses npm tokens stored as secrets
6. **Multi-environment testing** - Tests on Node 18, 20, 22

**Legacy: Local Publishing (Not Recommended)**
```bash
npm run release          # Local publishing 
npm run release:dry-run  # Local dry run
```

**Manual Steps (if needed):**
```bash
npm run version:bump patch  # Bump version manually
npm run publish:safe        # Local publish (not recommended)
```

### GitHub Actions Setup

To enable automated publishing, you need to:

1. **Set up npm token**: Add `NPM_TOKEN` secret to GitHub repository
2. **Configure environment**: Optionally set up `npm-publish` environment protection
3. **Push version tag**: Use `npm run release:prepare` to trigger publishing

See [GitHub Actions Setup Guide](docs/github-actions-setup.md) for detailed instructions.

The GitHub Actions workflow ensures secure, tested, and consistent publishing while preventing manual errors. 