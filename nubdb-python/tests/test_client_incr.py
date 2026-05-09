import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Ensure the src directory is in the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from nubdb import NubDB, CommandError

class TestNubDBIncrDecr(unittest.TestCase):
    def setUp(self):
        # Mock the connection to avoid actual socket operations
        with patch('nubdb.client.socket.socket'):
            with patch.object(NubDB, 'connect'):
                self.db = NubDB()
                self.db._connected = True
                self.db._send_command = MagicMock()

    def test_incr_success(self):
        """Test successful increment."""
        self.db._send_command.return_value = "101"
        result = self.db.incr("counter")
        self.assertEqual(result, 101)
        self.db._send_command.assert_called_with("INCR counter")

    def test_incr_error(self):
        """Test increment on a non-integer value."""
        self.db._send_command.return_value = "ERROR: value is not an integer or out of range"
        with self.assertRaises(CommandError) as cm:
            self.db.incr("counter")
        self.assertIn("INCR failed", str(cm.exception))

    def test_decr_success(self):
        """Test successful decrement."""
        self.db._send_command.return_value = "99"
        result = self.db.decr("counter")
        self.assertEqual(result, 99)
        self.db._send_command.assert_called_with("DECR counter")

    def test_decr_error(self):
        """Test decrement on a non-integer value."""
        self.db._send_command.return_value = "ERROR: value is not an integer or out of range"
        with self.assertRaises(CommandError) as cm:
            self.db.decr("counter")
        self.assertIn("DECR failed", str(cm.exception))

if __name__ == "__main__":
    unittest.main()
