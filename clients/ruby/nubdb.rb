#!/usr/bin/env ruby
# frozen_string_literal: true

require 'socket'

##
# NubDB Ruby Client
#
# Simple client library for connecting to NubDB database.
class NubDB
  attr_reader :host, :port

  def initialize(host: 'localhost', port: 6379)
    @host = host
    @port = port
    @socket = nil
    connect
  end

  ##
  # Connect to NubDB server
  def connect
    @socket = TCPSocket.new(@host, @port)
  rescue StandardError => e
    raise "Failed to connect: #{e.message}"
  end

  ##
  # Send command and get response
  def send_command(command)
    raise 'Not connected' unless @socket

    @socket.puts(command)
    response = @socket.gets
    raise 'Connection closed' unless response

    response.strip
  end

  ##
  # SET key-value pair
  def set(key, value, ttl: 0)
    validate_key!(key)
    validate_value!(value)
    cmd = %(SET #{key} "#{value}")
    cmd += " #{ttl}" if ttl > 0
    response = send_command(cmd)
    response == 'OK'
  end

  ##
  # GET value by key
  def get(key)
    validate_key!(key)
    response = send_command("GET #{key}")
    return nil if response == '(nil)'

    # Remove quotes
    response.gsub(/^"|"$/, '')
  end

  ##
  # DELETE key
  def delete(key)
    validate_key!(key)
    response = send_command("DELETE #{key}")
    response == 'OK'
  end

  ##
  # EXISTS check if key exists
  def exists?(key)
    validate_key!(key)
    response = send_command("EXISTS #{key}")
    response == '1'
  end

  ##
  # INCR increment counter
  def incr(key)
    validate_key!(key)
    response = send_command("INCR #{key}")
    response.to_i
  end

  ##
  # DECR decrement counter
  def decr(key)
    validate_key!(key)
    response = send_command("DECR #{key}")
    response.to_i
  end

  ##
  # SIZE get number of keys
  def size
    response = send_command('SIZE')
    response.split.first.to_i
  end

  ##
  # CLEAR delete all keys
  def clear
    response = send_command('CLEAR')
    response == 'OK'
  end

  ##
  # Close connection
  def close
    return unless @socket

    send_command('QUIT') rescue nil
    @socket.close
    @socket = nil
  end

  private

  ##
  # Validate key to prevent command and argument injection
  def validate_key!(key)
    s = key.to_s
    if s.match?(/[\n\r\s]/)
      raise ArgumentError, 'Key cannot contain newlines or spaces'
    end
    s
  end

  ##
  # Validate value to prevent command and argument injection
  def validate_value!(value)
    s = value.to_s
    if s.include?("\n") || s.include?("\r")
      raise ArgumentError, 'Value cannot contain newlines'
    end
    if s.include?('"')
      raise ArgumentError, 'Value cannot contain double quotes'
    end
    s
  end

  public

  ##
  # Enable automatic cleanup
  def self.open(host: 'localhost', port: 6379)
    client = new(host: host, port: port)
    
    if block_given?
      begin
        yield client
      ensure
        client.close
      end
    else
      client
    end
  end
end

# Example usage
if __FILE__ == $PROGRAM_NAME
  puts "NubDB Ruby Client - Example\n\n"

  NubDB.open do |client|
    # SET operations
    client.set('name', 'Alice')
    client.set('age', '30')
    client.set('city', 'New York')

    # GET operations
    puts "name: #{client.get('name')}"
    puts "age: #{client.get('age')}"
    puts "city: #{client.get('city')}"

    # Counter
    client.set('counter', '100')
    puts "\ncounter: #{client.incr('counter')}"
    puts "counter: #{client.incr('counter')}"
    puts "counter: #{client.decr('counter')}"

    # Size
    puts "\nTotal keys: #{client.size}"

    puts "\n✓ Example completed!"
  end
end
