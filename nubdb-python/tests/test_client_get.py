import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Ensure the src directory is in the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from nubdb import NubDB

class TestNubDBGet(unittest.TestCase):
    def setUp(self):
        # Mock the connection to avoid actual socket operations
        with patch('nubdb.client.socket.socket'):
            with patch.object(NubDB, 'connect'):
                self.db = NubDB()
                self.db._connected = True
                self.db._send_command = MagicMock()

    def test_get_unquoted(self):
        """Test getting a simple unquoted value."""
        self.db._send_command.return_value = "Alice"
        self.assertEqual(self.db.get("name"), "Alice")
        self.db._send_command.assert_called_with("GET name")

    def test_get_quoted(self):
        """Test getting a value surrounded by double quotes."""
        self.db._send_command.return_value = '"Alice"'
        self.assertEqual(self.db.get("name"), "Alice")

    def test_get_nil(self):
        """Test getting a non-existent key (nil)."""
        self.db._send_command.return_value = "(nil)"
        self.assertIsNone(self.db.get("name"))

    def test_get_not_found(self):
        """Test getting a non-existent key (not found)."""
        self.db._send_command.return_value = "Key not found"
        self.assertIsNone(self.db.get("name"))

    def test_get_internal_quotes(self):
        """Test getting a value with internal quotes but no surrounding quotes."""
        self.db._send_command.return_value = 'He said "Hello"'
        self.assertEqual(self.db.get("quote"), 'He said "Hello"')

    def test_get_surrounded_internal_quotes(self):
        """Test getting a value with internal quotes and surrounding quotes."""
        self.db._send_command.return_value = '"He said ""Hello"""'
        self.assertEqual(self.db.get("quote"), 'He said ""Hello""')

    def test_get_empty_quoted(self):
        """Test getting an empty quoted string."""
        self.db._send_command.return_value = '""'
        self.assertEqual(self.db.get("empty"), "")

    def test_get_none_response(self):
        """Test handling of None or empty response."""
        self.db._send_command.return_value = ""
        self.assertIsNone(self.db.get("name"))

if __name__ == "__main__":
    unittest.main()
