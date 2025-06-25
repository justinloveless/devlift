# Dev-CLI

`dev-cli` is a universal command-line tool designed to automate and standardize the process of setting up any repository for local development.

With a single command, you can clone a repository and have it ready to go, complete with all dependencies installed, environment variables set up, and initialization scripts run.

## The Problem
Setting up a new project locally is often a manual, time-consuming, and error-prone process. `dev-cli` solves this by using a simple `dev.yml` configuration file to define the entire setup process, making project onboarding seamless and consistent.

## Installation

To install and use the development version of this tool locally, clone this repository and run:

```bash
npm install -g .
```
This will make the `dev` command available globally in your terminal.

## Core Commands

### `dev install <repository_url>`
This is the primary command. It clones the specified repository and then automatically executes the setup steps defined in its `dev.yml` file.

**Usage:**
```bash
dev install https://github.com/some-org/some-repo.git
```
The tool will clone the repository into a standardized path (`~/dev-cli/clones/`) and then the Execution Engine will take over to complete the setup.

If the target repository does not contain a `dev.yml` file, you will be prompted to create one.

### `dev init`
This command launches an interactive wizard that helps you create a `dev.yml` file for your own project. It will guide you through defining the setup steps, such as running shell commands.

**Usage:**
```bash
cd /path/to/your/project
dev init
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