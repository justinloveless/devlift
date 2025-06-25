# Dev-CLI V1 - Detailed Task List & TDD Workflow

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
        - [x] Write a test for `getClonePath` that mocks the `os.homedir()` method to ensure predictable output. Assert that a URL like `https://github.com/org/repo.git` correctly resolves to `mocked_home/dev-cli/clones/github.com/org/repo`.
    - [x] **3.2.2. Run Tests to Confirm Failure:** Run `npm test`.
    - [x] **3.2.3. Implement `path.js`:** Create `src/utils/path.js` and write the `getClonePath` function.
    - [x] **3.2.4. Run Tests to Confirm Pass:** Run `npm test` until path tests pass.
- [x] **3.3. Commit and Update**
    - [ ] Commit the utility functions to Git.
    - [ ] Check off all completed tasks in this phase.

## Phase 4: `dev install` Command (Core Logic)

- [x] **4.1. Write Integration Tests for `install` command**
    - [x] In a new file `tests/commands/install.test.js`, use `jest.mock` to mock `simple-git`, `inquirer`, and your `ExecutionEngine` (which doesn't exist yet but will be mocked).
    - [x] Write a test that simulates a user running `dev install <valid_url>` where a `dev.yml` is expected to be found. Assert that `simple-git`'s `clone` method is called with the correct arguments and that the `ExecutionEngine` is instantiated and its `run` method is called.
    - [x] Write a test for the case where `loadConfig` returns `null` (no `dev.yml`). Assert that `inquirer` is called to prompt the user to initialize a new config.
- [x] **4.2. Run Tests to Confirm Failure:** Run `npm test`.
- [x] **4.3. Implement `install` Command Logic**
    - [x] In `src/commands/install.js`, define the `install` command with its argument `<repo_url>` and option `--yes`.
    - [x] Implement the logic that uses your utilities to validate the URL and get the clone path.
    - [x] Use `simple-git` to perform the clone.
    - [x] Call your `config-parser`.
    - [x] Based on the result, either call the (mocked) `ExecutionEngine` or (mocked) `inquirer`.
- [x] **4.4. Run Tests to Confirm Pass:** Run `npm test` until the `install` command integration tests pass.
- [x] **4.5. Commit and Update:** Commit the `install` command structure and check off tasks.

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

## Phase 6: `dev init` Command (Interactive Wizard)

- [x] **6.1. Write Tests for `init` Command**
    - [x] Create `tests/commands/init.test.js`.
    - [x] Mock `fs-extra` and `inquirer`.
    - [x] Write a test that simulates a directory state (e.g., `package.json` exists).
    - [x] Mock the return values of `inquirer.prompt` to simulate a full set of user answers.
    - [x] Assert that the final call to `fs-extra.writeFileSync` (or similar) contains a correctly formatted YAML string based on the mocked inputs.
- [x] **6.2. Run Tests to Confirm Failure:** Run `npm test`.
- [x] **6.3. Implement `init` Command Logic**
    - [x] In `src/commands/init.js`, implement the interactive wizard using `inquirer`, your directory inspection logic, and `js-yaml` to generate the final file.
- [x] **6.4. Run Tests to Confirm Pass:** Run `npm test` until `init` command tests pass.
- [x] **6.5. Commit and Update:** Commit the `init` feature and check off all tasks. You have reached V1! 