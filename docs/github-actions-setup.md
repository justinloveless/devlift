# GitHub Actions Publishing Setup

This project uses GitHub Actions for automated publishing to npm. This guide will help you set up the necessary secrets and understand the workflow.

## Required Secrets

### 1. NPM_TOKEN

You need to create an npm access token and add it to your GitHub repository secrets.

**Steps:**
1. Go to [npmjs.com](https://www.npmjs.com) and log in
2. Click your profile → "Access Tokens"
3. Click "Generate New Token" → "Classic Token"
4. Select "Automation" (for CI/CD use)
5. Copy the generated token
6. Go to your GitHub repository → Settings → Secrets and variables → Actions
7. Click "New repository secret"
8. Name: `NPM_TOKEN`
9. Value: paste your npm token
10. Click "Add secret"

### 2. GITHUB_TOKEN (Automatic)

The `GITHUB_TOKEN` is automatically provided by GitHub Actions and doesn't need manual setup.

## Environment Protection (Recommended)

For additional security, set up an environment for npm publishing:

1. Go to your GitHub repository → Settings → Environments
2. Click "New environment"
3. Name it `npm-publish`
4. Configure protection rules:
   - **Required reviewers**: Add yourself or team members
   - **Wait timer**: Optional delay before deployment
   - **Deployment branches**: Restrict to specific branches (e.g., `main`)

## Workflows Overview

### 1. Test & Build Workflow (`.github/workflows/test.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**
- **Test**: Runs tests on Node.js 16, 18, and 20
- **Type Check**: Validates TypeScript compilation
- **Validate Config**: Checks VERSION file and version sync
- **Security**: Runs npm audit for vulnerabilities

### 2. Publish Workflow (`.github/workflows/publish.yml`)

**Triggers:**
- Push of version tags (e.g., `v1.0.3`)
- Manual workflow dispatch

**Jobs:**
- **Test**: Runs full test suite
- **Publish**: Publishes to npm and creates GitHub release
- **Notification**: Reports success

## Release Process

### Recommended: Use GitHub Actions Publishing

1. **Prepare the release locally:**
   ```bash
   npm run release:prepare
   ```
   This will:
   - Bump the version
   - Run tests locally
   - Create and push a git tag
   - Trigger GitHub Actions publishing

2. **Monitor GitHub Actions:**
   - Go to your repository's Actions tab
   - Watch the "Publish to npm" workflow
   - Verify successful publishing

### Alternative: Test First (Dry Run)

```bash
npm run release:prepare:dry-run
```

### Legacy: Local Publishing (Not Recommended)

The old local publishing commands still work but are not recommended:
```bash
npm run release          # Local publishing (legacy)
npm run release:dry-run  # Local dry run (legacy)
```

## Workflow Features

### Security
- ✅ Environment protection with required reviewers
- ✅ Secure npm token handling
- ✅ Version consistency checks
- ✅ Duplicate version prevention

### Quality Assurance
- ✅ Multi-Node.js version testing
- ✅ TypeScript type checking
- ✅ Security vulnerability scanning
- ✅ Build verification

### Automation
- ✅ Automatic GitHub release creation
- ✅ Version tag management
- ✅ npm publishing
- ✅ Coverage report artifacts

## Troubleshooting

### Publishing Fails with 403 Error

**Cause:** Usually an npm token issue or version already exists.

**Solutions:**
1. Check if the version already exists on npm
2. Verify npm token has correct permissions
3. Check if token is expired
4. Ensure package name is available

### GitHub Actions Can't Access Secrets

**Cause:** Secrets not configured or environment protection issues.

**Solutions:**
1. Verify `NPM_TOKEN` secret exists
2. Check environment protection settings
3. Ensure workflow has correct environment reference

### Tests Fail in CI but Pass Locally

**Cause:** Environment differences or missing dependencies.

**Solutions:**
1. Check Node.js version differences
2. Verify all dependencies in package.json
3. Check for OS-specific issues
4. Review test outputs in Actions logs

## Best Practices

1. **Always use dry run first**: Test with `npm run release:prepare:dry-run`
2. **Review workflow logs**: Check Actions tab for detailed logs
3. **Use environment protection**: Add required reviewers for production
4. **Keep tokens secure**: Never commit tokens to code
5. **Monitor releases**: Watch Actions workflow completion
6. **Tag consistently**: Use semantic versioning (v1.0.3)

## Manual Trigger

You can manually trigger publishing through GitHub Actions:

1. Go to Actions tab → "Publish to npm"
2. Click "Run workflow"
3. Select branch and optionally specify version
4. Click "Run workflow"

This is useful for republishing or emergency releases. 