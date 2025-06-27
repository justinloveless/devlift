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

Verify the installation:

```bash
dev --version
```

This will make the `dev` command available in your terminal, allowing you to `lift` any repository that has a `dev.yml` file.

## Core Commands

### `dev lift <repository_url>` (alias: `install`)
This is the primary command. It "lifts" the specified repository into your local environment, cloning it and then automatically executing the setup steps defined in its `dev.yml` file.

**Usage:**
```bash
dev lift https://github.com/some-org/some-repo.git
# or use the conventional alias:
dev install https://github.com/some-org/some-repo.git
```
The tool will clone the repository into a standardized path (`~/devlift/clones/`) and then the Execution Engine will take over to complete the setup.

If the target repository does not contain a `dev.yml` file, you will be prompted to `prep` one.

### `dev prep` (alias: `init`)
This command helps you create a `dev.yml` configuration file for your project. It offers two powerful modes:

1. **🤖 AI-Powered Analysis (Recommended)** - Automatically analyzes your project and generates a comprehensive configuration
2. **✋ Manual Configuration** - Interactive wizard to build the configuration step by step

**Basic Usage:**
```bash
cd /path/to/your/project
dev prep
# or use the conventional alias:
dev init
```

**AI-Powered Configuration:**
```bash
# Let AI analyze your project and generate the config
dev prep --ai

# Specify a particular AI provider
dev prep --ai --provider openai     # Use OpenAI GPT-4
dev prep --ai --provider anthropic  # Use Anthropic Claude  
dev prep --ai --provider google     # Use Google Gemini

# Choose output format
dev prep --ai --format json         # Generate JSON with IntelliSense
dev prep --ai --format yaml         # Generate YAML (default)

# Force overwrite existing configuration
dev prep --ai --force
```

**Manual Configuration:**
```bash
# Force manual mode (skip AI option)
dev prep --interactive

# Generate specific format
dev prep --interactive --format json
dev prep --interactive --format yaml
```

**Format Options:**
```bash
dev prep --format json              # JSON format with IntelliSense support
dev prep --format yaml              # YAML format (default)
dev prep --format json --schema     # Include schema reference (default)
dev prep --format json --no-schema  # Exclude schema reference
```

#### AI Provider Setup

The AI-powered prep feature supports multiple providers. You'll need an API key from your chosen provider.

**Quick Setup:**
```bash
# Set your API key as an environment variable
export OPENAI_API_KEY="your_key_here"        # For OpenAI
export ANTHROPIC_API_KEY="your_key_here"     # For Anthropic  
export GOOGLE_API_KEY="your_key_here"        # For Google AI
```

**Supported Providers:**
- **OpenAI GPT-4** (Recommended) - [Get API key](https://platform.openai.com)
- **Anthropic Claude** - [Get API key](https://console.anthropic.com)
- **Google Gemini** - [Get API key](https://makersuite.google.com/app/apikey)

📖 **[Complete AI Setup Guide](docs/ai-setup-guide.md)** - Detailed instructions, troubleshooting, and best practices  
🚀 **[AI Quick Reference](docs/ai-quick-reference.md)** - Commands, setup, and examples at a glance  
🧪 **[Beta Release Guide](docs/beta-release-guide.md)** - How to create and manage beta versions

#### What AI Analysis Detects

The AI-powered prep feature analyzes your project comprehensively:

- **Technologies**: Node.js, Python, Go, Rust, Docker, etc.
- **Package Managers**: npm, yarn, pnpm, pip, cargo, go mod, etc.
- **Frameworks**: React, Vue, Django, Flask, Express, Next.js, etc.
- **Databases**: PostgreSQL, MySQL, MongoDB, Redis, etc.
- **Environment Variables**: From .env files and documentation
- **Build Tools**: Webpack, Vite, Rollup, etc.
- **CI/CD**: GitHub Actions, GitLab CI, etc.

The AI generates a complete `dev.yml` with:
- ✅ Proper setup step ordering with dependencies
- ✅ Environment variable configuration
- ✅ Database setup commands
- ✅ Build and test commands
- ✅ Post-setup instructions
- ✅ Helpful comments explaining each step

#### Privacy & Security

- 🔒 **API keys are stored securely** and never logged
- 🔒 **Project data is not stored** by AI providers
- 🔒 **Analysis is one-time only** - no data retention
- 🔒 **Fallback available** - manual mode if AI fails
- 🔒 **Full transparency** - review generated config before saving

### `dev pump` (alias: `update`)
This command automatically updates `devlift` to the latest version. It's like giving your CLI tool a boost at the gym!

**Usage:**
```bash
dev pump
# or use the conventional alias:
dev update
```

**Options:**
- `--force` - Force update even if already on latest version
- `--yes` - Skip confirmation prompts  
- `--check-only` - Only check for updates, don't install

## Command Aliases

For users who prefer conventional command names, all commands have standard aliases:

- `dev lift` → `dev install` (repository setup)
- `dev prep` → `dev init` (configuration initialization)  
- `dev pump` → `dev update` (auto-update devlift)

Both names work identically - use whichever you prefer!

## Beta Releases

DevLift offers beta releases for early access to new features:

```bash
# Install latest beta version
npm install -g devlift@beta

# Check available versions
npm view devlift dist-tags

# Install specific beta version
npm install -g devlift@1.1.0-beta.2
```

**Beta Features:**
- 🧪 Early access to new functionality
- 🚀 Latest AI improvements and providers
- 🔧 Enhanced configuration options
- 📋 Pre-release testing of major updates

Beta versions are thoroughly tested but may contain experimental features. Perfect for trying new capabilities before they reach stable release.

📋 **[Complete Beta Guide](docs/beta-release-guide.md)** - Installation, testing, and feedback

## Quick Start Examples

### Setting Up a New Project with AI

```bash
# Clone and set up any repository with devlift
dev lift https://github.com/username/awesome-project.git

# If the project doesn't have a dev.yml, create one with AI
cd ~/devlift/clones/github.com/username/awesome-project
dev prep --ai --provider openai
```

### Creating AI Configuration for Your Project

```bash
# Navigate to your project
cd /path/to/your/project

# Let AI analyze and create the configuration
dev prep --ai

# Review the generated dev.yml and commit it
git add dev.yml
git commit -m "Add devlift configuration"
```

### Manual Configuration Example

```bash
# Create configuration manually
dev prep --interactive

# Or force manual mode even if AI is available
dev prep --force --interactive
```

## Troubleshooting

### AI Provider Issues

**"Failed to obtain API key"**
- Ensure your API key is set: `echo $OPENAI_API_KEY`
- Check the key is valid in your provider's dashboard
- Try setting it in global config: `~/.devlift/config.json`

**"AI analysis failed"**
- Check your internet connection
- Verify API key permissions and quota
- Use fallback: `dev prep --interactive`

**"Invalid provider"**
- Valid providers are: `openai`, `anthropic`, `google`
- Check spelling: `dev prep --ai --provider openai`

### General Issues

**"dev.yml already exists"**
- Use `--force` to overwrite: `dev prep --ai --force`
- Or manually delete the existing file first

**"Permission denied"**
- Ensure you have write permissions in the directory
- On Windows, try running as administrator

**"Command not found: dev"**
- Reinstall globally: `npm install -g devlift`
- Check PATH includes npm global bin directory

### Getting Help

```bash
# Show all available commands
dev --help

# Show help for specific commands
dev prep --help
dev lift --help
dev pump --help
```

## Configuration (`dev.yml`)

The `dev.yml` file is the heart of the tool. It defines all the steps required to set up a project. The AI-powered prep command can generate comprehensive configurations automatically, or you can create them manually.

**Enhanced `dev.yml` Schema:**
```yaml
# Project metadata
project_name: "My Awesome Web App"
version: "1"

# Project dependencies (optional)
dependencies:
  - name: "shared-service"
    repository: "https://github.com/org/shared-service.git"
    branch: "main"
  - name: "auth-service"
    repository: "https://github.com/org/auth-service.git"
    tag: "v1.2.0"
  - name: "local-library"
    path: "../local-lib"

# Environment variable configuration
environment:
  example_file: ".env.example"  # Copy this file to .env
  variables:
    - name: "DATABASE_URL"
      prompt: "Enter your database connection string:"
      default: "postgresql://localhost:5432/myapp"
    - name: "API_KEY"
      prompt: "Enter your API key:"
      secret: true  # Masks input for security

# Setup steps with dependency management
setup_steps:
  - name: "Install Dependencies"
    type: "package-manager"
    manager: "npm"  # Auto-detected if not specified
    command: "install"
    
  - name: "Start Services"
    type: "docker-compose"
    command: "up -d"
    
  - name: "Run Migrations"
    type: "database"
    command: "npm run db:migrate"
    depends_on: ["Start Services"]  # Ensures proper ordering

  - name: "Choose Development Mode"
    type: "choice"
    prompt: "How would you like to run the application?"
    choices:
      - name: "Development mode"
        value: "dev"
        actions:
          - name: "Start dev server"
            type: "shell"
            command: "npm run dev"
      - name: "Production mode"
        value: "prod"
        actions:
          - name: "Build for production"
            type: "shell"
            command: "npm run build"
      - name: "Skip for now"
        value: "skip"
        actions: []
    depends_on: ["Run Migrations"]

# Post-setup actions
post_setup:
  - type: "message"
    content: |
      🎉 Setup complete!
      
      To start development:
      $ npm run dev
      
      Your app will be available at http://localhost:3000
      
  - type: "open"
    target: "editor"
    path: "."
```

**Project Dependencies:**
DevLift supports multi-repository project dependencies. When you run `dev lift` on a project, it will automatically resolve and set up all declared dependencies first.

- **`name`**: Human-readable name for the dependency  
- **`repository`**: Git repository URL for remote dependencies
- **`branch`**: Specific branch to checkout (optional, defaults to main)
- **`tag`**: Specific tag to checkout (optional, takes precedence over branch)
- **`path`**: Relative path for local dependencies (alternative to repository)

Dependencies are resolved recursively with circular dependency detection.

**Step Types:**
- **`package-manager`**: Automatically detects and runs package manager commands (npm, yarn, pnpm, pip, etc.)
- **`shell`**: Executes shell commands with user confirmation for security
- **`docker-compose`**: Docker Compose operations (up, down, build, etc.)
- **`docker`**: Docker commands (build, run, pull, etc.)
- **`database`**: Database operations (migrations, seeding, etc.)
- **`service`**: Service management commands (start/stop services)
- **`choice`**: Interactive choice selection allowing users to pick from multiple options, each with their own actions

**Supported Package Managers:**
- Node.js: npm, yarn, pnpm, bun
- Python: pip, pipenv, poetry
- Go: go mod
- Rust: cargo
- And more...

**Simple Example:**
```yaml
version: '1'
setup_steps:
  - name: "Install Dependencies"
    type: "shell"
    command: "npm install"
  - name: "Run Database Setup"
    type: "shell"
    command: "npm run db:setup"
```

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