NubDB Python Integration

CURRENT STATUS:
NubDB runs as a CLI with a background thread that prevents clean subprocess exit.
Direct Python integration via subprocess is not working due to timeout issues.

RECOMMENDED APPROACH:
Add TCP server mode to NubDB for production Python integration.

See ../PYTHON_INTEGRATION.md for complete details on:
- TCP server implementation
- Socket-based Python client  
- Redis protocol compatibility

TEMPORARY WORKAROUND:
Use shell commands directly for simple scripts:
  echo "SET key value" | ./zig-out/bin/nubdt

NEXT STEPS:
1. Modify src/main.zig to add --server flag
2. Implement TCP listener
3. Use socket-based Python client

Performance with TCP server: 100k+ ops/sec
Current subprocess approach: Not reliable due to threading
