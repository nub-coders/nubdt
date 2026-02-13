"""Custom exceptions for the NubDB Python client."""


class NubDBError(Exception):
    """Base exception for all NubDB errors."""
    pass


class ConnectionError(NubDBError):
    """Raised when connection to NubDB server fails."""
    pass


class TimeoutError(NubDBError):
    """Raised when a command times out."""
    pass


class CommandError(NubDBError):
    """Raised when a command returns an error response."""
    pass
