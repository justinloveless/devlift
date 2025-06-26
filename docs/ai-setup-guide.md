# AI-Powered Prep Setup Guide

This guide helps you set up and use the AI-powered configuration generation feature in DevLift. The AI can automatically analyze your project and generate a comprehensive `dev.yml` configuration file.

## Overview

The AI-powered prep feature analyzes your project structure, dependencies, documentation, and configuration files to automatically generate a complete development environment setup. This saves significant time compared to manual configuration and often catches setup steps you might miss.

## Supported AI Providers

DevLift supports multiple AI providers, each with their own strengths:

### OpenAI (Recommended)
- **Model**: GPT-4
- **Strengths**: Most comprehensive analysis, excellent at understanding complex project structures
- **Best for**: Large projects, complex setups, multi-language projects
- **Sign up**: [platform.openai.com](https://platform.openai.com)

### Anthropic Claude
- **Model**: Claude 3
- **Strengths**: Excellent reasoning about development workflows, good at dependency management
- **Best for**: Web applications, API projects, development workflow optimization
- **Sign up**: [console.anthropic.com](https://console.anthropic.com)

### Google AI (Gemini)
- **Model**: Gemini Pro
- **Strengths**: Good technical analysis, strong with documentation parsing
- **Best for**: Technical projects, projects with extensive documentation
- **Sign up**: [Google AI Studio](https://makersuite.google.com/app/apikey)

## Setup Instructions

### Method 1: Environment Variables (Recommended)

Set your API key as an environment variable:

**OpenAI:**
```bash
export OPENAI_API_KEY="sk-your-openai-api-key-here"
```

**Anthropic:**
```bash
export ANTHROPIC_API_KEY="sk-ant-your-anthropic-key-here"
```

**Google AI:**
```bash
export GOOGLE_API_KEY="your-google-ai-key-here"
```

**Make it permanent** by adding to your shell profile:
```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.profile
echo 'export OPENAI_API_KEY="your-key-here"' >> ~/.bashrc
source ~/.bashrc
```

### Method 2: Global Configuration File

Create a global config file at `~/.devlift/config.json`:

```json
{
  "aiProviders": {
    "openai": "sk-your-openai-api-key-here",
    "anthropic": "sk-ant-your-anthropic-key-here",
    "google": "your-google-ai-key-here"
  },
  "defaultAIProvider": "openai",
  "cloneBasePath": "~/devlift/clones"
}
```

**Benefits of global config:**
- ✅ Centralized key management
- ✅ Set default provider
- ✅ Configure other DevLift settings
- ✅ Works across all projects

## Getting API Keys

### OpenAI Setup
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in to your account
3. Navigate to "API Keys" in your dashboard
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)
6. Set the environment variable or add to global config

**Pricing**: Pay-per-use, typically $0.01-0.03 per configuration generation

### Anthropic Setup
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in to your account
3. Navigate to "API Keys" section
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)
6. Set the environment variable or add to global config

**Pricing**: Pay-per-use, competitive with OpenAI

### Google AI Setup
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key
5. Set the environment variable or add to global config

**Pricing**: Generous free tier, then pay-per-use

## Using AI-Powered Prep

### Basic Usage

```bash
# Navigate to your project
cd /path/to/your/project

# Let AI analyze and generate config
dev prep --ai
```

This will:
1. 🔍 Scan your project files
2. 🧠 Analyze with AI
3. 📝 Generate comprehensive dev.yml
4. ✅ Show you the result for review

### Advanced Usage

**Specify AI Provider:**
```bash
dev prep --ai --provider openai     # Use OpenAI specifically
dev prep --ai --provider anthropic  # Use Anthropic specifically
dev prep --ai --provider google     # Use Google AI specifically
```

**Force Overwrite:**
```bash
dev prep --ai --force  # Overwrite existing dev.yml without asking
```

**Fallback to Manual:**
```bash
dev prep --interactive  # Skip AI, use manual wizard
```

## What the AI Analyzes

The AI performs comprehensive project analysis:

### File Types Analyzed
- **Package files**: `package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, etc.
- **Lock files**: `package-lock.json`, `yarn.lock`, `Pipfile.lock`, etc.
- **Docker files**: `Dockerfile`, `docker-compose.yml`
- **Environment**: `.env.example`, `.env.template`
- **Documentation**: `README.md`, `CONTRIBUTING.md`, setup guides
- **Build configs**: `Makefile`, `webpack.config.js`, `vite.config.js`
- **CI/CD**: `.github/workflows/*`, `.gitlab-ci.yml`

### Technologies Detected
- **Platforms**: Node.js, Python, Go, Rust, Java, etc.
- **Frameworks**: React, Vue, Django, Flask, Express, Next.js, etc.
- **Databases**: PostgreSQL, MySQL, MongoDB, Redis, etc.
- **Package Managers**: npm, yarn, pnpm, pip, cargo, etc.
- **Build Tools**: Webpack, Vite, Rollup, etc.

### Generated Configuration
- ✅ **Setup steps** with proper ordering
- ✅ **Dependencies** between steps
- ✅ **Environment variables** from examples and docs
- ✅ **Database setup** commands
- ✅ **Build and test** commands
- ✅ **Post-setup instructions**
- ✅ **Helpful comments** explaining each step

## Example Generated Configuration

For a typical Node.js + PostgreSQL project, the AI might generate:

```yaml
project_name: "My Web App"
version: "1"

environment:
  example_file: ".env.example"
  variables:
    - name: "DATABASE_URL"
      prompt: "Enter your database connection string:"
      default: "postgresql://localhost:5432/myapp"
    - name: "JWT_SECRET"
      prompt: "Enter a secret key for JWT tokens:"
      secret: true

setup_steps:
  - name: "Install Dependencies"
    type: "package-manager"
    manager: "npm"
    command: "install"

  - name: "Start Database"
    type: "shell"
    command: "docker-compose up -d db"

  - name: "Run Database Migrations"
    type: "shell"
    command: "npm run db:migrate"
    depends_on: ["Start Database"]

  - name: "Seed Database"
    type: "shell"
    command: "npm run db:seed"
    depends_on: ["Run Database Migrations"]

post_setup:
  - type: "message"
    content: |
      🎉 Setup complete!
      
      To start development:
      $ npm run dev
      
      Your app will be available at:
      http://localhost:3000
```

## Troubleshooting

### Common Issues

**"Failed to obtain API key"**
- Check your environment variable: `echo $OPENAI_API_KEY`
- Verify the key format (should start with `sk-` for OpenAI)
- Check the key is active in your provider dashboard
- Try using global config file instead

**"AI analysis failed"**
- Check your internet connection
- Verify API key permissions and quota
- Check if you have sufficient credits/quota
- Try a different provider: `dev prep --ai --provider anthropic`

**"Invalid provider specified"**
- Valid providers: `openai`, `anthropic`, `google`
- Check spelling: `dev prep --ai --provider openai`

**"Network timeout"**
- Check your internet connection
- Try again (temporary network issues)
- Use manual mode as fallback: `dev prep --interactive`

### Fallback Options

If AI analysis fails, DevLift automatically offers fallback options:

1. **Try different provider**: Switch to another AI provider
2. **Manual configuration**: Use the interactive wizard
3. **Basic template**: Generate a minimal configuration

### Privacy & Security

- 🔒 **API keys are never logged** or stored in project files
- 🔒 **Project data is not retained** by AI providers
- 🔒 **Analysis is one-time only** - no persistent storage
- 🔒 **Local processing** where possible
- 🔒 **Full transparency** - review all generated configurations

## Best Practices

### For Repository Maintainers

1. **Generate once, commit**: Run `dev prep --ai` and commit the result
2. **Review the output**: AI is smart but verify the configuration
3. **Test the setup**: Run `dev lift` on a clean clone to test
4. **Document customizations**: Add comments for any manual changes

### For Users

1. **Keep API keys secure**: Use environment variables or global config
2. **Review generated configs**: Always check before using
3. **Report issues**: If AI misses something, use manual mode
4. **Update periodically**: Re-run when project structure changes

## Cost Management

### Typical Costs
- **OpenAI**: $0.01-0.03 per configuration generation
- **Anthropic**: Similar to OpenAI, competitive pricing
- **Google AI**: Free tier covers most usage

### Cost Optimization
- Use the **free tier** of Google AI for light usage
- Set **usage limits** in your provider dashboard
- Use **manual mode** for simple projects
- **Cache results** - don't regenerate unnecessarily

## Getting Help

If you need assistance:

```bash
dev prep --help          # Show all options
dev --help               # Show all commands
```

**Community Support:**
- GitHub Issues: [Report problems or suggestions](https://github.com/justinloveless/devlift/issues)
- Documentation: Check the main README for updates

**Provider Support:**
- OpenAI: [help.openai.com](https://help.openai.com)
- Anthropic: [support.anthropic.com](https://support.anthropic.com)
- Google AI: [ai.google.dev/docs](https://ai.google.dev/docs) 