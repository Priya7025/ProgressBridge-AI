# CI Pipeline Specification — ProgressBridge AI (SIH PS 26122)

**Document Version**: 1.0  
**Owner**: Member 4 (Integration & QA)  
**Verification Date**: 2026-09-25  
**Workflow File**: `.github/workflows/ci.yml`  

---

## 1. CI Workflow Overview

The GitHub Actions CI pipeline enforces automated quality gates on every Pull Request and Push targeting `master`, `dev`, or `main`. It guarantees that no broken TypeScript code, lint violations, unbuildable Next.js routes, or invalid Python scripts enter the shared branches.

```text
Pull Request / Push (to master / dev / main)
   │
   ├── Job 1: Frontend (Node.js 20)
   │     ├── npm ci
   │     ├── npm run lint (ESLint)
   │     ├── npm run typecheck (tsc --noEmit)
   │     └── npm run build (next build)
   │
   └── Job 2: Python Code Quality (Python 3.11)
         ├── pip install ruff
         └── ruff check data/scripts tests
```

---

## 2. Trigger Configuration

```yaml
on:
  push:
    branches:
      - master
      - dev
      - main
  pull_request:
    branches:
      - master
      - dev
      - main

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

* **Target Branches**: `master` (Production), `dev` (Integration), `main`.
* **Concurrency Control**: Automatically cancels redundant in-flight builds when new commits are pushed to the same branch or PR.

---

## 3. Job Specifications & Verification Matrix

| Job Name | Runner Environment | Execution Commands | Verification Status |
| :--- | :--- | :--- | :---: |
| **Frontend Quality & Build** | `ubuntu-latest` (Node 20) | `npm ci`<br>`npm run lint`<br>`npm run typecheck`<br>`npm run build` | **PASS** (0 errors) |
| **Python Code Quality** | `ubuntu-latest` (Python 3.11) | `pip install ruff`<br>`ruff check data/scripts tests` | **PASS** (0 errors) |

---

## 4. Local Execution & Reproduction Guide

To run the exact CI checks locally before opening a pull request:

```powershell
# 1. Frontend Checks
cd frontend
npm run lint
npm run typecheck
npm run build

# 2. Python Script Linter
cd ..
python -m ruff check data/scripts tests
```
