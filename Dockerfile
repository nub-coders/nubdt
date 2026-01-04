# Multi-stage build for NubDB
FROM alpine:3.19 AS builder

# Install build dependencies
RUN apk add --no-cache \
    curl \
    xz \
    tar

# Download and install Zig 0.13.0
RUN curl -L https://ziglang.org/download/0.13.0/zig-linux-x86_64-0.13.0.tar.xz -o zig.tar.xz && \
    tar -xf zig.tar.xz && \
    mv zig-linux-x86_64-0.13.0 /usr/local/zig && \
    rm zig.tar.xz

ENV PATH="/usr/local/zig:${PATH}"

# Set working directory
WORKDIR /app

# Copy source files
COPY build.zig .
COPY src/ src/

# Build the project in release mode
RUN zig build -Doptimize=ReleaseFast

# Runtime stage
FROM alpine:3.19

# Install runtime dependencies including netcat for health checks
RUN apk add --no-cache \
    libgcc \
    libstdc++ \
    netcat-openbsd

# Create non-root user
RUN addgroup -g 1000 nubdb && \
    adduser -D -u 1000 -G nubdb nubdb

# Set working directory
WORKDIR /data

# Copy binary from builder
COPY --from=builder /app/zig-out/bin/nubdt /usr/local/bin/nubdt

# Change ownership
RUN chown -R nubdb:nubdb /data

# Switch to non-root user
USER nubdb

# Expose default port
EXPOSE 6379

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD echo "SIZE" | nc localhost 6379 || exit 1

# Default command - run in server mode
CMD ["nubdt", "--server", "6379"]
