# Beta Release Guide

This guide explains how to create, publish, and manage beta versions of DevLift.

## Overview

Beta releases allow you to test new features with users before releasing them to the stable channel. Beta versions use npm's dist-tags feature to publish alongside stable versions without affecting the main release.

## Beta Release Workflow

### 1. Create a Beta Version

```bash
# Prepare a new beta release (interactive)
npm run beta:prepare

# Or dry-run to see what would happen
npm run beta:prepare:dry-run
```

The beta preparation script will:
- ✅ Check git status for uncommitted changes
- 🔢 Calculate the next beta version (e.g., `1.1.0-beta.1`)
- 🧪 Run tests locally to ensure quality
- 🏗️ Build the project to verify compilation
- 📝 Commit version changes
- 🏷️ Create a git tag with `beta-v` prefix
- 🚀 Push to trigger GitHub Actions publishing

### 2. Beta Version Types

**From Stable Version (1.0.13):**
- **Patch Beta**: `1.0.14-beta.1` (bug fixes)
- **Minor Beta**: `1.1.0-beta.1` (new features) 
- **Major Beta**: `2.0.0-beta.1` (breaking changes)

**From Existing Beta (1.1.0-beta.1):**
- **Increment**: `1.1.0-beta.2` (fixes to the beta)
- **New Beta**: Choose patch/minor/major for new version

### 3. Manual Beta Commands

```bash
# Bump to beta version manually
npm run beta:bump minor     # Creates 1.1.0-beta.1
npm run beta:bump patch     # Creates 1.0.14-beta.1

# Publish beta manually (after GitHub Actions)
npm run beta:publish
```

### 4. GitHub Actions Automation

When you push a `beta-v*` tag, GitHub Actions will:
- 🧪 Run full test suite
- 🏗️ Build the project
- 📦 Publish to npm with `beta` tag
- 🏷️ Update the `beta` dist-tag
- 📋 Create a GitHub pre-release
- 📢 Notify success with installation instructions

## Installing Beta Versions

### For End Users

```bash
# Install latest beta
npm install -g devlift@beta

# Install specific beta version
npm install -g devlift@1.1.0-beta.2

# Check what beta version is current
npm view devlift dist-tags
```

### For Testing

```bash
# Test beta in isolated environment
npx devlift@beta --version

# Or install globally for testing
npm install -g devlift@beta
dev --version
```

## Promoting Beta to Stable

Once you've tested the beta thoroughly:

```bash
# Promote beta to stable (interactive)
npm run beta:promote

# See available beta versions
npm view devlift versions --json | grep beta
```

The promotion script will:
- 📋 Show all available beta versions
- ✅ Let you select which beta to promote
- 🔄 Remove `-beta.X` suffix for stable version
- 🧪 Run tests to ensure stability
- 🏗️ Build project
- 📝 Commit stable version
- 🏷️ Create stable git tag
- 📦 Publish to npm as `latest`
- 🎯 Update dist-tags

## Beta Management Commands

```bash
# View current dist-tags
npm view devlift dist-tags

# View all versions (including betas)
npm view devlift versions --json

# Check what's published
npm info devlift

# Manual dist-tag management
npm dist-tag add devlift@1.1.0-beta.1 beta
npm dist-tag rm devlift beta
```

## Example Workflow

Here's a complete example of releasing a new AI feature:

```bash
# 1. Develop new AI feature on feature branch
git checkout -b feature/ai-improvements
# ... make changes ...
git commit -m "Add new AI analysis features"

# 2. Merge to main and create beta
git checkout main
git merge feature/ai-improvements

# 3. Prepare beta release
npm run beta:prepare
# Choose "Minor beta (new features)"
# Confirms: 1.0.13 → 1.1.0-beta.1

# 4. GitHub Actions publishes automatically
# Monitor: https://github.com/justinloveless/devlift/actions

# 5. Test the beta
npm install -g devlift@beta
dev --version  # Should show 1.1.0-beta.1

# 6. Get feedback, fix issues, release beta.2 if needed
npm run beta:prepare
# Choose "Increment beta number"
# Confirms: 1.1.0-beta.1 → 1.1.0-beta.2

# 7. When ready, promote to stable
npm run beta:promote
# Select 1.1.0-beta.2
# Confirms: 1.1.0-beta.2 → 1.1.0 (stable)
```

## Best Practices

### 🧪 Beta Testing
- Always test beta versions thoroughly before promotion
- Use beta versions in non-production environments first
- Gather feedback from beta users before stable release

### 📋 Version Strategy
- Use **patch betas** for bug fixes and small improvements
- Use **minor betas** for new features and enhancements  
- Use **major betas** for breaking changes
- Increment beta numbers for fixes to existing betas

### 🔄 Release Cadence
- Create betas frequently for rapid iteration
- Keep beta versions short-lived (days/weeks, not months)
- Promote stable betas quickly to reduce version fragmentation

### 📢 Communication
- Document beta changes in GitHub pre-releases
- Communicate beta availability to your user community
- Provide clear feedback channels for beta testers

## Troubleshooting

### Beta Not Publishing
```bash
# Check if tag was created correctly
git tag -l "beta-v*"

# Check GitHub Actions
# Visit: https://github.com/justinloveless/devlift/actions

# Verify npm authentication
npm whoami
```

### Version Conflicts
```bash
# Check what versions exist
npm view devlift versions --json

# Check current dist-tags
npm view devlift dist-tags

# Fix VERSION file if needed
echo "1.1.0-beta.1" > VERSION
npm run version:sync
```

### Promotion Issues
```bash
# Verify beta exists on npm
npm view devlift@1.1.0-beta.1

# Check if stable version already exists
npm view devlift@1.1.0

# Manual promotion if script fails
npm publish --tag latest
npm dist-tag add devlift@1.1.0 latest
```

## Advanced Usage

### Custom Beta Tags
You can create custom beta channels:

```bash
# Publish to custom tag
npm publish --tag alpha
npm publish --tag rc

# Install from custom tag
npm install -g devlift@alpha
npm install -g devlift@rc
```

### Automated Beta Testing
Set up automated testing of beta versions:

```bash
# In CI/CD pipeline
npm install -g devlift@beta
dev --version
# ... run integration tests ...
```

This beta release system provides a robust way to iterate quickly while maintaining stability for your main user base! 