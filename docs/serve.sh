#!/bin/bash
# Simple HTTP server for local documentation testing

echo "========================================="
echo "  NubDB Documentation Server"
echo "========================================="
echo ""

PORT=${1:-8000}

if command -v python3 &> /dev/null; then
    echo "Starting Python HTTP server on port $PORT..."
    echo "Open: http://localhost:$PORT"
    echo ""
    echo "Press Ctrl+C to stop"
    echo ""
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    echo "Starting Python HTTP server on port $PORT..."
    echo "Open: http://localhost:$PORT"
    echo ""
    echo "Press Ctrl+C to stop"
    echo ""
    python -m SimpleHTTPServer $PORT
elif command -v php &> /dev/null; then
    echo "Starting PHP HTTP server on port $PORT..."
    echo "Open: http://localhost:$PORT"
    echo ""
    echo "Press Ctrl+C to stop"
    echo ""
    php -S localhost:$PORT
else
    echo "Error: No HTTP server available"
    echo "Please install Python or PHP to serve documentation"
    exit 1
fi
