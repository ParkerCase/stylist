"""
Configuration for pytest tests.
Ensures proper module imports for the stylist package.
"""

import os
import sys

# Add the root directory to the sys.path
# This allows imports of the form 'from stylist.X import Y'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))