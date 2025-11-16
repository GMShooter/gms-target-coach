# Fixing Python Import Issues in GMShoot Project

## Problem

The GMShoot project was experiencing `ModuleNotFoundError: No module named 'src'` when running tests with pytest. This prevented the test suite from running and blocked development progress.

## Root Cause

The project uses a `src` layout where all source code is in the `src/` directory. Python couldn't find the `src` module because:

1. The project wasn't installed in editable mode
2. The `src` directory was missing an `__init__.py` file
3. The `pyproject.toml` wasn't properly configured for the src layout

## Solution

### 1. Created `src/__init__.py`

Added an `__init__.py` file to make `src` a proper Python package:

```python
"""GMShoot SOTA Analysis - State-of-the-art shooting analysis application."""

__version__ = "1.0.0"
__author__ = "GMShoot Team"
__email__ = "team@gmshoot.com"
```

### 2. Updated `pyproject.toml`

Modified the package configuration to properly handle the src layout:

```toml
[tool.setuptools.packages.find]
where = ["src"]
include = ["*"]
```

This tells setuptools to look for packages in the `src` directory rather than the root.

### 3. Installed Project in Editable Mode

Ran the command:
```bash
pip install -e .
```

This installs the project in "editable" mode, which:
- Creates a link in the virtual environment to the project source
- Makes the `src` module available for import
- Allows changes to source code to be immediately reflected

## Verification

After implementing these changes:

1. Direct import works: `python -c "import src.analysis_engine.metrics; print('Import successful')"`
2. Tests can run: `python -m pytest tests/unit/test_metrics.py -v --tb=short`

## Usage Instructions

For new developers setting up the project:

1. Clone the repository
2. Create and activate virtual environment
3. Run `pip install -e .` to install in editable mode
4. Run tests with `python -m pytest tests/ -v`

## Notes

- The `__editable__.gmshoot-1.0.0.pth` file is created in `venv_py311/Lib/site-packages/`
- This file points to the project's `src` directory
- Using `python -m pytest` is recommended over direct `pytest` command