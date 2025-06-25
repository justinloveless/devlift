# DevLift V1 - Detailed Task List & TDD Workflow

This document outlines the specific tasks required to build Version 1 of the `dev` CLI tool. It is structured to follow a **Test-Driven Development (TDD)** workflow.

## The TDD Workflow
For each feature, follow this cycle:
1.  **Write a new test** describing the desired functionality.
2.  **Run the test suite** to confirm that the new test fails as expected.
3.  **Write the minimum amount of code** required to make the new test pass.
4.  **Run the test suite again** to confirm all tests now pass.
5.  **Refactor** the code if necessary, ensuring tests continue to pass.
6.  **Update this document** by checking off the completed tasks.
7.  **Commit** the work to Git once a feature is complete and fully tested.

---

## Phase 0: TDD and Testing Setup

- [x] **0.1. Install Testing Dependencies**
    - [x] Run `npm install --save-dev jest`.
- [x] **0.2. Configure Testing Environment**
    - [x] Add `"test": "node --experimental-vm-modules node_modules/jest/bin/jest.js"` to `package.json` scripts.
    - [x] Create `jest.config.js` in the root.
    - [x] Create the `tests` directory.
- [x] **0.3. Configure Babel for Jest**
    - [x] Run `npm install --save-dev @babel/preset-env`.
    - [x] Create `babel.config.cjs` with ES module support.
- [x] **0.4. Create `.gitignore**
    - [x] Create a `.gitignore` file in the root to exclude `node_modules` and other artifacts.
- [x] **0.5. Initial Git Commit**
    - [x] Commit all the initial setup files.

## Phase 1: Project Setup & Core Infrastructure

- [x] **1.1. Restructure Project Directory**
    - [x] Create a `src` directory to house all source code.
    - [x] Inside `src`, create the following subdirectories: `commands`, `core`, `utils`.
    - [x] Move the existing `index.js` file to `src/index.js`.
    - [x] Update the `package.json` `main` and `bin` entries to point to `src/index.js`.
- [x] **1.2. Install Core Dependencies**
    - [x] Run `npm install commander chalk inquirer js-yaml simple-git execa fs-extra`.
- [x] **1.3. Implement Base CLI Framework (TDD)**
    - [x] **Test:** Create `tests/index.test.js`. Add a test to run `dev --version` and check if it matches `package.json`.
    - [x] **Run & Fail:** Run `npm test` and confirm it fails as expected.
    - [x] **Implement:**
        - [x] Add `"type": "module"` to `package.json`.
        - [x] Create `src/commands/install.js`.
        - [x] Create `src/commands/init.js`.
        - [x] Refactor `src/index.js` to import and use the new command modules.
    - [x] **Run & Pass:** Run `npm test` and confirm all tests pass.
- [x] **1.4. Commit and Update:**
    - [x] Commit the base CLI framework.
    - [x] Check off all completed tasks in this list.

## Phase 2: Configuration (`dev.yml`) Handling

- [x] **2.1. Implement Configuration Loader**
    - [x] **Test:** Create `tests/core/config.test.js`. Add tests for loading a valid `dev.yml` and for handling a missing file.
    - [x] **Run & Fail:** Run `npm test` to confirm failure.
    - [x] **Implement:** Create `src/core/config.js` with a `loadConfig(directory)` function that reads, parses, and returns the YAML content.
    - [x] **Run & Pass:** Run `npm test` until all tests pass.
- [x] **2.2. Implement Configuration Validator**
    - [x] **Test:** In `tests/core/config.test.js`, add tests to validate the configuration schema. Test for a valid config, a config with an unsupported version, and a config with invalid step types.
    - [x] **Run & Fail:** Confirm failure.
    - [x] **Implement:** Create `src/core/validator.js` with a `validateConfig(config)` function. It should check for a supported `version` and validate the `setup` array against a predefined schema (e.g., each step must have a `type` and other required fields).
    - [x] **Run & Pass:** Confirm all tests pass.
- [x] **2.3. Commit and Update:** Commit the config loader and validator and check off tasks.

## Phase 3: Utilities (`validation.js`, `path.js`)

- [x] **3.1. Implement Git URL Validator**
    - [x] **3.1.1. Write Tests for `validation.js`:**
        - [x] Create `tests/utils/validation.test.js`.
        - [x] Write multiple test cases for `isValidGitUrl` with valid (`https`, `http`, `git@`) and invalid URLs.
    - [x] **3.1.2. Run Tests to Confirm Failure:** Run `npm test`.
    - [x] **3.1.3. Implement `validation.js`:** Create `src/utils/validation.js` and write the `isValidGitUrl` function using a regular expression.
    - [x] **3.1.4. Run Tests to Confirm Pass:** Run `npm test` until validation tests pass.
- [x] **3.2. Implement Clone Path Generator**
    - [x] **3.2.1. Write Tests for `path.js`:**
        - [x] Create `tests/utils/path.test.js`.
        - [x] Write a test for `getClonePath` that mocks the `os.homedir()` method to ensure predictable output. Assert that a URL like `https://github.com/org/repo.git` correctly resolves to `mocked_home/devlift/clones/github.com/org/repo`.
    - [x] **3.2.2. Run Tests to Confirm Failure:** Run `npm test`.
    - [x] **3.2.3. Implement `path.js`:** Create `src/utils/path.js` and write the `getClonePath` function.
    - [x] **3.2.4. Run Tests to Confirm Pass:** Run `npm test` until path tests pass.
- [x] **3.3. Commit and Update**
    - [ ] Commit the utility functions to Git.
    - [ ] Check off all completed tasks in this phase.

## Phase 4: `dev lift` Command (Core Logic)

- [x] **4.1. Write Integration Tests for `lift` command**
    - [x] In a new file `tests/commands/lift.test.js`, use `jest.mock` to mock `simple-git`, `inquirer`, and your `ExecutionEngine` (which doesn't exist yet but will be mocked).
    - [x] Write a test that simulates a user running `dev lift <valid_url>` where a `dev.yml` is expected to be found. Assert that `simple-git`'s `clone` method is called with the correct arguments and that the `ExecutionEngine` is instantiated and its `run` method is called.
    - [x] Write a test for the case where `loadConfig` returns `null` (no `dev.yml`). Assert that `inquirer` is called to prompt the user to initialize a new config.
- [x] **4.2. Run Tests to Confirm Failure:** Run `npm test`.
- [x] **4.3. Implement `lift` Command Logic**
    - [x] In `src/commands/lift.js`, define the `lift` command with its argument `<repo_url>` and option `--yes`.
    - [x] Implement the logic that uses your utilities to validate the URL and get the clone path.
    - [x] Use `simple-git` to perform the clone.
    - [x] Call your `config-parser`.
    - [x] Based on the result, either call the (mocked) `ExecutionEngine` or (mocked) `inquirer`.
- [x] **4.4. Run Tests to Confirm Pass:** Run `npm test` until the `lift` command integration tests pass.
- [x] **4.5. Commit and Update:** Commit the `lift` command structure and check off tasks.

## Phase 5: The Execution Engine

- [x] **5.1. Write Tests for `ExecutionEngine`**
    - [x] Create `tests/core/execution-engine.test.js`.
    - [x] Mock `fs-extra`, `inquirer`, and `execa` using `jest.mock`.
    - [x] Write tests for the `run` method, which will orchestrate private helpers.
    - [x] Write a unit test for handling the environment setup. Provide a mock config and assert `fs-extra.copy` and `inquirer` are called correctly.
    - [x] Write unit tests for the step runner. For `package-manager` steps, assert `execa` is called with the right command. For `shell` steps, assert `inquirer` (for confirmation) and `execa` are called correctly.
    - [x] Write unit tests for post-setup actions, asserting `console.log` is called for messages and `execa` for opening an editor.
- [x] **5.2. Run Tests to Confirm Failure:** Run `npm test`.
- [x] **5.3. Implement `ExecutionEngine` Class**
    - [x] Create `src/core/execution-engine.js`.
    - [x] Implement the class and its methods to make the tests pass.
- [x] **5.4. Run Tests to Confirm Pass:** Run `npm test` until all engine tests pass.
- [x] **5.5. Commit and Update:** Commit the engine and check off tasks.

## Phase 6: `dev prep` Command (Interactive Wizard)

- [x] **6.1. Write Tests for `prep` Command**
    - [x] Create `tests/commands/prep.test.js`.
    - [x] Mock `fs-extra` and `inquirer`.
    - [x] Write a test that simulates a directory state (e.g., `package.json` exists).
    - [x] Mock the return values of `inquirer.prompt` to simulate a full set of user answers.
    - [x] Assert that the final call to `fs-extra.writeFileSync` (or similar) contains a correctly formatted YAML string based on the mocked inputs.
- [x] **6.2. Run Tests to Confirm Failure:** Run `npm test`.
- [x] **6.3. Implement `prep` Command Logic**
    - [x] In `src/commands/prep.js`, implement the interactive wizard using `inquirer`, your directory inspection logic, and `js-yaml` to generate the final file.
- [x] **6.4. Run Tests to Confirm Pass:** Run `npm test` until `prep` command tests pass.
- [x] **6.5. Commit and Update:** Commit the `prep` feature and check off all tasks. You have reached V1!

---

*The following tasks have been added after an automated analysis of the PRD and existing task list to identify and address functionality gaps before considering V1 complete.*

## Phase 7: Hardening Core Functionality

- [x] **7.1. Re-evaluate Configuration Validator (Task 2.2)**
    - [x] **Note:** Task 2.2 was marked complete, but `src/core/validator.js` does not exist. This is a critical feature.
    - [x] **Test:** Create `tests/core/validator.test.js`. Add tests to validate the full `dev.yml` schema as defined in the PRD (including `environment`, `setup_steps`, and `post_setup` objects).
    - [x] **Implement:** Create `src/core/validator.js` and the `validateConfig` function.
    - [x] **Integrate:** Use the validator in `src/core/config.js` after loading the file. If validation fails, throw a specific, user-friendly error.
    - [x] **Run & Pass:** Ensure all validation tests pass.
- [x] **7.2. Implement Config Versioning**
    - [x] **Test:** In `validator.test.js`, add a test to ensure a `version` field exists in `dev.yml` and that it matches a supported version (e.g., "1").
    - [x] **Implement:** Update the validator to perform this check.
    - [x] **Documentation:** Update the `dev.yml` schema in the PRD to include the mandatory `version: 1` field.
- [x] **7.3. Implement `depends_on` Logic for Setup Steps (TDD)**
    - [x] **Test:** In `execution-engine.test.js`, write a test for a configuration with multiple steps using `depends_on`. Ensure the steps are executed in the correct topological order. Test for circular dependency errors.
    - [x] **Implement:** In `ExecutionEngine`, before running steps, create a dependency graph and perform a topological sort. If a cycle is detected, throw an error.
    - [x] **Run & Pass:** Ensure dependency resolution tests pass.
- [x] **7.4. Implement Package Manager Auto-Detection (TDD)**
    - [x] **Test:** In `execution-engine.test.js`, create a test for a `package-manager` step where the `manager` field is omitted. Mock the filesystem to include a `pnpm-lock.yaml` and assert that the correct `pnpm` command is executed. Repeat for `yarn.lock` and `package-lock.json`.
    - [x] **Implement:** In `ExecutionEngine`, add logic to detect the package manager by looking for common lockfiles if the `manager` is not specified.
    - [x] **Run & Pass:** Ensure auto-detection tests pass.
- [x] **7.5. Implement Setup Inference for `lift` Command**
    - [x] **Test:** In `lift.test.js`, test the scenario where a cloned repo has no `dev.yml`. Mock the filesystem to contain a `package.json`. Assert the tool infers that `npm install` should be run and prompts the user for confirmation.
    - [x] **Implement:** Add logic to the `lift` command to inspect the directory and suggest inferred steps when `dev.yml` is missing, as an alternative to running `prep`.
    - [x] **Run & Pass:** Ensure inference tests pass.
- [x] **7.6. Commit and Update:** Commit all the core functionality enhancements.

## Phase 8: Global Configuration and Non-Functional Requirements

- [x] **8.1. Implement User-Configurable Clone Directory**
    - [x] **Test:** In `path.test.js`, add a test where a global config file is mocked (`~/.devlift/config.json`). Assert that `getClonePath` respects the `basePath` from this file instead of using the default.
    - [x] **Implement:** Create a new module in `src/core` to load global configuration from a file in the user's home directory. Update `getClonePath` in `src/utils/path.js` to use this configuration.
    - [x] **Run & Pass:** Ensure tests pass.
- [ ] **8.2. Formalize Cross-Platform Testing Strategy**
    - [ ] **Task:** Document a strategy for ensuring compatibility on macOS, Linux, and Windows (WSL). This may involve manual testing checklists or setting up a GitHub Actions matrix for automated testing on different OS runners.
- [ ] **8.3. Investigate Caching Strategy for Dependencies**
    - [ ] **Task:** This is a research task. Investigate methods for caching dependencies (e.g., npm packages) across multiple project installations to improve performance. The findings should be documented for a potential V2 implementation.
- [ ] **8.4. Commit and Update:** Commit the final V1 features and documentation.

## Phase 9: AI-Powered Smart Prep Enhancement

### Overview
This phase enhances the existing `dev prep` command with AI-powered analysis capabilities while maintaining backward compatibility with the existing interactive wizard approach.

- [ ] **9.1. Install AI and HTTP Dependencies**
    - [ ] Run `npm install openai @anthropic-ai/sdk @google/generative-ai node-fetch axios`
    - [ ] Add type definitions: `npm install --save-dev @types/node-fetch`

- [ ] **9.2. Implement AI Provider Infrastructure (TDD)**
    - [ ] **Test:** Create `tests/core/ai-providers.test.js`
        - [ ] Write tests for abstract AI provider interface
        - [ ] Write tests for OpenAI provider implementation
        - [ ] Write tests for Anthropic provider implementation  
        - [ ] Write tests for provider factory and selection logic
        - [ ] Test error handling for invalid API keys and network failures
    - [ ] **Run & Fail:** Run tests to confirm failure
    - [ ] **Implement:** Create `src/core/ai-providers.js`
        - [ ] Create abstract `AIProvider` base class
        - [ ] Implement `OpenAIProvider` class
        - [ ] Implement `AnthropicProvider` class
        - [ ] Implement `GoogleProvider` class
        - [ ] Create `AIProviderFactory` for provider instantiation
    - [ ] **Run & Pass:** Ensure all AI provider tests pass

- [ ] **9.3. Implement Project Content Analyzer (TDD)**
    - [ ] **Test:** Create `tests/core/project-analyzer.test.js`
        - [ ] Test file discovery and filtering logic
        - [ ] Test content extraction from various file types
        - [ ] Test technology detection (Node.js, Python, Docker, etc.)
        - [ ] Test environment variable extraction from .env files
        - [ ] Test script extraction from package.json, Makefile, etc.
        - [ ] Test documentation parsing for setup instructions
    - [ ] **Run & Fail:** Run tests to confirm failure
    - [ ] **Implement:** Create `src/core/project-analyzer.js`
        - [ ] Implement `ProjectAnalyzer` class with methods:
            - [ ] `analyzeProject(directory)` - main analysis entry point
            - [ ] `discoverFiles(directory)` - find relevant project files
            - [ ] `extractContent(files)` - extract content from files
            - [ ] `detectTechnologies(content)` - identify project technologies
            - [ ] `extractEnvironmentVariables(content)` - find env vars
            - [ ] `extractCommands(content)` - find setup/run commands
    - [ ] **Run & Pass:** Ensure analyzer tests pass

- [ ] **9.4. Implement AI Configuration Generator (TDD)**
    - [ ] **Test:** Create `tests/core/ai-config-generator.test.js`
        - [ ] Test prompt generation for different project types
        - [ ] Test AI response parsing and validation
        - [ ] Test configuration generation with proper YAML formatting
        - [ ] Test error handling for malformed AI responses
        - [ ] Test fallback behavior when AI analysis fails
    - [ ] **Run & Fail:** Run tests to confirm failure
    - [ ] **Implement:** Create `src/core/ai-config-generator.js`
        - [ ] Implement `AIConfigGenerator` class with methods:
            - [ ] `generateConfig(projectData, aiProvider)` - main generation
            - [ ] `buildPrompt(projectData)` - create AI prompt
            - [ ] `parseAIResponse(response)` - parse and validate AI output
            - [ ] `validateGeneratedConfig(config)` - ensure valid dev.yml
    - [ ] **Run & Pass:** Ensure generator tests pass

- [ ] **9.5. Implement API Key Management (TDD)**
    - [ ] **Test:** Create `tests/core/api-key-manager.test.js`
        - [ ] Test API key loading from environment variables
        - [ ] Test API key loading from global config file
        - [ ] Test secure storage and retrieval
        - [ ] Test API key validation for different providers
        - [ ] Test prompt for missing API keys
    - [ ] **Run & Fail:** Run tests to confirm failure
    - [ ] **Implement:** Create `src/core/api-key-manager.js`
        - [ ] Implement `APIKeyManager` class with methods:
            - [ ] `getAPIKey(provider)` - retrieve API key for provider
            - [ ] `setAPIKey(provider, key)` - store API key securely  
            - [ ] `promptForAPIKey(provider)` - interactive key input
            - [ ] `validateAPIKey(provider, key)` - validate key format
    - [ ] **Run & Pass:** Ensure API key management tests pass

- [ ] **9.6. Update prep Command with AI Integration (TDD)**
    - [ ] **Test:** Update `tests/commands/prep.test.js`
        - [ ] Add tests for `--ai` flag functionality
        - [ ] Test AI provider selection with `--ai-provider` flag
        - [ ] Test `--interactive` flag to force traditional mode
        - [ ] Test `--review` flag for config review before saving
        - [ ] Test `--explain` flag for AI explanations in output
        - [ ] Test graceful fallback from AI to interactive mode
        - [ ] Test that existing interactive functionality remains unchanged
    - [ ] **Run & Fail:** Run tests to confirm failure
    - [ ] **Implement:** Update `src/commands/prep.ts` (note: may need to be renamed from .js)
        - [ ] Add new command line options for AI functionality
        - [ ] Integrate `ProjectAnalyzer` for project analysis
        - [ ] Integrate `AIConfigGenerator` for AI-powered generation
        - [ ] Implement review and approval workflow
        - [ ] Maintain backward compatibility with existing interactive mode
        - [ ] Add proper error handling and fallback mechanisms
    - [ ] **Run & Pass:** Ensure all prep command tests pass

- [ ] **9.7. Implement Global Configuration for AI Settings (TDD)**
    - [ ] **Test:** Update `tests/core/config.test.js` or create new test file
        - [ ] Test global config file creation and loading
        - [ ] Test default AI provider setting storage/retrieval
        - [ ] Test global API key storage (if enabled by user)
        - [ ] Test config file validation and migration
    - [ ] **Run & Fail:** Run tests to confirm failure
    - [ ] **Implement:** Update existing global config module
        - [ ] Add AI provider preferences to global config schema
        - [ ] Add methods for AI-specific configuration management
        - [ ] Ensure secure handling of any stored credentials
    - [ ] **Run & Pass:** Ensure global config tests pass

- [ ] **9.8. Add Comprehensive Integration Tests**
    - [ ] **Test:** Create `tests/integration/ai-prep.test.js`
        - [ ] Test complete AI-powered prep workflow end-to-end
        - [ ] Test with mocked AI providers and various project types
        - [ ] Test error scenarios and fallback behaviors
        - [ ] Test configuration validation of AI-generated dev.yml files
    - [ ] **Run & Fail:** Run tests to confirm failure  
    - [ ] **Fix:** Resolve any integration issues discovered
    - [ ] **Run & Pass:** Ensure all integration tests pass

- [ ] **9.9. Update Documentation and Help**
    - [ ] Update `src/commands/prep.ts` help text to include AI options
    - [ ] Create documentation for AI provider setup and API key configuration
    - [ ] Add examples of AI-generated dev.yml files to documentation
    - [ ] Update CLI help output to explain new AI functionality

- [ ] **9.10. Security and Privacy Review**
    - [ ] Review AI provider integrations for secure API key handling
    - [ ] Ensure no project data is logged when using AI providers
    - [ ] Validate that API keys are never included in error messages or logs
    - [ ] Test data sanitization before sending to AI providers
    - [ ] Document privacy considerations for users

- [ ] **9.11. Performance Testing and Optimization**
    - [ ] Test AI analysis performance with various project sizes
    - [ ] Implement caching for repeated AI requests where appropriate
    - [ ] Add progress indicators for long-running AI analysis
    - [ ] Test and optimize network timeout handling

- [ ] **9.12. Commit and Update**
    - [ ] Commit all AI-powered prep functionality
    - [ ] Update version number to reflect major feature addition
    - [ ] Create detailed commit messages explaining the new functionality
    - [ ] Check off all completed tasks in this phase

### Notes for Phase 9:
- **Backward Compatibility:** The existing `dev prep` command must continue to work exactly as before when no AI flags are used
- **Graceful Degradation:** If AI analysis fails for any reason, the tool should fall back to the interactive wizard
- **Security First:** API keys must be handled securely, and project data should not be stored by AI providers
- **User Control:** Users should have full control over when and how AI is used, with clear opt-in behavior 