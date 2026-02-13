"""
NubDB - Python client for NubDB high-performance database.

Usage:
    from nubdb import NubDB

    db = NubDB()
    db.set("key", "value")
    print(db.get("key"))
    db.close()

    # Or use as context manager:
    with NubDB() as db:
        db.set("key", "value")
        print(db.get("key"))
"""

from .client import NubDB
from .exceptions import (
    NubDBError,
    ConnectionError,
    TimeoutError,
    CommandError,
)

__version__ = "1.0.1"
__author__ = "NubCoders"
__all__ = [
    "NubDB",
    "NubDBError",
    "ConnectionError",
    "TimeoutError",
    "CommandError",
    "__version__",
]
