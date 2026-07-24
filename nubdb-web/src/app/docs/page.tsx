'use client';

import { useState } from 'react';
import Link from 'next/link';

const commands = [
    { name: 'SET', syntax: 'SET key value [ttl]', desc: 'Store a key-value pair with optional TTL (seconds)', example: 'SET mykey "Hello, World!"\nSET counter 100 60  # Expires in 60s', response: 'OK' },
    { name: 'GET', syntax: 'GET key', desc: 'Retrieve value by key', example: 'GET mykey', response: '"Hello, World!" or (nil)' },
    { name: 'DELETE', syntax: 'DELETE key', desc: 'Remove a key from the database', example: 'DELETE mykey', response: 'OK or (not found)' },
    { name: 'EXISTS', syntax: 'EXISTS key', desc: 'Check if key exists', example: 'EXISTS mykey', response: '1 (exists) or 0 (not found)' },
    { name: 'INCR', syntax: 'INCR key', desc: 'Increment integer value by 1', example: 'INCR counter', response: 'New value (integer)' },
    { name: 'DECR', syntax: 'DECR key', desc: 'Decrement integer value by 1', example: 'DECR counter', response: 'New value (integer)' },
    { name: 'SIZE', syntax: 'SIZE', desc: 'Get number of keys in the database', example: 'SIZE', response: 'N keys' },
    { name: 'CLEAR', syntax: 'CLEAR', desc: 'Delete all keys from the database', example: 'CLEAR', response: 'OK' },
];

const features = [
    { icon: '🚀', title: 'Lightning Fast', desc: '100K+ ops/second with sub-microsecond latency. Robin Hood hashing for O(1) lookups.' },
    { icon: '💾', title: 'AOF Persistence', desc: 'Append-Only File for crash recovery and durability with background compaction.' },
    { icon: '🐳', title: 'Docker Ready', desc: 'Production-ready Docker images with web network integration and service discovery.' },
    { icon: '🔒', title: 'Thread Safe', desc: 'RwLock for concurrent reads, lock-free operations, atomic counters.' },
    { icon: '⏱️', title: 'TTL Support', desc: 'Automatic key expiration with lazy cleanup and periodic garbage collection.' },
    { icon: '🔐', title: 'TLS/SSL', desc: 'Encrypted connections via stunnel proxy for production security.' },
    { icon: '🌐', title: 'TCP Server', desc: 'Multi-threaded TCP server mode with persistent connections.' },
    { icon: '🔧', title: 'Atomic Ops', desc: 'INCR/DECR operations with integer values for counters.' },
];

const quickStartTabs = [
    {
        id: 'docker', label: 'Docker', code: `# Create web network
docker network create web

# Run NubDT
docker run -d \\
  --name nubdb-server \\
  --network web \\
  -p 6379:6379 \\
  -v nubdb-data:/data \\
  nubdb:latest

# Test connection
echo "SET hello world" | nc localhost 6379` },
    {
        id: 'compose', label: 'Docker Compose', code: `# Create network
docker network create web

# Start NubDT
docker compose up -d

# View logs
docker compose logs -f

# Test connection
echo "GET hello" | nc localhost 6379` },
    {
        id: 'source', label: 'From Source', code: `# Clone repository
git clone https://github.com/nub-coders/nubdt.git
cd nubdt

# Build
make build

# Run in server mode
make server

# Or use zig directly
zig build -Doptimize=ReleaseFast
./zig-out/bin/nubdt --server` },
    {
        id: 'pip', label: 'Python Client', code: `# Install the official Python client
pip install nubdb

# Quick usage
from nubdb import NubDB

client = NubDB("localhost", 6379)
client.set("greeting", "Hello from NubDT!")
print(client.get("greeting"))

# With TLS
client = NubDB("nubdbs://localhost:6380")` },
];

const codeExamples = [
    {
        id: 'python', label: 'Python', lang: 'python', code: `from nubdb import NubDB

# Plain TCP connection
client = NubDB("localhost", 6379)

# Or with TLS encryption
client = NubDB("nubdbs://your-server:6380")

# Basic operations
client.set("greeting", "Hello from Python!")
result = client.get("greeting")
print(result)  # "Hello from Python!"

# With TTL (expires in 60 seconds)
client.set("temp_key", "temporary", ttl=60)

# Atomic counters
client.set("views", "0")
client.incr("views")  # 1
client.incr("views")  # 2

# Check database size
print(client.size())  # "2 keys"` },
    {
        id: 'nodejs', label: 'Node.js', lang: 'javascript', code: `const net = require('net');

class NubDTClient {
    constructor(host = 'localhost', port = 6379) {
        this.client = net.createConnection({ host, port });
    }

    send(cmd) {
        return new Promise((resolve) => {
            this.client.write(cmd + '\\n');
            this.client.once('data', (data) => {
                resolve(data.toString().trim());
            });
        });
    }

    set(key, value) { return this.send(\`SET \${key} \${value}\`); }
    get(key) { return this.send(\`GET \${key}\`); }
    delete(key) { return this.send(\`DELETE \${key}\`); }
}

const client = new NubDTClient();
await client.set('greeting', 'Hello from Node.js!');
console.log(await client.get('greeting'));` },
    {
        id: 'go', label: 'Go', lang: 'go', code: `package main

import (
    "bufio"
    "fmt"
    "net"
)

type NubDTClient struct {
    conn   net.Conn
    reader *bufio.Reader
}

func NewClient(host string, port int) (*NubDTClient, error) {
    addr := fmt.Sprintf("%s:%d", host, port)
    conn, err := net.Dial("tcp", addr)
    if err != nil {
        return nil, err
    }
    return &NubDTClient{
        conn:   conn,
        reader: bufio.NewReader(conn),
    }, nil
}

func (c *NubDTClient) Send(cmd string) (string, error) {
    _, err := c.conn.Write([]byte(cmd + "\\n"))
    if err != nil {
        return "", err
    }
    line, _ := c.reader.ReadString('\\n')
    return strings.TrimSpace(line), nil
}

func main() {
    client, _ := NewClient("localhost", 6379)
    client.Send("SET greeting Hello!")
    resp, _ := client.Send("GET greeting")
    fmt.Println(resp)  // "Hello!"
}` },
    {
        id: 'rust', label: 'Rust', lang: 'rust', code: `use std::io::{BufRead, BufReader, Write};
use std::net::TcpStream;

struct NubDTClient {
    reader: BufReader<TcpStream>,
    writer: TcpStream,
}

impl NubDTClient {
    fn new(host: &str, port: u16) -> std::io::Result<Self> {
        let stream = TcpStream::connect((host, port))?;
        let writer = stream.try_clone()?;
        Ok(NubDTClient {
            reader: BufReader::new(stream),
            writer,
        })
    }

    fn send(&mut self, cmd: &str) -> std::io::Result<String> {
        writeln!(self.writer, "{}", cmd)?;
        let mut response = String::new();
        self.reader.read_line(&mut response)?;
        Ok(response.trim().to_string())
    }
}

fn main() {
    let mut client = NubDTClient::new("localhost", 6379).unwrap();
    client.send("SET greeting Hello!").unwrap();
    let result = client.send("GET greeting").unwrap();
    println!("{}", result);  // "Hello!"
}` },
];

const benchmarks = [
    { title: 'Sequential SET', value: '200K+', unit: 'ops/second', detail: 'Average latency: <5µs' },
    { title: 'Sequential GET', value: '1M+', unit: 'ops/second', detail: 'Average latency: <1µs' },
    { title: 'Mixed Workload', value: '300K+', unit: 'ops/second', detail: '50% GET, 40% SET, 10% DELETE' },
    { title: 'AOF Replay', value: '500K+', unit: 'ops/second', detail: 'Fast crash recovery' },
];

export default function DocsPage() {
    const [activeQS, setActiveQS] = useState('docker');
    const [activeExample, setActiveExample] = useState('python');

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e5e7eb' }}>
            {/* Navigation */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(139,92,246,0.15)', padding: '1rem 0',
            }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link href="/" style={{ textDecoration: 'none', fontSize: '1.5rem', fontWeight: 'bold', color: '#a78bfa' }}>⚡ NubDT</Link>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {['features', 'quick-start', 'api', 'examples', 'performance'].map(s => (
                            <a key={s} href={`#${s}`} style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.2s' }}
                                onMouseEnter={e => (e.target as HTMLElement).style.color = '#a78bfa'}
                                onMouseLeave={e => (e.target as HTMLElement).style.color = '#9ca3af'}>
                                {s.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </a>
                        ))}
                        <Link href="/login" style={{
                            background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white',
                            padding: '0.5rem 1.25rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
                        }}>Dashboard →</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section style={{
                textAlign: 'center', padding: '6rem 2rem 4rem',
                background: 'linear-gradient(180deg, rgba(124,58,237,0.12) 0%, transparent 100%)',
            }}>
                <h1 style={{
                    fontSize: '3.5rem', fontWeight: 800, marginBottom: '1rem',
                    background: 'linear-gradient(135deg, #a78bfa, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                }}>
                    ⚡ NubDT
                </h1>
                <p style={{ fontSize: '1.5rem', color: '#c4b5fd', marginBottom: '0.75rem' }}>High-Performance AOF Database in Zig</p>
                <p style={{ fontSize: '1.1rem', color: '#9ca3af', maxWidth: 650, margin: '0 auto 2.5rem' }}>
                    A blazing-fast, AOF-based in-memory database optimized for maximum throughput and minimal latency.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem', flexWrap: 'wrap' }}>
                    <a href="#quick-start" style={{
                        background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white',
                        padding: '0.8rem 2rem', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: '1.05rem',
                    }}>Get Started</a>
                    <a href="https://github.com/nub-coders/nubdt" target="_blank" style={{
                        border: '2px solid rgba(139,92,246,0.4)', color: '#a78bfa',
                        padding: '0.8rem 2rem', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: '1.05rem',
                    }}>View on GitHub</a>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.5rem', maxWidth: 700, margin: '0 auto' }}>
                    {[['100K+', 'ops/second'], ['<5µs', 'SET latency'], ['<1µs', 'GET latency'], ['12.8MB', 'Docker image']].map(([v, l]) => (
                        <div key={l}>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#a78bfa' }}>{v}</div>
                            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{l}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section id="features" style={{ padding: '5rem 2rem' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: 700, textAlign: 'center', marginBottom: '3rem' }}>Features</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                        {features.map(f => (
                            <div key={f.title} style={{
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.12)',
                                borderRadius: 12, padding: '1.75rem', transition: 'transform 0.2s, border-color 0.2s',
                                cursor: 'default',
                            }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.35)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.12)'; }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                                <h3 style={{ color: '#a78bfa', marginBottom: '0.5rem', fontSize: '1.1rem' }}>{f.title}</h3>
                                <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.6 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Quick Start */}
            <section id="quick-start" style={{ padding: '5rem 2rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: 700, textAlign: 'center', marginBottom: '2rem' }}>Quick Start</h2>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
                        {quickStartTabs.map(t => (
                            <button key={t.id} onClick={() => setActiveQS(t.id)} style={{
                                padding: '0.6rem 1.25rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                                background: activeQS === t.id ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'rgba(255,255,255,0.06)',
                                color: activeQS === t.id ? 'white' : '#9ca3af', transition: 'all 0.2s',
                            }}>{t.label}</button>
                        ))}
                    </div>
                    {quickStartTabs.filter(t => t.id === activeQS).map(t => (
                        <div key={t.id} style={{ position: 'relative' }}>
                            <pre style={{
                                background: '#111827', border: '1px solid rgba(139,92,246,0.15)',
                                borderRadius: 12, padding: '1.5rem', overflow: 'auto', fontSize: '0.85rem', lineHeight: 1.7,
                            }}>
                                <code style={{ color: '#d1d5db', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>{t.code}</code>
                            </pre>
                            <button onClick={() => { navigator.clipboard.writeText(t.code); }} style={{
                                position: 'absolute', top: 12, right: 12, background: 'rgba(139,92,246,0.3)', color: '#a78bfa',
                                border: 'none', borderRadius: 6, padding: '0.35rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem',
                            }}>Copy</button>
                        </div>
                    ))}
                </div>
            </section>

            {/* API Reference */}
            <section id="api" style={{ padding: '5rem 2rem' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: 700, textAlign: 'center', marginBottom: '3rem' }}>API Reference</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {commands.map(cmd => (
                            <div key={cmd.name} style={{
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.12)',
                                borderRadius: 12, padding: '1.5rem',
                            }}>
                                <h3 style={{ color: '#a78bfa', marginBottom: '0.4rem', fontSize: '1.2rem', fontFamily: 'monospace' }}>{cmd.name}</h3>
                                <div style={{
                                    background: 'rgba(124,58,237,0.15)', padding: '0.5rem 0.75rem', borderRadius: 6,
                                    fontFamily: 'monospace', fontSize: '0.85rem', color: '#c4b5fd', marginBottom: '0.75rem',
                                }}>{cmd.syntax}</div>
                                <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{cmd.desc}</p>
                                <pre style={{ background: '#111827', borderRadius: 8, padding: '0.75rem', margin: '0.5rem 0', overflow: 'auto' }}>
                                    <code style={{ color: '#d1d5db', fontSize: '0.8rem', fontFamily: 'monospace' }}>{cmd.example}</code>
                                </pre>
                                <div style={{
                                    background: 'rgba(16,185,129,0.1)', padding: '0.4rem 0.75rem', borderRadius: 6, marginTop: '0.75rem',
                                    fontSize: '0.8rem', color: '#6ee7b7',
                                }}>
                                    Response: <code>{cmd.response}</code>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Code Examples */}
            <section id="examples" style={{ padding: '5rem 2rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: 700, textAlign: 'center', marginBottom: '2rem' }}>Code Examples</h2>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
                        {codeExamples.map(ex => (
                            <button key={ex.id} onClick={() => setActiveExample(ex.id)} style={{
                                padding: '0.6rem 1.25rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                                background: activeExample === ex.id ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'rgba(255,255,255,0.06)',
                                color: activeExample === ex.id ? 'white' : '#9ca3af', transition: 'all 0.2s',
                            }}>{ex.label}</button>
                        ))}
                    </div>
                    {codeExamples.filter(ex => ex.id === activeExample).map(ex => (
                        <div key={ex.id} style={{ position: 'relative' }}>
                            <pre style={{
                                background: '#111827', border: '1px solid rgba(139,92,246,0.15)',
                                borderRadius: 12, padding: '1.5rem', overflow: 'auto', fontSize: '0.85rem', lineHeight: 1.7,
                            }}>
                                <code style={{ color: '#d1d5db', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>{ex.code}</code>
                            </pre>
                            <button onClick={() => { navigator.clipboard.writeText(ex.code); }} style={{
                                position: 'absolute', top: 12, right: 12, background: 'rgba(139,92,246,0.3)', color: '#a78bfa',
                                border: 'none', borderRadius: 6, padding: '0.35rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem',
                            }}>Copy</button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Performance */}
            <section id="performance" style={{ padding: '5rem 2rem' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: 700, textAlign: 'center', marginBottom: '3rem' }}>Performance Benchmarks</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                        {benchmarks.map(b => (
                            <div key={b.title} style={{
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.12)',
                                borderRadius: 12, padding: '2rem', textAlign: 'center',
                            }}>
                                <h3 style={{ color: '#9ca3af', marginBottom: '0.75rem', fontSize: '0.95rem' }}>{b.title}</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#a78bfa', marginBottom: '0.25rem' }}>{b.value}</div>
                                <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{b.unit}</div>
                                <div style={{ color: '#4b5563', fontSize: '0.8rem' }}>{b.detail}</div>
                            </div>
                        ))}
                    </div>
                    <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#c4b5fd' }}>Latency Percentiles</h3>
                    <div style={{ maxWidth: 500, margin: '0 auto' }}>
                        {[['p50', '<3µs'], ['p95', '<10µs'], ['p99', '<20µs']].map(([p, v]) => (
                            <div key={p} style={{
                                display: 'flex', justifyContent: 'space-between', padding: '0.9rem 1.25rem',
                                background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: '0.5rem',
                            }}>
                                <span style={{ fontWeight: 700, color: '#a78bfa' }}>{p}</span>
                                <span style={{ fontWeight: 700, color: '#34d399' }}>{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Resources */}
            <section style={{ padding: '5rem 2rem', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: 700, textAlign: 'center', marginBottom: '3rem' }}>Resources</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                        {[
                            { icon: '📚', title: 'GitHub Repository', desc: 'Source code, issues, and contributions', href: 'https://github.com/nub-coders/nubdt' },
                            { icon: '🐳', title: 'Docker Guide', desc: 'Complete Docker deployment documentation', href: 'https://github.com/nub-coders/nubdt/blob/main/DOCKER.md' },
                            { icon: '🐍', title: 'Python Client (PyPI)', desc: 'pip install nubdb — Official client', href: 'https://pypi.org/project/nubdb/' },
                            { icon: '🖥️', title: 'Web Console', desc: 'Manage instances from the dashboard', href: '/dashboard' },
                        ].map(r => (
                            <a key={r.title} href={r.href} target={r.href.startsWith('http') ? '_blank' : undefined} style={{
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.12)',
                                borderRadius: 12, padding: '1.75rem', textDecoration: 'none', transition: 'transform 0.2s, border-color 0.2s',
                                display: 'block',
                            }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.35)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.12)'; }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{r.icon}</div>
                                <h3 style={{ color: '#a78bfa', marginBottom: '0.5rem', fontSize: '1.05rem' }}>{r.title}</h3>
                                <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{r.desc}</p>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{
                textAlign: 'center', padding: '2.5rem 2rem',
                borderTop: '1px solid rgba(139,92,246,0.1)', color: '#4b5563', fontSize: '0.85rem',
            }}>
                <p>© 2026 NubDT. Built with Zig. Open Source under MIT License.</p>
                <p style={{ marginTop: '0.5rem' }}>
                    <a href="https://github.com/nub-coders/nubdt" target="_blank" style={{ color: '#a78bfa', textDecoration: 'none', marginRight: '1rem' }}>GitHub</a>
                    <a href="https://github.com/nub-coders/nubdt/issues" target="_blank" style={{ color: '#a78bfa', textDecoration: 'none', marginRight: '1rem' }}>Issues</a>
                    <Link href="/dashboard" style={{ color: '#a78bfa', textDecoration: 'none' }}>Dashboard</Link>
                </p>
            </footer>
        </div>
    );
}
