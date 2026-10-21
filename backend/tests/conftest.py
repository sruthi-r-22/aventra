"""Pytest root configuration and environment stabilization."""
# Load ortools C-libraries first to prevent DLL collision with Anaconda's global pyarrow/pandas libraries on Windows
try:
    import ortools.sat.python.cp_model  # noqa: F401
except ImportError:
    pass
