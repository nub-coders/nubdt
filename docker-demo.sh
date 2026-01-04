#!/bin/bash
set -e

echo "==================================="
echo "NubDB Docker Demo"
echo "==================================="
echo ""

echo "1. Building Docker image..."
docker build -q -t nubdb:latest .
echo "   ✓ Image built successfully"
echo ""

echo "2. Starting container..."
docker run -d --name nubdb-demo -p 6379:6379 nubdb:latest > /dev/null
sleep 2
echo "   ✓ Container started"
echo ""

echo "3. Testing commands..."
echo "   SET greeting 'Hello from Docker!'"
echo "SET greeting 'Hello from Docker!'" | nc -w 1 localhost 6379

echo "   GET greeting"
echo "GET greeting" | nc -w 1 localhost 6379

echo "   SET counter 42"
echo "SET counter 42" | nc -w 1 localhost 6379

echo "   INCR counter"
echo "INCR counter" | nc -w 1 localhost 6379

echo "   SIZE"
echo "SIZE" | nc -w 1 localhost 6379
echo ""

echo "4. Checking container logs..."
docker logs nubdb-demo | head -6
echo ""

echo "5. Cleaning up..."
docker stop nubdb-demo > /dev/null 2>&1
docker rm nubdb-demo > /dev/null 2>&1
echo "   ✓ Container stopped and removed"
echo ""

echo "==================================="
echo "Demo completed successfully! ✓"
echo "==================================="
echo ""
echo "Quick start:"
echo "  docker-compose up -d"
echo "  echo 'SET key value' | nc localhost 6379"
echo ""
