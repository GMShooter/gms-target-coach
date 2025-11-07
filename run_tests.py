#!/usr/bin/env python3
"""Test runner script to handle import issues."""

import sys
import os
from pathlib import Path

# Add src directory to Python path
project_root = Path(__file__).parent
src_path = project_root / "src"
sys.path.insert(0, str(src_path))

# Now run pytest
import pytest
sys.exit(pytest.main(["tests", "-v"]))