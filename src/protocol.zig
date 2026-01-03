const std = @import("std");

pub const Command = enum {
    set,
    get,
    delete,
    exists,
    incr,
    decr,
    size,
    clear,
    quit,
    unknown,
};

pub fn parseCommand(line: []const u8) Command {
    var iter = std.mem.tokenizeAny(u8, line, " \t\r\n");
    const cmd = iter.next() orelse return .unknown;
    
    if (std.ascii.eqlIgnoreCase(cmd, "set")) return .set;
    if (std.ascii.eqlIgnoreCase(cmd, "get")) return .get;
    if (std.ascii.eqlIgnoreCase(cmd, "del") or std.ascii.eqlIgnoreCase(cmd, "delete")) return .delete;
    if (std.ascii.eqlIgnoreCase(cmd, "exists")) return .exists;
    if (std.ascii.eqlIgnoreCase(cmd, "incr")) return .incr;
    if (std.ascii.eqlIgnoreCase(cmd, "decr")) return .decr;
    if (std.ascii.eqlIgnoreCase(cmd, "size")) return .size;
    if (std.ascii.eqlIgnoreCase(cmd, "clear")) return .clear;
    if (std.ascii.eqlIgnoreCase(cmd, "quit") or std.ascii.eqlIgnoreCase(cmd, "exit")) return .quit;
    
    return .unknown;
}

pub const ParsedArgs = struct {
    cmd: Command,
    key: []const u8 = "",
    value: []const u8 = "",
    ttl: i64 = 0,
};

pub fn parseArgs(line: []const u8) ParsedArgs {
    var result = ParsedArgs{ .cmd = .unknown };
    
    var iter = std.mem.tokenizeAny(u8, line, " \t\r\n");
    const cmd_str = iter.next() orelse return result;
    result.cmd = parseCommand(cmd_str);
    
    switch (result.cmd) {
        .set => {
            result.key = iter.next() orelse return result;
            result.value = iter.next() orelse return result;
            if (iter.next()) |ttl_str| {
                result.ttl = std.fmt.parseInt(i64, ttl_str, 10) catch 0;
            }
        },
        .get, .delete, .exists, .incr, .decr => {
            result.key = iter.next() orelse return result;
        },
        else => {},
    }
    
    return result;
}
