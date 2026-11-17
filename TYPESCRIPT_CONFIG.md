# TypeScript Configuration Guide

This project uses a **single, simplified TypeScript configuration** optimized for both VSCode developer experience and clean production builds.

## Configuration Philosophy

Following the upstream [contributor-assistant/github-action](https://github.com/contributor-assistant/github-action) pattern with improvements:
- ✅ Single `tsconfig.json` (matches upstream simplicity)
- ✅ VSCode recognizes Jest types in test files (no red squiggles!)
- ✅ Production builds compile only `src/` files (clean output)
- ✅ Enhanced with `@types/jest` for full IntelliSense (improvement over upstream)

## Configuration File

### 📁 `tsconfig.json` (Universal Config)
- **Purpose**: IDE support and type checking for all files
- **VSCode**: Sees all files including tests with Jest types
- **Build**: Command-line flags ensure only `src/` compiles
- **Types**: Node.js + Jest for full IDE support
- **Used by**:
  - VSCode TypeScript language server (checks everything)
  - Build script (compiles only src/ via CLI args)
  - Jest via ts-jest transformer

**Key settings:**
```json
{
  "compilerOptions": {
    "types": ["node", "jest"]     // IDE recognizes Jest globals everywhere
  },
  "exclude": ["node_modules", "dist", "lib"]  // Build artifacts only
}
```

**Build command:**
```json
{
  "scripts": {
    "build": "tsc --rootDir src --outDir lib src/**/*.ts && ncc build"
  }
}
```
- `--rootDir src`: Sets source root for path resolution
- `src/**/*.ts`: Only compile source files (not tests)
- `--outDir lib`: Output to lib directory

## Scripts

```bash
# Production build (only src/ compiled to lib/)
npm run build

# Run tests (uses same tsconfig.json)
npm test

# Type check everything including tests
npx tsc --noEmit
```

## Benefits

✅ **VSCode IntelliSense**: No "Cannot find name 'jest'" errors in test files
✅ **Clean Builds**: Only `src/` files compiled to `lib/` directory
✅ **Upstream Compatible**: Single config matches contributor-assistant/github-action
✅ **Clean Production Builds**: Tests excluded via `exclude` and `rootDir`
✅ **Superior IDE Support**: @types/jest eliminates "Cannot find name 'jest'" errors
✅ **Simple Maintenance**: Single config file to manage
✅ **CI/CD Compatible**: Node.js matrix builds work without modification

## Improvements Over Upstream

While matching upstream's single-config approach, we include:
1. **`@types/jest`** in devDependencies (VSCode IntelliSense for tests)
2. **`jest`** package in devDependencies (not in upstream)
3. **`types: ["node", "jest"]`** in tsconfig.json (prevents IDE errors)

## VSCode Configuration

The `.vscode/settings.json` is configured to:
- Use workspace TypeScript version
- Recognize Jest command for test execution
- Exclude compiled files and node_modules from search

## Dependency Organization

### Production Dependencies (`dependencies`)
```json
{
  "@actions/core": "Runtime GitHub Actions core",
  "@actions/github": "Runtime GitHub API access",
  "@octokit/rest": "Runtime REST API client",
  "lodash": "Runtime utility library"
}
```

### Development Dependencies (`devDependencies`)
```json
{
  "@types/jest": "Jest type definitions",
  "@types/node": "Node.js type definitions",
  "jest": "Test framework",
  "ts-jest": "TypeScript transformer for Jest",
  "typescript": "TypeScript compiler",
  "@vercel/ncc": "Production bundler"
}
```

## How It Works

1. **VSCode** loads `tsconfig.json` → sees everything, no errors
2. **`npm run build`** runs `tsc` → compiles only `src/` (via `rootDir`), excludes tests
3. **`npm test`** runs Jest with ts-jest → uses same tsconfig.json

This setup matches the upstream GitHub Action project structure while providing better developer experience through proper type definitions.
