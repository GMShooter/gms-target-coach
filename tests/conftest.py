"""Pytest configuration and fixtures."""

import sys
from pathlib import Path
from unittest.mock import MagicMock

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


class MockSessionState:
    """Mock Streamlit session state that supports both dict and attribute access."""
    
    def __init__(self, initial_data=None):
        """Initialize with optional initial data."""
        self._data = initial_data or {}
    
    def __getitem__(self, key):
        """Dictionary-style access."""
        return self._data[key]
    
    def __setitem__(self, key, value):
        """Dictionary-style assignment."""
        self._data[key] = value
    
    def __contains__(self, key):
        """Dictionary-style 'in' operator."""
        return key in self._data
    
    def get(self, key, default=None):
        """Dictionary-style get method."""
        return self._data.get(key, default)
    
    def keys(self):
        """Dictionary-style keys method."""
        return self._data.keys()
    
    def values(self):
        """Dictionary-style values method."""
        return self._data.values()
    
    def items(self):
        """Dictionary-style items method."""
        return self._data.items()
    
    def __getattr__(self, name):
        """Attribute-style access."""
        if name in self._data:
            return self._data[name]
        raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")
    
    def __setattr__(self, name, value):
        """Attribute-style assignment."""
        if name.startswith('_'):
            super().__setattr__(name, value)
        else:
            self._data[name] = value
    
    def __delattr__(self, name):
        """Attribute-style deletion."""
        if name in self._data:
            del self._data[name]
        else:
            raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")
    
    def __delitem__(self, key):
        """Dictionary-style deletion."""
        del self._data[key]
    
    def __repr__(self):
        """String representation."""
        return f"MockSessionState({self._data})"