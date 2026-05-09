#!/bin/bash

echo "Testing NubDB Interactive Mode"
echo ""

# Create a test script
cat > /tmp/nubdb_test.txt << 'EOF'
SET user:1:name "Alice"
SET user:1:age "30"
SET user:2:name "Bob"
GET user:1:name
GET user:1:age
EXISTS user:1:name
EXISTS user:3:name
SET counter 100
INCR counter
INCR counter
INCR counter
GET counter
SIZE
DELETE user:2:name
SIZE
QUIT
EOF

# Run the database with test commands
./zig-out/bin/nubdt < /tmp/nubdb_test.txt

echo ""
echo "Test completed!"
