"""
NubDB Python Client — TCP socket-based client.

Connects to a running NubDB server over TCP. Supports all NubDB commands
with automatic reconnection, context manager usage, SSL/TLS encryption,
and clean error handling.
"""

import os
import ssl as _ssl
import socket
import time
from typing import Optional, Union

from urllib.parse import urlparse
from .exceptions import ConnectionError, TimeoutError, CommandError


class NubDB:
    """
    Python client for the NubDB high-performance database.

    Connects over TCP to a running NubDB server instance.

    Args:
        host: Server hostname or connection string (nubdb:// or nubdbs://).
              Defaults to NUBDB_HOST env var, then 'localhost'.
        port: Server port. Defaults to NUBDB_PORT env var, then 6379.
        ssl: Enable SSL/TLS encryption. Default False.
             Automatically enabled when using nubdbs:// scheme.
        ssl_verify: Verify SSL certificate. Default True.
        ssl_ca_certs: Path to custom CA certificate file.
        timeout: Socket timeout in seconds. Default 5.0.
        auto_reconnect: Whether to automatically reconnect on
                        connection loss. Default True.
        max_retries: Max reconnection attempts. Default 3.

    Examples:
        >>> db = NubDB()
        >>> db.set("name", "Alice")
        True
        >>> db.get("name")
        'Alice'
        >>> db.close()

        >>> with NubDB("nubdb://db.nubcoder.com:6379") as db:
        ...     db.set("counter", "100")
        ...     db.incr("counter")
        101

        >>> db = NubDB("nubdbs://db.nubcoder.com:6380")  # TLS
    """

    DEFAULT_HOST = "localhost"
    DEFAULT_PORT = 6379
    DEFAULT_TLS_PORT = 6380
    BUFFER_SIZE = 4096

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        ssl: bool = False,
        ssl_verify: bool = True,
        ssl_ca_certs: Optional[str] = None,
        timeout: float = 5.0,
        auto_reconnect: bool = True,
        max_retries: int = 3,
    ):
        self._ssl_enabled = ssl
        self._ssl_verify = ssl_verify
        self._ssl_ca_certs = ssl_ca_certs

        # Handle connection string if provided in host
        if host and "://" in host:
            parsed = urlparse(host)
            scheme = parsed.scheme.lower()

            if scheme == "nubdbs":
                self._ssl_enabled = True
                self.host = parsed.hostname or self.DEFAULT_HOST
                self.port = parsed.port or self.DEFAULT_TLS_PORT
            elif scheme == "nubdb":
                self.host = parsed.hostname or self.DEFAULT_HOST
                self.port = parsed.port or self.DEFAULT_PORT
            else:
                raise ValueError(
                    f"Invalid scheme '{scheme}', expected 'nubdb' or 'nubdbs'"
                )

            # Allow port override if explicitly provided
            if port is not None:
                self.port = port
        else:
            self.host = host or os.getenv("NUBDB_HOST", self.DEFAULT_HOST)
            self.port = port or int(os.getenv("NUBDB_PORT", str(self.DEFAULT_PORT)))

            # Check env var for SSL
            if os.getenv("NUBDB_SSL", "").lower() in ("1", "true", "yes"):
                self._ssl_enabled = True

        self.timeout = timeout
        self.auto_reconnect = auto_reconnect
        self.max_retries = max_retries

        self._sock: Optional[socket.socket] = None
        self._connected = False

        self.connect()

    # ── Connection Management ─────────────────────────────────────

    def connect(self) -> None:
        """Establish connection to the NubDB server."""
        if self._connected:
            return

        try:
            raw_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            raw_sock.settimeout(self.timeout)
            raw_sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

            if self._ssl_enabled:
                ctx = _ssl.create_default_context()
                if not self._ssl_verify:
                    ctx.check_hostname = False
                    ctx.verify_mode = _ssl.CERT_NONE
                if self._ssl_ca_certs:
                    ctx.load_verify_locations(self._ssl_ca_certs)
                self._sock = ctx.wrap_socket(
                    raw_sock, server_hostname=self.host
                )
            else:
                self._sock = raw_sock

            self._sock.connect((self.host, self.port))

            # Wrap socket file object for buffered line reading
            self._file = self._sock.makefile("r", encoding="utf-8")
            self._connected = True
        except _ssl.SSLError as e:
            self._cleanup_socket()
            raise ConnectionError(
                f"SSL/TLS handshake failed with {self.host}:{self.port}: {e}"
            ) from e
        except socket.gaierror as e:
            self._cleanup_socket()
            raise ConnectionError(
                f"Could not resolve host '{self.host}': {e}"
            ) from e
        except socket.timeout as e:
            self._cleanup_socket()
            raise TimeoutError(
                f"Connection to {self.host}:{self.port} timed out"
            ) from e
        except OSError as e:
            self._cleanup_socket()
            raise ConnectionError(
                f"Could not connect to {self.host}:{self.port}: {e}"
            ) from e

    def close(self) -> None:
        """Close the connection to the NubDB server."""
        self._cleanup_socket()

    def ping(self) -> bool:
        """
        Check if the server is reachable by sending a SIZE command.

        Returns:
            True if server responds, False otherwise.
        """
        try:
            self._send_command("SIZE")
            return True
        except Exception:
            return False

    @property
    def connected(self) -> bool:
        """Whether the client is currently connected."""
        return self._connected

    @property
    def ssl_enabled(self) -> bool:
        """Whether SSL/TLS is enabled for this connection."""
        return self._ssl_enabled

    @property
    def connection_string(self) -> str:
        """Return the connection string for this client."""
        scheme = "nubdbs" if self._ssl_enabled else "nubdb"
        return f"{scheme}://{self.host}:{self.port}"

    def _cleanup_socket(self) -> None:
        """Safely close and clean up the socket."""
        self._connected = False

        # Close file handle first
        if hasattr(self, "_file") and self._file:
            try:
                self._file.close()
            except OSError:
                pass
            self._file = None

        # Close socket
        if self._sock is not None:
            try:
                self._sock.close()
            except OSError:
                pass
            self._sock = None

    def _reconnect(self) -> None:
        """Attempt to reconnect to the server."""
        self._cleanup_socket()
        for attempt in range(1, self.max_retries + 1):
            try:
                self.connect()
                return
            except Exception:
                if attempt < self.max_retries:
                    time.sleep(0.1 * attempt)  # backoff
                else:
                    raise

    # ── Command Execution ─────────────────────────────────────────

    def _send_command(self, command: str) -> str:
        """
        Send a raw command string to the server and return the response.

        Handles auto-reconnect on connection loss.
        """
        if not self._connected or self._sock is None:
            if self.auto_reconnect:
                self._reconnect()
            else:
                raise ConnectionError("Not connected to NubDB server")

        data = (command + "\n").encode("utf-8")

        try:
            self._sock.sendall(data)

            # Read line-buffered response
            response = self._file.readline()
            if not response:
                # EOF implies connection closed
                raise BrokenPipeError("Server closed connection")

            return response.strip()

        except socket.timeout as e:
            raise TimeoutError(f"Command timed out: {command}") from e
        except (BrokenPipeError, OSError) as e:
            self._connected = False
            if self.auto_reconnect:
                self._reconnect()
                # Retry once after reconnect
                try:
                    self._sock.sendall(data)
                    response = self._file.readline()
                    if not response:
                        raise ConnectionError(
                            "Server closed connection immediately after reconnect"
                        )
                    return response.strip()
                except OSError as retry_err:
                    raise ConnectionError(
                        f"Command failed after reconnect: {retry_err}"
                    ) from retry_err
            raise ConnectionError(f"Connection lost: {e}") from e

    # ── Database Commands ─────────────────────────────────────────

    def set(
        self,
        key: str,
        value: Union[str, int, float],
        ttl: Optional[int] = None,
    ) -> bool:
        """
        Set a key-value pair.

        Args:
            key: The key name.
            value: The value to store (string, int, or float).
            ttl: Optional time-to-live in seconds.

        Returns:
            True if the operation succeeded.
        """
        val = str(value)
        # Quote strings that contain spaces
        if " " in val:
            val = f'"{val}"'

        cmd = f"SET {key} {val}"
        if ttl is not None and ttl > 0:
            cmd += f" {ttl}"
        response = self._send_command(cmd)
        return "OK" in response

    def get(self, key: str) -> Optional[str]:
        """
        Get the value of a key.

        Args:
            key: The key to retrieve.

        Returns:
            The value as a string, or None if the key doesn't exist.
        """
        response = self._send_command(f"GET {key}")
        if not response or "(nil)" in response or "not found" in response.lower():
            return None

        # Strip quotes if present (NubDB returns "value")
        if response.startswith('"') and response.endswith('"'):
            return response[1:-1]

        return response

    def delete(self, key: str) -> bool:
        """
        Delete a key.

        Args:
            key: The key to delete.

        Returns:
            True if the key was deleted.
        """
        response = self._send_command(f"DELETE {key}")
        return "OK" in response

    def exists(self, key: str) -> bool:
        """
        Check if a key exists.

        Args:
            key: The key to check.

        Returns:
            True if the key exists.
        """
        response = self._send_command(f"EXISTS {key}")
        return response.strip() == "1"

    def incr(self, key: str) -> int:
        """
        Increment the integer value of a key by 1.

        Args:
            key: The key to increment.

        Returns:
            The new value after incrementing.

        Raises:
            CommandError: If the value is not an integer.
        """
        response = self._send_command(f"INCR {key}")
        try:
            return int(response)
        except ValueError:
            raise CommandError(f"INCR failed: {response}")

    def decr(self, key: str) -> int:
        """
        Decrement the integer value of a key by 1.

        Args:
            key: The key to decrement.

        Returns:
            The new value after decrementing.

        Raises:
            CommandError: If the value is not an integer.
        """
        response = self._send_command(f"DECR {key}")
        try:
            return int(response)
        except ValueError:
            raise CommandError(f"DECR failed: {response}")

    def size(self) -> int:
        """
        Get the number of keys in the database.

        Returns:
            The number of keys stored.
        """
        response = self._send_command("SIZE")
        try:
            # Response may be "42 keys" or just "42"
            return int(response.split()[0])
        except (ValueError, IndexError):
            return 0

    def clear(self) -> bool:
        """
        Delete all keys from the database.

        Returns:
            True if the operation succeeded.
        """
        response = self._send_command("CLEAR")
        return "OK" in response

    # ── Bulk Operations ───────────────────────────────────────────

    def mset(self, mapping: dict) -> bool:
        """
        Set multiple key-value pairs.

        Args:
            mapping: Dictionary of key-value pairs to set.

        Returns:
            True if all operations succeeded.
        """
        success = True
        for key, value in mapping.items():
            if not self.set(key, value):
                success = False
        return success

    def mget(self, *keys: str) -> dict:
        """
        Get multiple keys at once.

        Args:
            keys: Variable number of key names.

        Returns:
            Dictionary mapping keys to their values (None if missing).
        """
        return {key: self.get(key) for key in keys}

    # ── Context Manager ───────────────────────────────────────────

    def __enter__(self) -> "NubDB":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()

    def __del__(self) -> None:
        self.close()

    def __repr__(self) -> str:
        status = "connected" if self._connected else "disconnected"
        tls = " ssl" if self._ssl_enabled else ""
        return f"NubDB(host='{self.host}', port={self.port}, {status}{tls})"
