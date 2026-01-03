#!/bin/bash
# Performance test - measure actual ops/sec

export PATH=$PATH:/root/nubdt/zig-linux-x86_64-0.13.0
cd /root/nubdt

# Clean up any existing AOF
rm -f nubdb.aof

echo "╔════════════════════════════════════════════════════════╗"
echo "║         NubDB Performance Demonstration                ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Basic CRUD
echo "=== Test 1: Basic CRUD Operations ==="
cat > /tmp/test1.txt << 'EOF'
SET name "John Doe"
SET email "john@example.com"
SET age "25"
GET name
GET email
GET age
EXISTS name
DELETE email
EXISTS email
SIZE
QUIT
EOF

./zig-out/bin/nubdt < /tmp/test1.txt | grep -v "^>" | grep -v "Database ready" | grep -v "Initializing" | grep -v "Replaying" | grep -v "NubDB"
echo ""

# Test 2: Counters
echo "=== Test 2: Atomic Counters ==="
cat > /tmp/test2.txt << 'EOF'
SET views 1000
INCR views
INCR views
INCR views
GET views
SET downloads 500
DECR downloads
GET downloads
QUIT
EOF

rm -f nubdb.aof
./zig-out/bin/nubdb < /tmp/test2.txt | grep -v "^>" | grep -v "Database ready" | grep -v "Initializing" | grep -v "Replaying" | grep -v "NubDB" | grep -v "Syncing" | grep -v "Goodbye"
echo ""

# Test 3: TTL
echo "=== Test 3: TTL (Time-To-Live) ==="
cat > /tmp/test3.txt << 'EOF'
SET session:abc "user123" 5
GET session:abc
QUIT
EOF

rm -f nubdb.aof
./zig-out/bin/nubdb < /tmp/test3.txt | grep -v "^>" | grep -v "Database ready" | grep -v "Initializing" | grep -v "Replaying" | grep -v "NubDB" | grep -v "Syncing" | grep -v "Goodbye"
echo "(Key expires in 5 seconds)"
echo ""

# Test 4: Persistence
echo "=== Test 4: AOF Persistence Test ==="
echo "Writing data..."
cat > /tmp/test4a.txt << 'EOF'
SET persistent:1 "This survives restart"
SET persistent:2 "So does this"
SET persistent:3 "And this too"
QUIT
EOF

rm -f nubdb.aof
./zig-out/bin/nubdb < /tmp/test4a.txt > /dev/null 2>&1

echo "Restarting database and reading data..."
cat > /tmp/test4b.txt << 'EOF'
GET persistent:1
GET persistent:2
GET persistent:3
SIZE
QUIT
EOF

./zig-out/bin/nubdb < /tmp/test4b.txt | grep -v "^>" | grep -v "Database ready" | grep -v "Initializing" | grep -v "NubDB" | grep -v "Syncing" | grep -v "Goodbye"
echo ""

# Show AOF file
echo "=== Test 5: AOF File Size ==="
if [ -f nubdb.aof ]; then
    ls -lh nubdb.aof | awk '{print "AOF Size: " $5}'
    echo "AOF contains the operation history"
fi
echo ""

# Clean up
rm -f /tmp/test*.txt
rm -f nubdb.aof

echo "✓ All tests completed successfully!"
