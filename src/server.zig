const std = @import("std");
const Storage = @import("storage.zig").Storage;
const protocol = @import("protocol.zig");

pub const ServerConfig = struct {
    port: u16 = 6379,
    host: []const u8 = "0.0.0.0",
    max_connections: u32 = 1000,
};

pub fn startServer(storage: *Storage, config: ServerConfig) !void {
    const address = try std.net.Address.parseIp(config.host, config.port);
    var server = try address.listen(.{
        .reuse_address = true,
    });
    defer server.deinit();
    
    std.debug.print("NubDB server listening on {s}:{d}\n", .{ config.host, config.port });
    std.debug.print("Press Ctrl+C to stop\n\n", .{});
    
    var connection_count: u32 = 0;
    
    while (true) {
        const connection = server.accept() catch |err| {
            std.debug.print("Accept error: {}\n", .{err});
            continue;
        };
        
        connection_count += 1;
        
        if (connection_count > config.max_connections) {
            connection.stream.close();
            connection_count -= 1;
            continue;
        }
        
        const thread = std.Thread.spawn(.{}, handleClient, .{ storage, connection, &connection_count }) catch |err| {
            std.debug.print("Thread spawn error: {}\n", .{err});
            connection.stream.close();
            connection_count -= 1;
            continue;
        };
        thread.detach();
    }
}

fn handleClient(storage: *Storage, connection: std.net.Server.Connection, connection_count: *u32) void {
    defer {
        connection.stream.close();
        _ = @atomicRmw(u32, connection_count, .Sub, 1, .monotonic);
    }
    
    var buf: [4096]u8 = undefined;
    var stream = std.io.bufferedReader(connection.stream.reader());
    const reader = stream.reader();
    const writer = connection.stream.writer();
    
    while (true) {
        const line = reader.readUntilDelimiterOrEof(&buf, '\n') catch |err| {
            if (err != error.EndOfStream) {
                std.debug.print("Read error: {}\n", .{err});
            }
            break;
        };
        
        if (line == null) break;
        
        const trimmed = std.mem.trim(u8, line.?, &std.ascii.whitespace);
        if (trimmed.len == 0) continue;
        
        const args = protocol.parseArgs(trimmed);
        
        switch (args.cmd) {
            .set => {
                if (args.key.len == 0 or args.value.len == 0) {
                    writer.writeAll("ERROR: SET requires key and value\n") catch break;
                    continue;
                }
                storage.set(args.key, args.value, args.ttl) catch |err| {
                    writer.print("ERROR: {}\n", .{err}) catch break;
                    continue;
                };
                writer.writeAll("OK\n") catch break;
            },
            .get => {
                if (args.key.len == 0) {
                    writer.writeAll("ERROR: GET requires key\n") catch break;
                    continue;
                }
                if (storage.get(args.key)) |value| {
                    writer.print("\"{s}\"\n", .{value}) catch break;
                } else {
                    writer.writeAll("(nil)\n") catch break;
                }
            },
            .delete => {
                if (args.key.len == 0) {
                    writer.writeAll("ERROR: DELETE requires key\n") catch break;
                    continue;
                }
                const deleted = storage.delete(args.key) catch |err| {
                    writer.print("ERROR: {}\n", .{err}) catch break;
                    continue;
                };
                if (deleted) {
                    writer.writeAll("OK\n") catch break;
                } else {
                    writer.writeAll("(not found)\n") catch break;
                }
            },
            .exists => {
                if (args.key.len == 0) {
                    writer.writeAll("ERROR: EXISTS requires key\n") catch break;
                    continue;
                }
                const exists = storage.exists(args.key);
                writer.print("{d}\n", .{@as(u8, if (exists) 1 else 0)}) catch break;
            },
            .incr => {
                if (args.key.len == 0) {
                    writer.writeAll("ERROR: INCR requires key\n") catch break;
                    continue;
                }
                const new_value = storage.increment(args.key, 1) catch |err| {
                    writer.print("ERROR: {}\n", .{err}) catch break;
                    continue;
                };
                writer.print("{d}\n", .{new_value}) catch break;
            },
            .decr => {
                if (args.key.len == 0) {
                    writer.writeAll("ERROR: DECR requires key\n") catch break;
                    continue;
                }
                const new_value = storage.increment(args.key, -1) catch |err| {
                    writer.print("ERROR: {}\n", .{err}) catch break;
                    continue;
                };
                writer.print("{d}\n", .{new_value}) catch break;
            },
            .size => {
                writer.print("{d} keys\n", .{storage.size()}) catch break;
            },
            .clear => {
                storage.clear();
                writer.writeAll("OK\n") catch break;
            },
            .quit => {
                writer.writeAll("Goodbye\n") catch {};
                break;
            },
            .unknown => {
                writer.writeAll("ERROR: Unknown command\n") catch break;
            },
        }
    }
}
