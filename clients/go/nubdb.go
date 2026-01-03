// Package nubdb provides a Go client for NubDB database.
package nubdb

import (
"bufio"
"fmt"
"net"
"strconv"
"strings"
"time"
)

// Client represents a connection to NubDB
type Client struct {
conn   net.Conn
reader *bufio.Reader
writer *bufio.Writer
host   string
port   int
}

// Config holds configuration for the client
type Config struct {
Host    string
Port    int
Timeout time.Duration
}

// DefaultConfig returns default configuration
func DefaultConfig() *Config {
return &Config{
Host:    "localhost",
Port:    6379,
Timeout: 5 * time.Second,
}
}

// Connect creates a new connection to NubDB
func Connect(config *Config) (*Client, error) {
if config == nil {
config = DefaultConfig()
}

addr := fmt.Sprintf("%s:%d", config.Host, config.Port)
conn, err := net.DialTimeout("tcp", addr, config.Timeout)
if err != nil {
return nil, fmt.Errorf("failed to connect: %w", err)
}

client := &Client{
conn:   conn,
reader: bufio.NewReader(conn),
writer: bufio.NewWriter(conn),
host:   config.Host,
port:   config.Port,
}

return client, nil
}

// sendCommand sends a command and returns the response
func (c *Client) sendCommand(cmd string) (string, error) {
// Write command
_, err := c.writer.WriteString(cmd + "\n")
if err != nil {
return "", fmt.Errorf("write error: %w", err)
}

if err := c.writer.Flush(); err != nil {
return "", fmt.Errorf("flush error: %w", err)
}

// Read response
response, err := c.reader.ReadString('\n')
if err != nil {
return "", fmt.Errorf("read error: %w", err)
}

return strings.TrimSpace(response), nil
}

// Set stores a key-value pair
func (c *Client) Set(key, value string, ttl int) error {
cmd := fmt.Sprintf(`SET %s "%s"`, key, value)
if ttl > 0 {
cmd += fmt.Sprintf(" %d", ttl)
}

response, err := c.sendCommand(cmd)
if err != nil {
return err
}

if response != "OK" {
return fmt.Errorf("unexpected response: %s", response)
}

return nil
}

// Get retrieves a value by key
func (c *Client) Get(key string) (string, error) {
response, err := c.sendCommand(fmt.Sprintf("GET %s", key))
if err != nil {
return "", err
}

if response == "(nil)" {
return "", nil
}

// Remove quotes if present
response = strings.Trim(response, `"`)
return response, nil
}

// Delete removes a key
func (c *Client) Delete(key string) error {
response, err := c.sendCommand(fmt.Sprintf("DELETE %s", key))
if err != nil {
return err
}

if response != "OK" && response != "(not found)" {
return fmt.Errorf("unexpected response: %s", response)
}

return nil
}

// Exists checks if a key exists
func (c *Client) Exists(key string) (bool, error) {
response, err := c.sendCommand(fmt.Sprintf("EXISTS %s", key))
if err != nil {
return false, err
}

return response == "1", nil
}

// Incr increments a counter
func (c *Client) Incr(key string) (int64, error) {
response, err := c.sendCommand(fmt.Sprintf("INCR %s", key))
if err != nil {
return 0, err
}

value, err := strconv.ParseInt(response, 10, 64)
if err != nil {
return 0, fmt.Errorf("invalid response: %s", response)
}

return value, nil
}

// Decr decrements a counter
func (c *Client) Decr(key string) (int64, error) {
response, err := c.sendCommand(fmt.Sprintf("DECR %s", key))
if err != nil {
return 0, err
}

value, err := strconv.ParseInt(response, 10, 64)
if err != nil {
return 0, fmt.Errorf("invalid response: %s", response)
}

return value, nil
}

// Size returns the number of keys
func (c *Client) Size() (int64, error) {
response, err := c.sendCommand("SIZE")
if err != nil {
return 0, err
}

// Parse "N keys" format
parts := strings.Fields(response)
if len(parts) > 0 {
value, err := strconv.ParseInt(parts[0], 10, 64)
if err != nil {
return 0, fmt.Errorf("invalid response: %s", response)
}
return value, nil
}

return 0, fmt.Errorf("invalid response: %s", response)
}

// Clear deletes all keys
func (c *Client) Clear() error {
response, err := c.sendCommand("CLEAR")
if err != nil {
return err
}

if response != "OK" {
return fmt.Errorf("unexpected response: %s", response)
}

return nil
}

// Close closes the connection
func (c *Client) Close() error {
if c.conn != nil {
c.sendCommand("QUIT")
return c.conn.Close()
}
return nil
}
