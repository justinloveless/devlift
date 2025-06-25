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

### 4.3. `dev prep` Command
This is the interactive wizard for repository maintainers to create the `dev.yml` file.

**Workflow:**
1.  **Project Inspection:** Scans the current directory to find clues about the project's structure and technologies.
    *   Detects `package.json`, `requirements.txt`, `docker-compose.yml`, `.env.example`, etc.
2.  **Interactive Wizard:** Asks the user a series of questions to build the config file, using the inspected information to provide smart defaults.
    *   "I found a `package.json`. Should I add a step to run `npm install`?"
    *   "What command is used to run database migrations?"
    *   "I see a `.env.example` file. Should I configure the environment setup from it?"
3.  **File Generation:** Creates a well-formatted and commented `dev.yml` file at the end of the process.

## 5. Non-Functional Requirements

*   **Security:** User trust is paramount. All actions, especially shell command execution, must be transparent and require user consent by default. Secret handling must be secure (e.g., masking input).
*   **Performance:** The tool should be fast and responsive. Where possible, it should leverage caching (e.g., for dependencies) to speed up repeated installations.
*   **Usability:** The CLI must be intuitive, with clear commands, flags, and helpful error messages. The output should be clean and easy to read.
*   **Compatibility:** The tool must be cross-platform, with first-class support for macOS, Linux, and Windows (via WSL). It should handle OS-specific differences in shell commands gracefully.
*   **Extensibility:** The architecture should allow for future expansion, such as a plugin system to support more complex or niche technologies.

## 6. Future Scope (V2 and Beyond)

*   **`dev update` Command:** A command to pull the latest changes from the repository's main branch and intelligently re-run the necessary setup steps.
*   **`dev teardown` Command:** A command to clean up the local environment, such as stopping Docker containers, removing `.env` files, and deleting build artifacts.
*   **Plugin Ecosystem:** Allow third-party plugins to add support for new package managers, cloud provider integrations (e.g., AWS CLI configuration), or specific framework setups.
*   **Centralized Config Repository:** An optional, community-driven repository of `dev.yml` files for popular open-source projects that don't have one, allowing users to do `dev lift <repo_url> --with-config <config_name>`. 