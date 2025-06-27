# Product Requirements Document: "DevLift"

## 1. Executive Summary

### 1.1. The Problem
Setting up a local development environment for a new project is often a complex, error-prone, and time-consuming process. Developers must manually follow instructions in `README` files, install various dependencies, configure environment variables, set up databases, and run initialization scripts. This process lacks standardization, leading to inconsistencies across developer machines and significant onboarding friction for new team members.

### 1.2. The Vision
To create a universal command-line interface (CLI) tool, **`dev`**, that automates the entire process of setting up a repository for local development. Our vision is to enable any developer to clone and configure any project with a single, simple command: **`dev lift <repository_url>`**.

### 1.3. The Solution
We will build a CLI tool that utilizes a configuration file within the target repository (e.g., `dev.yml`) to define all necessary setup steps. The tool will provide a user-friendly way for repository maintainers to generate this configuration file, and a seamless, automated experience for developers using it.

## 2. Goals & Objectives

*   **Drastically reduce developer onboarding time** from hours or days to minutes.
*   **Ensure consistent and reproducible development environments** across all team members.
*   **Improve the overall developer experience (DX)** by automating tedious and repetitive setup tasks.
*   **Establish a single source of truth** for project setup instructions, version-controlled alongside the codebase.

## 3. Target Audience

*   **Primary:** Software developers who are joining a new project, switching between projects, or contributing to open-source.
*   **Secondary:** Repository maintainers, tech leads, and DevOps engineers who are responsible for defining and managing the development lifecycle.

## 4. Core Features

### 4.1. The `dev.yml` Configuration File
This file is the heart of the tool. It will be a YAML file, located in the root of the repository, that defines the setup steps.

**Proposed Schema:**

```yaml
# A human-readable name for the project, used in logs and prompts.
project_name: "My Awesome Web App"

# The version of the devlift configuration schema.
version: "1"

# Defines environment variables needed for the project.
environment:
  # The tool will copy this file to `.env` if it exists.
  example_file: ".env.example"
  # The tool will prompt the user for any variables listed here
  # that are not already set in the resulting .env file.
  variables:
    - name: "DATABASE_URL"
      prompt: "Enter the local database connection string:"
      default: "postgresql://user:pass@localhost:5432/mydb"
    - name: "API_KEY"
      prompt: "Enter your personal API key for the external service:"
      secret: true # Value will be masked during input

# An ordered list of setup commands to be executed.
setup_steps:
  - name: "Install Node.js Dependencies" # Human-readable name for the step
    # The tool can auto-detect the manager or it can be specified.
    # Supported types: "package-manager", "shell"
    type: "package-manager"
    # Optional: If not provided, the tool will infer from lockfiles.
    manager: "pnpm" # (npm, yarn, pnpm, pip, bundle, mvn, go, etc.)
    command: "install" # (install, sync, etc.)

  - name: "Start Local Database"
    type: "shell"
    # SECURITY: The user will be shown this command and asked for
    # confirmation before execution by default.
    command: "docker-compose up -d"

  - name: "Run Database Migrations"
    type: "shell"
    command: "npm run db:migrate"
    # Optional: a list of step names that must complete before this one runs.
    depends_on: ["Start Local Database"]

# Instructions and actions to perform after a successful setup.
post_setup:
  - type: "message"
    content: |
      ✅ Setup complete!

      To start the development server, run:
      $ npm run dev

      The API will be available at http://localhost:3000

  - type: "open"
    # Opens the project in the specified application.
    # Supported: "editor", "browser"
    target: "editor" # "vscode", "jetbrains", etc. (user-configurable default)
    path: "."
```

### 4.2. `dev lift <repo_url>` Command
This is the primary command for the end-user developer.

**Workflow:**
1.  **Input:** Accepts a Git repository URL (e.g., GitHub, GitLab, Bitbucket).
2.  **Clone:** Clones the repository into a structured directory (e.g., `~/dev/<provider>/<org>/<repo>`). This base path should be user-configurable.
3.  **Config Discovery:** Searches for a `dev.yml` file in the repository's root.
    *   **If not found:** The tool gracefully degrades. It can either (a) attempt to infer setup steps (e.g., run `npm install` if `package.json` is found) or (b) prompt the user if they'd like to run the `prep` command to create a config file now.
4.  **Execution Engine:** Parses and executes the steps in `dev.yml`.
    *   Provides clear, real-time feedback with spinners and logs for each step.
    *   If a step fails, it halts execution, provides detailed error logs, and suggests potential fixes.
5.  **Environment Setup:** Manages the `.env` file creation and prompts the user for required variables as defined in the config.
6.  **Security Prompt:** Before executing any `shell` command, the tool will display the command and require explicit user confirmation. This can be bypassed with a `--yes` flag for trusted scripts or CI environments.
7.  **Post-Setup:** Executes post-setup actions, such as displaying a success message or opening the project in the user's preferred editor.

### 4.3. `dev prep` Command (Interactive Wizard)
This is the interactive wizard for repository maintainers to create the `dev.yml` file.

**Workflow:**
1.  **Project Inspection:** Scans the current directory to find clues about the project's structure and technologies.
    *   Detects `package.json`, `requirements.txt`, `docker-compose.yml`, `.env.example`, etc.
2.  **Interactive Wizard:** Asks the user a series of questions to build the config file, using the inspected information to provide smart defaults.
    *   "I found a `package.json`. Should I add a step to run `npm install`?"
    *   "What command is used to run database migrations?"
    *   "I see a `.env.example` file. Should I configure the environment setup from it?"
3.  **File Generation:** Creates a well-formatted and commented `dev.yml` file at the end of the process.

### 4.4. `dev prep` Command (AI-Powered Smart Analysis)
An enhanced version of the prep command that leverages AI to intelligently analyze project contents and generate comprehensive dev.yml configurations.

**Key Features:**
*   **Deep Project Analysis:** AI analyzes multiple project files including:
    *   Configuration files (`package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, etc.)
    *   Docker files (`Dockerfile`, `docker-compose.yml`, `docker-compose.yaml`)
    *   Environment files (`.env.example`, `.env.template`, etc.)
    *   CI/CD configurations (`.github/workflows/*`, `.gitlab-ci.yml`, etc.)
    *   Documentation (`README.md`, `CONTRIBUTING.md`, setup guides)
    *   Build configurations (`Makefile`, `webpack.config.js`, etc.)
    *   Database migrations and schemas
*   **Intelligent Configuration Generation:** AI creates a complete dev.yml file with:
    *   Appropriate setup steps based on detected technologies
    *   Proper dependency ordering and `depends_on` relationships
    *   Environment variable extraction from documentation and examples
    *   Database setup commands based on detected ORMs/migrations
    *   Build and test commands from scripts and CI configurations
    *   Appropriate post-setup instructions

**Workflow:**
1.  **Multi-Provider AI Support:** Support for multiple AI providers (OpenAI, Anthropic, Google, local models)
2.  **API Key Management:** Secure handling of user-provided API keys with options for:
    *   Environment variable configuration
    *   Global config file storage
    *   Per-project API key settings
3.  **Smart Analysis Pipeline:**
    *   File discovery and content extraction
    *   Context-aware analysis using AI
    *   Configuration generation with explanations
    *   User review and approval process
4.  **Fallback Options:** If AI analysis fails or no API key is provided, gracefully fall back to the traditional interactive wizard

**Command Options:**
*   `dev prep --ai` - Use AI-powered analysis
*   `dev prep --ai-provider <provider>` - Specify AI provider (openai, anthropic, google, local)
*   `dev prep --interactive` - Force traditional interactive mode
*   `dev prep --review` - Show AI-generated config for review before saving
*   `dev prep --explain` - Include AI explanations as comments in the generated file

### 4.5. `dev prep` Command (Guided Setup)
A middle-ground approach between manual interactive setup and AI-powered analysis that uses built-in heuristics to detect project types and generate intelligent configuration templates.

**Key Features:**
*   **Intelligent Project Detection:** Automatically detects project types and technologies by scanning for common files:
    *   **Node.js Projects:** `package.json`, `yarn.lock`, `pnpm-lock.yaml`, `node_modules/`
    *   **Python Projects:** `requirements.txt`, `setup.py`, `pyproject.toml`, `Pipfile`, `poetry.lock`
    *   **Docker Projects:** `Dockerfile`, `docker-compose.yml`, `docker-compose.yaml`
    *   **Database Projects:** `migrations/`, `schema.sql`, `prisma/schema.prisma`
    *   **Multi-technology Projects:** Detects and combines multiple project types
*   **Template-Based Configuration Generation:** Uses built-in templates to generate appropriate dev.yml configurations:
    *   Pre-defined setup steps for each detected technology
    *   Intelligent dependency ordering between steps
    *   Environment variable detection from `.env.example` files
    *   Common post-setup actions based on project type
*   **Interactive Review and Customization:** Presents generated configuration for user review and modification:
    *   Display detected technologies and proposed setup steps
    *   Allow editing of step names, commands, and dependencies
    *   Add or remove setup steps
    *   Configure environment variables and post-setup actions
    *   Preview final configuration before saving

**Workflow:**
1.  **Project Scanning:** Scans current directory to detect project technologies and files
2.  **Template Selection:** Selects and merges appropriate configuration templates based on detected technologies
3.  **Configuration Generation:** Generates initial dev.yml configuration with intelligent defaults
4.  **Interactive Review:** Presents configuration to user with options to:
    *   Review and approve generated configuration
    *   Edit individual setup steps and their properties
    *   Add custom setup steps or modify existing ones
    *   Configure environment variables and post-setup actions
5.  **Validation and Saving:** Validates final configuration and saves to dev.yml or dev.json

**Command Options:**
*   `dev prep --guided` - Use guided setup with heuristic-based detection
*   `dev prep --guided --review` - Generate config and open interactive editor
*   `dev prep --guided --template <type>` - Force specific project template (node, python, docker, etc.)

**Benefits:**
*   **Faster than manual setup:** Intelligent defaults reduce configuration time
*   **More reliable than AI:** Built-in heuristics provide consistent, tested results
*   **No external dependencies:** Works offline without API keys or internet connection
*   **Educational:** Shows users what each step does and why it's needed
*   **Customizable:** Full control over final configuration while providing smart starting points

## 5. Non-Functional Requirements

*   **Security:** User trust is paramount. All actions, especially shell command execution, must be transparent and require user consent by default. Secret handling must be secure (e.g., masking input). AI API keys must be stored securely and never logged.
*   **Performance:** The tool should be fast and responsive. Where possible, it should leverage caching (e.g., for dependencies) to speed up repeated installations. AI analysis should be optimized for speed while maintaining accuracy.
*   **Usability:** The CLI must be intuitive, with clear commands, flags, and helpful error messages. The output should be clean and easy to read. AI-generated configurations should be human-readable and well-commented.
*   **Compatibility:** The tool must be cross-platform, with first-class support for macOS, Linux, and Windows (via WSL). It should handle OS-specific differences in shell commands gracefully.
*   **Extensibility:** The architecture should allow for future expansion, such as a plugin system to support more complex or niche technologies, and easy addition of new AI providers.
*   **Privacy:** AI analysis should respect user privacy. No project data should be stored or used for training by AI providers beyond the immediate request.

## 6. Future Scope (V2 and Beyond)

*   **`dev update` Command:** A command to pull the latest changes from the repository's main branch and intelligently re-run the necessary setup steps.
*   **`dev teardown` Command:** A command to clean up the local environment, such as stopping Docker containers, removing `.env` files, and deleting build artifacts.
*   **Plugin Ecosystem:** Allow third-party plugins to add support for new package managers, cloud provider integrations (e.g., AWS CLI configuration), or specific framework setups.
*   **Centralized Config Repository:** An optional, community-driven repository of `dev.yml` files for popular open-source projects that don't have one, allowing users to do `dev lift <repo_url> --with-config <config_name>`.
*   **AI Learning & Improvement:** Collect anonymized feedback on AI-generated configurations to improve accuracy over time.
*   **Local AI Models:** Support for running AI analysis entirely locally using models like CodeLlama or similar, for enhanced privacy and offline usage.
*   **Multi-Language Documentation Analysis:** AI-powered analysis of documentation in multiple languages to extract setup instructions.
*   **Smart Update Detection:** AI-powered analysis to detect when project dependencies or setup requirements have changed and suggest dev.yml updates.
*   **Configuration Templates:** AI-generated configuration templates for common project types that can be customized and reused. 