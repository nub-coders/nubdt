/**
 * NubDB Java Client
 * 
 * Simple client library for connecting to NubDB database.
 */

import java.io.*;
import java.net.Socket;

public class NubDB implements AutoCloseable {
    private Socket socket;
    private BufferedReader reader;
    private PrintWriter writer;
    private String host;
    private int port;

    /**
     * Connect to NubDB server
     * 
     * @param host Server hostname
     * @param port Server port
     */
    public NubDB(String host, int port) throws IOException {
        this.host = host;
        this.port = port;
        connect();
    }

    /**
     * Connect with default settings (localhost:6379)
     */
    public NubDB() throws IOException {
        this("localhost", 6379);
    }

    private void connect() throws IOException {
        socket = new Socket(host, port);
        reader = new BufferedReader(new InputStreamReader(socket.getInputStream()));
        writer = new PrintWriter(socket.getOutputStream(), true);
    }

    /**
     * Send command and get response
     */
    private String sendCommand(String command) throws IOException {
        writer.println(command);
        String response = reader.readLine();
        if (response == null) {
            throw new IOException("Connection closed");
        }
        return response.trim();
    }

    /**
     * SET key-value pair
     */
    public boolean set(String key, String value) throws IOException {
        return set(key, value, 0);
    }

    /**
     * SET key-value pair with TTL
     */
    public boolean set(String key, String value, int ttl) throws IOException {
        String cmd = String.format("SET %s \"%s\"", key, value);
        if (ttl > 0) {
            cmd += " " + ttl;
        }
        String response = sendCommand(cmd);
        return response.equals("OK");
    }

    /**
     * GET value by key
     */
    public String get(String key) throws IOException {
        String response = sendCommand("GET " + key);
        if (response.equals("(nil)")) {
            return null;
        }
        // Remove quotes
        if (response.startsWith("\"") && response.endsWith("\"")) {
            return response.substring(1, response.length() - 1);
        }
        return response;
    }

    /**
     * DELETE key
     */
    public boolean delete(String key) throws IOException {
        String response = sendCommand("DELETE " + key);
        return response.equals("OK");
    }

    /**
     * EXISTS check if key exists
     */
    public boolean exists(String key) throws IOException {
        String response = sendCommand("EXISTS " + key);
        return response.equals("1");
    }

    /**
     * INCR increment counter
     */
    public long incr(String key) throws IOException {
        String response = sendCommand("INCR " + key);
        return Long.parseLong(response);
    }

    /**
     * DECR decrement counter
     */
    public long decr(String key) throws IOException {
        String response = sendCommand("DECR " + key);
        return Long.parseLong(response);
    }

    /**
     * SIZE get number of keys
     */
    public long size() throws IOException {
        String response = sendCommand("SIZE");
        String[] parts = response.split("\\s+");
        if (parts.length > 0) {
            return Long.parseLong(parts[0]);
        }
        return 0;
    }

    /**
     * CLEAR delete all keys
     */
    public boolean clear() throws IOException {
        String response = sendCommand("CLEAR");
        return response.equals("OK");
    }

    /**
     * Close connection
     */
    @Override
    public void close() throws IOException {
        try {
            sendCommand("QUIT");
        } catch (IOException ignored) {
        }
        
        if (reader != null) reader.close();
        if (writer != null) writer.close();
        if (socket != null) socket.close();
    }

    /**
     * Example usage
     */
    public static void main(String[] args) {
        System.out.println("NubDB Java Client - Example\n");

        try (NubDB client = new NubDB()) {
            // SET operations
            client.set("name", "Alice");
            client.set("age", "30");
            client.set("city", "New York");

            // GET operations
            System.out.println("name: " + client.get("name"));
            System.out.println("age: " + client.get("age"));
            System.out.println("city: " + client.get("city"));

            // Counter
            client.set("counter", "100");
            System.out.println("counter: " + client.incr("counter"));
            System.out.println("counter: " + client.incr("counter"));
            System.out.println("counter: " + client.decr("counter"));

            // Size
            System.out.println("Total keys: " + client.size());

            System.out.println("\n✓ Example completed!");

        } catch (IOException e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}
