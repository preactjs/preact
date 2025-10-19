# Common Development Tasks

This guide covers common tasks you might need while developing with or contributing to Preact.

## Table of Contents

- [Setting Up Your Development Environment](#setting-up-your-development-environment)
- [Running Tests](#running-tests)
- [Building the Project](#building-the-project)
- [Debugging](#debugging)
- [Code Quality](#code-quality)
- [Working with Git](#working-with-git)
- [Publishing (Maintainers Only)](#publishing-maintainers-only)

## Setting Up Your Development Environment

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/preactjs/preact.git
cd preact

# Install dependencies
npm install

# Build all packages
npm run build
```

### Development Workflow

```bash
# Start development mode (watches for changes)
npm run dev

# Or watch a specific package
npm run dev:hooks
npm run dev:compat
```

## Running Tests

### Run All Tests

```bash
# Run complete test suite (linting + TypeScript + unit tests)
npm test
```

### Run Specific Test Suites

```bash
# Run only unit/integration tests
npm run test:vitest

# Run unit tests in watch mode (recommended for development)
npm run test:vitest:watch

# Run TypeScript definition tests
npm run test:ts

# Run with coverage
COVERAGE=true npm run test:vitest
```

### Run Individual Tests

Add `.only` to focus on a specific test:

```javascript
// In your test file
it.only('should test specific behavior', () => {
  expect(result).toBe(expected);
});
```

Or use `.skip` to skip a test:

```javascript
it.skip('this test is temporarily disabled', () => {
  // Test code
});
```

### Running Tests in Different Browsers

```bash
# Tests run in Chromium by default via Playwright
# To test in different environments, modify vitest.config.mjs
```

## Building the Project

### Build All Packages

```bash
npm run build
```

### Build Specific Packages

```bash
npm run build:core      # Build Preact core
npm run build:hooks     # Build hooks package
npm run build:compat    # Build React compatibility layer
npm run build:debug     # Build debug package
npm run build:devtools  # Build devtools bridge
npm run build:test-utils # Build test utilities
npm run build:jsx       # Build JSX runtime
```

### Understanding Build Outputs

After building, you'll find these files in each package's `dist/` folder:

- `.js` - CommonJS bundle (for Node.js)
- `.mjs` - ES Module bundle (for modern bundlers)
- `.umd.js` - UMD bundle (for direct browser use)
- `.d.ts` - TypeScript definitions

## Debugging

### Using the Demo App

The `demo/` folder contains a development app for testing:

```bash
cd demo
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

### Debug Mode

Preact has a built-in debug mode with helpful warnings:

```javascript
// Add this before importing Preact
import 'preact/debug';
import { render } from 'preact';
```

### Browser DevTools

Install the [Preact DevTools extension](https://preactjs.github.io/preact-devtools/) for Chrome or Firefox to inspect Preact applications.

### Debugging Tests

```bash
# Add debugger statements in your test
it('should test something', () => {
  debugger; // Execution will pause here
  expect(result).toBe(expected);
});

# Run tests with Node debugger
node --inspect-brk node_modules/.bin/vitest
```

## Code Quality

### Linting

```bash
# Run linter
npm run lint

# Lint with oxlint
npm run oxlint

# Type check with TypeScript
npm run tsc
```

### Formatting

```bash
# Format all files
npm run format

# Check formatting without making changes
npm run format:check
```

### Pre-commit Hooks

Pre-commit hooks automatically run before each commit to ensure code quality:

- Formats code with Biome
- Runs linting

If you need to bypass hooks (not recommended):

```bash
git commit --no-verify
```

## Working with Git

### Branch Naming Convention

Use descriptive branch names:

```bash
git checkout -b feature/add-new-hook
git checkout -b fix/memory-leak-in-effect
git checkout -b docs/improve-readme
git checkout -b refactor/simplify-diff-algorithm
```

### Commit Message Guidelines

Write clear, concise commit messages:

```bash
# Good commit messages
git commit -m "Add useId hook implementation"
git commit -m "Fix memory leak in useEffect cleanup"
git commit -m "Docs: Add examples for custom hooks"
git commit -m "Refactor: Simplify component diffing logic"

# Avoid vague messages
git commit -m "Fix bug"  # ❌ Too vague
git commit -m "Update"   # ❌ Not descriptive
```

### Creating a Pull Request

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Commit your changes
6. Push to your fork
7. Create a Pull Request on GitHub

### Syncing Your Fork

```bash
# Add upstream remote (do this once)
git remote add upstream https://github.com/preactjs/preact.git

# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## Benchmarks

### Running Benchmarks

```bash
# Initialize benchmarks submodule (first time only)
git submodule update --init --recursive
cd benchmarks
pnpm install

# Run benchmarks
pnpm run bench
```

### Comparing Performance

```bash
# Benchmark current branch
pnpm run bench

# Switch branches and compare
git checkout main
pnpm run bench

# Compare results
```

## Working with Submodules

```bash
# Update submodules to latest commit
git submodule update --remote

# Update submodules when switching branches
git submodule update --recursive
```

## Publishing (Maintainers Only)

See [CONTRIBUTING.md](./CONTRIBUTING.md#releasing-preact-maintainers-only) for detailed release instructions.

Quick reference:

```bash
# 1. Update version in package.json
# 2. Create and push a git tag
git tag 10.x.x
git push --tags

# 3. Wait for GitHub Actions to complete
# 4. Publish to npm
node ./scripts/release/publish.mjs 10.x.x
```

## Troubleshooting

### Clean Install

If you encounter issues, try a clean installation:

```bash
# Remove dependencies and build artifacts
rm -rf node_modules dist compat/dist hooks/dist debug/dist

# Reinstall
npm install
npm run build
```

### Test Issues

```bash
# Clear test cache
npx vitest run --clearCache
```

### Git Issues

```bash
# Reset to clean state (⚠️ This will discard all local changes)
git reset --hard HEAD
git clean -fd
```

## Useful Resources

- [Official Documentation](https://preactjs.com)
- [Contributing Guide](./CONTRIBUTING.md)
- [Quick Start Guide](./QUICK_START.md)
- [GitHub Issues](https://github.com/preactjs/preact/issues)
- [Community Slack](https://chat.preactjs.com)

## Tips for New Contributors

1. **Start Small**: Look for issues labeled "good first issue"
2. **Ask Questions**: Use GitHub issues or Slack - the community is friendly!
3. **Read Existing Code**: Understanding the codebase takes time
4. **Test Your Changes**: Always run tests before submitting a PR
5. **Document Your Changes**: Update docs when adding features
6. **Be Patient**: Code reviews may take time, but feedback helps everyone learn

---

Happy contributing! 🚀
