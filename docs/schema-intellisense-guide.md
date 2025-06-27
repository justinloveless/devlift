# DevLift Schema & IntelliSense Guide

DevLift supports comprehensive IntelliSense and validation through JSON Schema. This guide explains how to set up and use these features for the best development experience.

## Overview

DevLift provides a JSON Schema that enables:
- 🔍 **Auto-completion** for all configuration properties
- ✅ **Real-time validation** of property values  
- 📝 **Helpful descriptions** and examples for each property
- 🚨 **Error highlighting** for invalid configurations
- 🎯 **IntelliSense in VS Code, JetBrains IDEs, and other editors**

## Configuration Formats

### JSON Format (Recommended for IntelliSense)

Create a `dev.json` file with the schema reference:

```json
{
  "$schema": "https://raw.githubusercontent.com/justinloveless/devlift/main/schema/dev-config.schema.json",
  "project_name": "My Project",
  "version": "1",
  "setup_steps": [
    {
      "name": "Install Dependencies",
      "type": "package-manager",
      "command": "install"
    }
  ]
}
```

### YAML Format with Schema Support

Create a `dev.yml` file with the schema comment:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/justinloveless/devlift/main/schema/dev-config.schema.json
project_name: "My Project"
version: "1"
setup_steps:
  - name: "Install Dependencies"
    type: "package-manager"
    command: "install"
```

## Editor Setup

### VS Code

**JSON Files:**
- IntelliSense works automatically when you include the `$schema` property
- Install the "JSON" extension (usually pre-installed)

**YAML Files:**
- Install the [YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml)
- Add the schema comment at the top of your YAML files

### JetBrains IDEs (WebStorm, IntelliJ, etc.)

**JSON Files:**
- IntelliSense works automatically with the `$schema` property
- No additional setup required

**YAML Files:**
- Install the YAML plugin if not already available
- The schema comment enables IntelliSense support

### Other Editors

Most modern editors with JSON/YAML support will recognize the schema references. Check your editor's documentation for specific setup instructions.

## Using the DevLift CLI

### Generate with Schema

When using `dev prep`, you can control schema inclusion:

```bash
# JSON format with schema (default)
dev prep --format json

# JSON format without schema
dev prep --format json --no-schema

# YAML format with schema comment (default)
dev prep --format yaml

# YAML format without schema comment
dev prep --format yaml --no-schema
```

### AI-Generated Configurations

AI-generated configurations automatically include schema references:

```bash
# AI with JSON format and schema
dev prep --ai --format json

# AI with YAML format and schema
dev prep --ai --format yaml
```

## Schema Features

### Property Auto-completion

When typing in your configuration file, you'll get suggestions for:
- All valid property names
- Enum values (like step types, package managers)
- Required vs optional properties

### Real-time Validation

The schema validates:
- **Required properties**: `project_name`, `version`
- **Property types**: strings, arrays, objects, booleans
- **Enum values**: Valid step types, package managers, etc.
- **Format validation**: URLs, version patterns, etc.

### Helpful Descriptions

Each property includes:
- Clear descriptions of what it does
- Examples of valid values
- Information about when it's required or optional

## Schema Reference

### Core Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `$schema` | string | No | JSON Schema URL for validation |
| `project_name` | string | **Yes** | Human-readable project name |
| `version` | string | **Yes** | Must be "1" |
| `dependencies` | array | No | Project dependencies |
| `environment` | object | No | Environment variable configuration |
| `setup_steps` | array | No | Setup commands to execute |
| `post_setup` | array | No | Post-setup actions |

### Setup Step Types

The schema validates these step types with specific properties:

| Type | Description | Valid Commands |
|------|-------------|----------------|
| `package-manager` | Package manager operations | `install`, `run build`, `run test`, etc. |
| `shell` | General shell commands | Any valid shell command |
| `docker-compose` | Docker Compose operations | `up -d`, `down`, `build`, etc. |
| `docker` | Docker commands | `build`, `run`, `pull`, etc. |
| `database` | Database operations | Migration and seeding commands |
| `service` | Service management | Start/stop service commands |
| `choice` | Interactive choice selection | N/A (uses choices array) |

#### Choice Steps

Choice steps allow users to select from a list of options, each with their own actions:

```json
{
  "name": "Choose Development Mode",
  "type": "choice",
  "prompt": "How would you like to run the application?",
  "choices": [
    {
      "name": "Development mode",
      "value": "dev",
      "actions": [
        {
          "name": "Start dev server",
          "type": "shell",
          "command": "npm run dev"
        }
      ]
    },
    {
      "name": "Skip for now",
      "value": "skip",
      "actions": []
    }
  ]
}
```

**Choice Step Properties:**
- `prompt` (required): Question to display to the user
- `choices` (required): Array of choice objects
- `depends_on` (optional): Dependencies like other step types

**Choice Object Properties:**
- `name` (required): Display name for the choice
- `value` (required): Unique identifier for the choice
- `actions` (required): Array of steps to execute if this choice is selected

### Environment Variables

Environment variable objects support:

```json
{
  "name": "DATABASE_URL",           // Required: Variable name
  "prompt": "Enter database URL:",  // Optional: User prompt
  "default": "localhost:5432",      // Optional: Default value
  "secret": true                    // Optional: Mask input
}
```

### Post-setup Actions

Three types of post-setup actions:

**Message:**
```json
{
  "type": "message",
  "content": "Setup complete!"
}
```

**Open:**
```json
{
  "type": "open",
  "target": "editor",
  "path": "."
}
```

**Choice:**
```json
{
  "type": "choice",
  "prompt": "What would you like to do next?",
  "choices": [
    {
      "name": "Start development server",
      "value": "start",
      "actions": [
        {
          "type": "message",
          "content": "Starting server..."
        }
      ]
    },
    {
      "name": "Open editor",
      "value": "editor",
      "actions": [
        {
          "type": "open",
          "target": "editor",
          "path": "."
        }
      ]
    }
  ]
}
```

## Examples

### Complete JSON Configuration

```json
{
  "$schema": "https://raw.githubusercontent.com/justinloveless/devlift/main/schema/dev-config.schema.json",
  "project_name": "Full-Stack Web App",
  "version": "1",
  "dependencies": [
    {
      "name": "shared-lib",
      "repository": "https://github.com/org/shared-lib.git",
      "tag": "v1.2.0"
    }
  ],
  "environment": {
    "example_file": ".env.example",
    "variables": [
      {
        "name": "DATABASE_URL",
        "prompt": "Enter database connection string:",
        "default": "postgresql://localhost:5432/myapp"
      },
      {
        "name": "JWT_SECRET",
        "prompt": "Enter JWT secret key:",
        "secret": true
      }
    ]
  },
  "setup_steps": [
    {
      "name": "Install Dependencies",
      "type": "package-manager",
      "manager": "npm",
      "command": "install"
    },
    {
      "name": "Start Database",
      "type": "docker-compose",
      "command": "up -d"
    },
    {
      "name": "Run Migrations",
      "type": "database",
      "command": "npm run db:migrate",
      "depends_on": ["Start Database"]
    },
    {
      "name": "Build Application",
      "type": "package-manager",
      "command": "run build",
      "depends_on": ["Install Dependencies"]
    }
  ],
  "post_setup": [
    {
      "type": "message",
      "content": "🎉 Setup complete!\n\nTo start development:\n$ npm run dev\n\nApp will be available at http://localhost:3000"
    },
    {
      "type": "open",
      "target": "editor",
      "path": "."
    }
  ]
}
```

### Equivalent YAML Configuration

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/justinloveless/devlift/main/schema/dev-config.schema.json
project_name: "Full-Stack Web App"
version: "1"

dependencies:
  - name: "shared-lib"
    repository: "https://github.com/org/shared-lib.git"
    tag: "v1.2.0"

environment:
  example_file: ".env.example"
  variables:
    - name: "DATABASE_URL"
      prompt: "Enter database connection string:"
      default: "postgresql://localhost:5432/myapp"
    - name: "JWT_SECRET"
      prompt: "Enter JWT secret key:"
      secret: true

setup_steps:
  - name: "Install Dependencies"
    type: "package-manager"
    manager: "npm"
    command: "install"
  - name: "Start Database"
    type: "docker-compose"
    command: "up -d"
  - name: "Run Migrations"
    type: "database"
    command: "npm run db:migrate"
    depends_on: ["Start Database"]
  - name: "Build Application"
    type: "package-manager"
    command: "run build"
    depends_on: ["Install Dependencies"]

post_setup:
  - type: "message"
    content: |
      🎉 Setup complete!

      To start development:
      $ npm run dev

      App will be available at http://localhost:3000
  - type: "open"
    target: "editor"
    path: "."
```

## Troubleshooting

### Schema Not Working

1. **Check the schema URL**: Ensure it's exactly `https://raw.githubusercontent.com/justinloveless/devlift/main/schema/dev-config.schema.json`
2. **Verify editor support**: Make sure your editor supports JSON Schema
3. **Check file extension**: Use `.json` for JSON files and `.yml`/`.yaml` for YAML files

### IntelliSense Not Appearing

1. **Restart your editor** after adding schema references
2. **Check editor extensions**: Install JSON/YAML extensions if needed
3. **Validate JSON syntax**: Malformed JSON can break IntelliSense

### Common Mistakes

- **Missing quotes in JSON**: All strings must be quoted in JSON
- **Trailing commas**: JSON doesn't allow trailing commas
- **Incorrect indentation in YAML**: YAML is sensitive to indentation
- **Wrong schema URL**: Must be the exact URL provided above

## Best Practices

1. **Choose the right format**:
   - Use JSON for maximum IntelliSense support
   - Use YAML for better readability and comments

2. **Always include schema references**:
   - Enables validation and auto-completion
   - Helps catch errors early

3. **Use meaningful names**:
   - Clear step names help with debugging
   - Descriptive environment variable prompts

4. **Leverage depends_on**:
   - Ensure proper execution order
   - Prevent race conditions

5. **Test your configuration**:
   - Run `dev lift` to test the setup
   - Verify all steps complete successfully

## Schema Validation

The schema enforces these rules:

- `project_name` and `version` are required
- `version` must be "1"
- Step types must be from the allowed list
- Environment variable names should be uppercase with underscores
- Dependencies must have either a `repository` or `path`
- Post-setup actions must have required properties based on type

## Getting Help

If you encounter issues with the schema or IntelliSense:

1. Check this guide for common solutions
2. Validate your JSON/YAML syntax
3. Ensure your editor supports JSON Schema
4. Open an issue on the DevLift GitHub repository

## Schema URL

The schema is hosted at:
```
https://raw.githubusercontent.com/justinloveless/devlift/main/schema/dev-config.schema.json
```

This URL provides the latest version of the schema and is automatically updated when DevLift releases new features. 