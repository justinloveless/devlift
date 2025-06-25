# Dev-CLI V1 - Detailed Task List & TDD Workflow

This document outlines the specific tasks required to build Version 1 of the `dev` CLI tool. It is structured to follow a **Test-Driven Development (TDD)** workflow.

## The TDD Workflow
For each feature, follow this cycle:
1.  **Write a new test** describing the desired functionality.
2.  **Run the test suite** to confirm that the new test fails as expected.
3.  **Write the minimum amount of code** required to make the new test pass.
4.  **Run the test suite again** to confirm all tests now pass.
5.  **Refactor** the code if necessary, ensuring tests continue to pass.
6.  **Commit** the work to Git once a feature is complete and fully tested.
7.  **Update this document** by checking off the completed tasks.

---

## Phase 0: TDD and Testing Setup

- [ ] **0.1. Install Testing Dependencies**
    - [ ] Run `npm install --save-dev jest`.
- [ ] **0.2. Configure Testing Environment**
    - [ ] In `package.json`, add the `test` script: `"test": "jest"`.
    - [ ] Create a `jest.config.js` file in the project root.
    - [ ] Create a top-level `tests` directory. The structure inside `tests` should mirror the `src` directory (e.g., tests for `src/core/parser.js` will be in `tests/core/parser.test.js`).

## Phase 1: Project Setup & Core Infrastructure

- [ ] **1.1. Restructure Project Directory**
    - [ ] Create a `src` directory.
    - [ ] Inside `src`, create subdirectories: `commands`, `core`, `utils`.
    - [ ] Move `index.js` into `src/index.js`.
    - [ ] Update `package.json`'s `main` and `bin` properties to point to `src/index.js`.
- [ ] **1.2. Install Core Dependencies**
    - [ ] Run `npm install commander chalk inquirer js-yaml simple-git execa fs-extra`.
- [ ] **1.3. Implement Base CLI Framework**
    - [ ] **1.3.1. Write Initial CLI Test:** In a new file `tests/index.test.js`, write a simple test that programmatically executes the CLI with a `--version` flag and asserts that the output matches the version in `package.json`.
    - [ ] **1.3.2. Run Test to Confirm Failure:** Run `npm test`. The test should fail because no implementation exists.
    - [ ] **1.3.3. Implement Base Framework:** In `src/index.js`, configure `commander` with the program's name, description, and version. Create stub files `src/commands/install.js` and `src/commands/init.js` and register them with the main program in `src/index.js`.
    - [ ] **1.3.4. Run Tests to Confirm Pass:** Run `npm test` until the version test passes.
- [ ] **1.4. Commit and Update**
    - [ ] Commit the initial project structure and dependencies to Git.
    - [ ] Check off all completed tasks in this phase.

## Phase 2: Configuration (`dev.yml`) Handling

- [ ] **2.1. Create `dev.yml` Parser**
    - [ ] **2.1.1. Write Tests for `config-parser.js`:**
        - [ ] Create `tests/core/config-parser.test.js`.
        - [ ] Write a test case for `loadConfig` that simulates a non-existent `dev.yml` and asserts that the function returns `null`.
        - [ ] Write a test case that provides a valid `dev.yml` and asserts that the function returns the correct parsed JavaScript object.
        - [ ] Write a test case with a malformed YAML file and assert that it throws a specific, identifiable error.
        - [ ] Write a test case with valid YAML but missing required keys (e.g., `project_name`) and assert that it throws a validation error.
    - [ ] **2.1.2. Run Tests to Confirm Failure:** Run `npm test`. All new tests should fail.
    - [ ] **2.1.3. Implement `config-parser.js`:**
        - [ ] Create the file `src/core/config-parser.js`.
        - [ ] Implement the `loadConfig` function to satisfy the tests. Use `fs-extra` to read the file and `js-yaml` to parse it. Include validation logic.
    - [ ] **2.1.4. Run Tests to Confirm Pass:** Run `npm test` repeatedly, iterating on your code until all config parser tests pass.
- [ ] **2.2. Commit and Update**
    - [ ] Commit the config parser feature to Git.
    - [ ] Check off all completed tasks in this phase.

## Phase 3: Utilities (`validation.js`, `path.js`)

- [ ] **3.1. Implement Git URL Validator**
    - [ ] **3.1.1. Write Tests for `validation.js`:**
        - [ ] Create `tests/utils/validation.test.js`.
        - [ ] Write multiple test cases for `isValidGitUrl` with valid (`https`, `http`, `git@`) and invalid URLs.
    - [ ] **3.1.2. Run Tests to Confirm Failure:** Run `npm test`.
    - [ ] **3.1.3. Implement `validation.js`:** Create `src/utils/validation.js` and write the `isValidGitUrl` function using a regular expression.
    - [ ] **3.1.4. Run Tests to Confirm Pass:** Run `npm test` until validation tests pass.
- [ ] **3.2. Implement Clone Path Generator**
    - [ ] **3.2.1. Write Tests for `path.js`:**
        - [ ] Create `tests/utils/path.test.js`.
        - [ ] Write a test for `getClonePath` that mocks the `os.homedir()` method to ensure predictable output. Assert that a URL like `https://github.com/org/repo.git` correctly resolves to `mocked_home/dev-cli/clones/github.com/org/repo`.
    - [ ] **3.2.2. Run Tests to Confirm Failure:** Run `npm test`.
    - [ ] **3.2.3. Implement `path.js`:** Create `src/utils/path.js` and write the `getClonePath` function.
    - [ ] **3.2.4. Run Tests to Confirm Pass:** Run `npm test` until path tests pass.
- [ ] **3.3. Commit and Update**
    - [ ] Commit the utility functions to Git.
    - [ ] Check off all completed tasks in this phase.

## Phase 4: `dev install` Command (Core Logic)

- [ ] **4.1. Write Integration Tests for `install` command**
    - [ ] In a new file `tests/commands/install.test.js`, use `jest.mock` to mock `simple-git`, `inquirer`, and your `ExecutionEngine` (which doesn't exist yet but will be mocked).
    - [ ] Write a test that simulates a user running `dev install <valid_url>` where a `dev.yml` is expected to be found. Assert that `simple-git`'s `clone` method is called with the correct arguments and that the `ExecutionEngine` is instantiated and its `run` method is called.
    - [ ] Write a test for the case where `loadConfig` returns `null` (no `dev.yml`). Assert that `inquirer` is called to prompt the user to initialize a new config.
- [ ] **4.2. Run Tests to Confirm Failure:** Run `npm test`.
- [ ] **4.3. Implement `install` Command Logic**
    - [ ] In `src/commands/install.js`, define the `install` command with its argument `<repo_url>` and option `--yes`.
    - [ ] Implement the logic that uses your utilities to validate the URL and get the clone path.
    - [ ] Use `simple-git` to perform the clone.
    - [ ] Call your `config-parser`.
    - [ ] Based on the result, either call the (mocked) `ExecutionEngine` or (mocked) `inquirer`.
- [ ] **4.4. Run Tests to Confirm Pass:** Run `npm test` until the `install` command integration tests pass.
- [ ] **4.5. Commit and Update:** Commit the `install` command structure and check off tasks.

## Phase 5: The Execution Engine

- [ ] **5.1. Write Tests for `ExecutionEngine`**
    - [ ] Create `tests/core/execution-engine.test.js`.
    - [ ] Mock `fs-extra`, `inquirer`, and `execa` using `jest.mock`.
    - [ ] Write tests for the `run` method, which will orchestrate private helpers.
    - [ ] Write a unit test for handling the environment setup. Provide a mock config and assert `fs-extra.copy` and `inquirer` are called correctly.
    - [ ] Write unit tests for the step runner. For `package-manager` steps, assert `execa` is called with the right command. For `shell` steps, assert `inquirer` (for confirmation) and `execa` are called correctly.
    - [ ] Write unit tests for post-setup actions, asserting `console.log` is called for messages and `execa` for opening an editor.
- [ ] **5.2. Run Tests to Confirm Failure:** Run `npm test`.
- [ ] **5.3. Implement `ExecutionEngine` Class**
    - [ ] Create `src/core/execution-engine.js`.
    - [ ] Implement the class and its methods to make the tests pass.
- [ ] **5.4. Run Tests to Confirm Pass:** Run `npm test` until all engine tests pass.
- [ ] **5.5. Commit and Update:** Commit the engine and check off tasks.

## Phase 6: `dev init` Command (Interactive Wizard)

- [ ] **6.1. Write Tests for `init` Command**
    - [ ] Create `tests/commands/init.test.js`.
    - [ ] Mock `fs-extra` and `inquirer`.
    - [ ] Write a test that simulates a directory state (e.g., `package.json` exists).
    - [ ] Mock the return values of `inquirer.prompt` to simulate a full set of user answers.
    - [ ] Assert that the final call to `fs-extra.writeFileSync` (or similar) contains a correctly formatted YAML string based on the mocked inputs.
- [ ] **6.2. Run Tests to Confirm Failure:** Run `npm test`.
- [ ] **6.3. Implement `init` Command Logic**
    - [ ] In `src/commands/init.js`, implement the interactive wizard using `inquirer`, your directory inspection logic, and `js-yaml` to generate the final file.
- [ ] **6.4. Run Tests to Confirm Pass:** Run `npm test` until `init` command tests pass.
- [ ] **6.5. Commit and Update:** Commit the `init` feature and check off all tasks. You have reached V1! 