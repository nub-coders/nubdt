/**
 * NubDB Node.js Client
 * 
 * Simple client library for connecting to NubDB database.
 * Requires NubDB to run in TCP server mode.
 */

const net = require('net');
const { EventEmitter } = require('events');

class NubDBClient extends EventEmitter {
    constructor(options = {}) {
        super();
        this.host = options.host || 'localhost';
        this.port = options.port || 6379;
        this.socket = null;
        this.connected = false;
        this.buffer = '';
        this.callbacks = [];
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.socket = net.createConnection({
                host: this.host,
                port: this.port
            });

            this.socket.on('connect', () => {
                this.connected = true;
                this.emit('connect');
                resolve();
            });

            this.socket.on('data', (data) => {
                this.handleData(data.toString());
            });

            this.socket.on('error', (err) => {
                this.emit('error', err);
                reject(err);
            });

            this.socket.on('close', () => {
                this.connected = false;
                this.emit('close');
            });
        });
    }

    handleData(data) {
        this.buffer += data;
        const lines = this.buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        this.buffer = lines.pop();
        
        // Process complete lines
        lines.forEach(line => {
            if (line && this.callbacks.length > 0) {
                const callback = this.callbacks.shift();
                callback(null, line.trim());
            }
        });
    }

    sendCommand(command) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                return reject(new Error('Not connected'));
            }

            this.callbacks.push((err, data) => {
                if (err) reject(err);
                else resolve(data);
            });

            this.socket.write(command + '\n');
        });
    }

    async set(key, value, ttl = 0) {
        const cmd = ttl > 0 
            ? `SET ${key} "${value}" ${ttl}`
            : `SET ${key} "${value}"`;
        const response = await this.sendCommand(cmd);
        return response === 'OK';
    }

    async get(key) {
        const response = await this.sendCommand(`GET ${key}`);
        if (response === '(nil)') return null;
        // Remove quotes if present
        return response.replace(/^"(.*)"$/, '$1');
    }

    async delete(key) {
        const response = await this.sendCommand(`DELETE ${key}`);
        return response === 'OK';
    }

    async exists(key) {
        const response = await this.sendCommand(`EXISTS ${key}`);
        return response === '1';
    }

    async incr(key) {
        const response = await this.sendCommand(`INCR ${key}`);
        return parseInt(response, 10);
    }

    async decr(key) {
        const response = await this.sendCommand(`DECR ${key}`);
        return parseInt(response, 10);
    }

    async size() {
        const response = await this.sendCommand('SIZE');
        const match = response.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    async clear() {
        const response = await this.sendCommand('CLEAR');
        return response === 'OK';
    }

    disconnect() {
        if (this.socket) {
            this.sendCommand('QUIT').catch(() => {});
            this.socket.end();
            this.socket = null;
            this.connected = false;
        }
    }
}

// Export
module.exports = NubDBClient;

// Example usage
if (require.main === module) {
    (async () => {
        console.log('NubDB Node.js Client - Example\n');

        const client = new NubDBClient();

        try {
            await client.connect();
            console.log('Connected to NubDB');

            // SET operations
            await client.set('name', 'Alice');
            await client.set('age', '30');
            await client.set('city', 'New York');

            // GET operations
            console.log('name:', await client.get('name'));
            console.log('age:', await client.get('age'));
            console.log('city:', await client.get('city'));

            // Counter
            await client.set('counter', '100');
            console.log('counter:', await client.incr('counter'));
            console.log('counter:', await client.incr('counter'));
            console.log('counter:', await client.decr('counter'));

            // Size
            console.log('Total keys:', await client.size());

            client.disconnect();
        } catch (err) {
            console.error('Error:', err.message);
        }
    })();
}
