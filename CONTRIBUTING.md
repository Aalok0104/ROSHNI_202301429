# Contributing to ROSHNI

This project is a part of our course, IT314, Software Engineering. We will not be taking in contributions from outside of our groups, until the course runs. We will update contributing guidelines once the course is evaluated. 

This document provides a detailed guide for making a contribution, from getting assigned an issue to getting your code merged into the main project.

## The Contribution Workflow

Our project uses a standard **Fork-and-Pull** workflow. Here's a high-level overview of the steps that the members should take:

1.  Get assigned an issue from the project's [Issues tab](https://github.com/202301039/ROSHNI/issues).
2.  Fork the main project repository to your personal GitHub account.
3.  Create a new "feature branch" on your local machine.
4.  Write your code and add or update tests.
5.  Push your feature branch to your fork on GitHub.
6.  Open a Pull Request (PR) from your feature branch to the main project's `main` branch.
7.  Participate in a code review and wait for your PR to be merged!

---

## Step-by-Step Contribution Guide

### Step 1: Get Assigned an Issue

-   We will have a daily SCRUM standups, as well as weekly SCRUM meetings (mid-SCRUM and end-SCRUM), where people can discuss issues. Issues will be assigned between sprints after user stories and EPICs are finalized for the next sprint.

### Step 2: Fork, Clone, and Configure `upstream`

1.  **Fork the Repository:** Go to the main project repository and click the "Fork" button in the top-right corner. This creates a personal copy.
2.  **Clone Your Fork:** In your terminal, clone your personal fork.
    ```bash
    git clone [https://github.com/YOUR_USERNAME/ROSHNI.git](https://github.com/YOUR_USERNAME/ROSHNI.git)
    cd ROSHNI
    ```
3.  **Add the `upstream` Remote:** Add a remote that points to the original project repository. This allows you to sync changes from the main project.
    ```bash
    git remote add upstream [https://github.com/202301039/ROSHNI.git](https://github.com/202301039/ROSHNI.git)
    ```
    You can check that it worked by running `git remote -v`.

### Step 3: Sync Your Fork and Create a Branch

Before you start coding, always sync your fork's `main` branch with the `upstream` repository.

1.  **Sync:**
    ```bash
    # Switch to your local main branch
    git checkout main

    # Pull the latest changes from the upstream main branch
    git pull upstream main
    ```
2.  **Create a New Branch:** Create a new branch for your task. **Never work directly on the `main` branch.** Name your branch descriptively.
    ```bash
    # Example for working on issue #42
    git checkout -b feature/42-refactor-login-component
    ```

### Step 4: Do the Work (Code and Test!)

-   Write the code to address the issue.
-   **Crucially, you must also add, update, or run tests related to your changes.** See the detailed section below on **"Understanding Testing and CI"** for instructions on how to do this.

### Step 5: Commit Your Changes

Commit your work with a clear, descriptive message.
```bash
git add .
git commit -m "feat: Refactor login component to use hooks"
```


### Step 6: Push to Your Fork
Push your feature branch to your fork on GitHub (`origin`).

```bash
git push -u origin feature/42-refactor-login-component
```

### Step 7: Open a Pull Request (PR)
Go to your fork on GitHub. You should see a prompt to open a Pull Request.

Ensure the base repository is the main project (`202301039/ROSHNI`) and the `base` branch is `main`. The `head` repository should be your fork and the `compare` branch should be your feature branch.

Write a clear title (e.g., feat: Refactor Login Component).

In the description, link the issue you're solving. Write Closes #42 in the description. This will automatically close the issue when the PR is merged.

Click "Create Pull Request".

---

## Understanding Testing and CI (Continuous Integration)
When you open a Pull Request, you'll see automated checks start running. This is our Continuous Integration (CI) system, powered by **GitHub Actions**.

**What is CI?**

CI is a system that will automatically run tests on your code. This is incredibly important because it:

* Catches bugs automatically before they get into the main codebase.

* Guarantees that the main branch is always stable and working.

* Saves everyone time on manual testing.

We will add detailed CI config information later.

**How to Work with Existing Tests**

Your contribution is not complete unless it includes testing.

1. **Running Existing Tests Locally**: Before you even push your code, you should run all the tests on your own machine to get instant feedback. If all tests pass, you are in a good position. If any fail, the command will tell you which ones failed so you can fix them.

2. **Modifying Existing Tests**: If your code changes existing functionality (e.g., you change the text of a button), you might need to update the test that checks for that button. The test is now "out of date", and you need to update it to match the new behavior.

3. **Adding New Tests**: Every new feature requires new tests. If you create a new component or a new API endpoint, you must also create a corresponding test file to verify its functionality. Below are the examples.

    * Frontend: If you create src/components/UserInfo.js, you must also create src/components/UserInfo.test.js.

    * Backend: If you add a function in api/routes.py, you must add a test for it in tests/test_routes.py.

**What Happens If a CI Check Fails?**

On your Pull Request page, you will see a red '❌' next to a check if it fails.

1. Click "Details" next to the failed check.

2. This will take you to a log of everything the CI system did. Scroll through the log to find the error message. It will usually show you exactly which test failed and why.

3. Go back to your code on your local machine and fix the issue.

4. Commit and push the fix to your feature branch. The Pull Request will automatically update and the CI checks will run again.

Repeat this cycle until all checks pass with a green '✅'. At that point, your PR is ready for a final human review!
