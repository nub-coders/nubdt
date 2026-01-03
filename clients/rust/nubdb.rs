//! NubDB Rust Client
//! 
//! Simple client library for connecting to NubDB database.

use std::io::{BufRead, BufReader, Write};
use std::net::TcpStream;

pub struct NubDB {
    stream: TcpStream,
    reader: BufReader<TcpStream>,
}

impl NubDB {
    /// Connect to NubDB server
    pub fn connect(addr: &str) -> Result<Self, std::io::Error> {
        let stream = TcpStream::connect(addr)?;
        let reader = BufReader::new(stream.try_clone()?);
        
        Ok(NubDB { stream, reader })
    }

    /// Send a command and get response
    fn send_command(&mut self, cmd: &str) -> Result<String, std::io::Error> {
        writeln!(self.stream, "{}", cmd)?;
        self.stream.flush()?;

        let mut response = String::new();
        self.reader.read_line(&mut response)?;
        
        Ok(response.trim().to_string())
    }

    /// SET key-value pair
    pub fn set(&mut self, key: &str, value: &str, ttl: Option<u32>) -> Result<bool, std::io::Error> {
        let cmd = match ttl {
            Some(t) => format!(r#"SET {} "{}" {}"#, key, value, t),
            None => format!(r#"SET {} "{}""#, key, value),
        };

        let response = self.send_command(&cmd)?;
        Ok(response == "OK")
    }

    /// GET value by key
    pub fn get(&mut self, key: &str) -> Result<Option<String>, std::io::Error> {
        let response = self.send_command(&format!("GET {}", key))?;
        
        if response == "(nil)" {
            Ok(None)
        } else {
            // Remove quotes
            let value = response.trim_matches('"').to_string();
            Ok(Some(value))
        }
    }

    /// DELETE key
    pub fn delete(&mut self, key: &str) -> Result<bool, std::io::Error> {
        let response = self.send_command(&format!("DELETE {}", key))?;
        Ok(response == "OK")
    }

    /// EXISTS check if key exists
    pub fn exists(&mut self, key: &str) -> Result<bool, std::io::Error> {
        let response = self.send_command(&format!("EXISTS {}", key))?;
        Ok(response == "1")
    }

    /// INCR increment counter
    pub fn incr(&mut self, key: &str) -> Result<i64, std::io::Error> {
        let response = self.send_command(&format!("INCR {}", key))?;
        response.parse::<i64>()
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))
    }

    /// DECR decrement counter
    pub fn decr(&mut self, key: &str) -> Result<i64, std::io::Error> {
        let response = self.send_command(&format!("DECR {}", key))?;
        response.parse::<i64>()
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))
    }

    /// SIZE get number of keys
    pub fn size(&mut self) -> Result<usize, std::io::Error> {
        let response = self.send_command("SIZE")?;
        let parts: Vec<&str> = response.split_whitespace().collect();
        
        if let Some(num_str) = parts.first() {
            num_str.parse::<usize>()
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))
        } else {
            Ok(0)
        }
    }

    /// CLEAR delete all keys
    pub fn clear(&mut self) -> Result<bool, std::io::Error> {
        let response = self.send_command("CLEAR")?;
        Ok(response == "OK")
    }

    /// Close connection
    pub fn close(&mut self) -> Result<(), std::io::Error> {
        self.send_command("QUIT")?;
        Ok(())
    }
}

// Example usage
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_operations() {
        let mut client = NubDB::connect("localhost:6379").unwrap();
        
        // SET
        assert!(client.set("name", "Alice", None).unwrap());
        
        // GET
        let value = client.get("name").unwrap();
        assert_eq!(value, Some("Alice".to_string()));
        
        // EXISTS
        assert!(client.exists("name").unwrap());
        
        // DELETE
        assert!(client.delete("name").unwrap());
        assert!(!client.exists("name").unwrap());
        
        client.close().unwrap();
    }
}
