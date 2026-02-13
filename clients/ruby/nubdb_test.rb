require 'minitest/autorun'
require 'socket'
require_relative 'nubdb'

class NubDBTest < Minitest::Test
  def setup
    @port = 6384
    @server = TCPServer.new('localhost', @port)
    @server_thread = Thread.new do
      loop do
        begin
          client = @server.accept
          while line = client.gets
            case line.strip
            when /^SET (\w+) "([^"]+)"( \d+)?$/
              client.puts "OK"
            when /^GET (\w+)$/
              client.puts "\"value\""
            when /^DELETE (\w+)$/
              client.puts "OK"
            when /^EXISTS (\w+)$/
              client.puts "1"
            when /^INCR (\w+)$/
              client.puts "101"
            when /^DECR (\w+)$/
              client.puts "99"
            when /^SIZE$/
              client.puts "10 keys"
            when /^CLEAR$/
              client.puts "OK"
            when /^QUIT$/
              client.puts "Goodbye"
              break
            else
              client.puts "ERROR: Unknown command"
            end
          end
          client.close
        rescue => e
          # Ignore server errors during shutdown
        end
      end
    end
    @client = NubDB.new(port: @port)
  end

  def teardown
    @client.close rescue nil
    @server.close rescue nil
    @server_thread.terminate rescue nil
  end

  def test_valid_operations
    assert @client.set('name', 'Alice')
    assert_equal 'value', @client.get('name')
    assert @client.delete('name')
    assert @client.exists?('name')
    assert_equal 101, @client.incr('counter')
    assert_equal 99, @client.decr('counter')
    assert_equal 10, @client.size
    assert @client.clear
  end

  def test_key_injection_prevention
    assert_raises(ArgumentError) { @client.set("key\nINJECT", "value") }
    assert_raises(ArgumentError) { @client.set("key\rINJECT", "value") }
    assert_raises(ArgumentError) { @client.set("key INJECT", "value") }
    assert_raises(ArgumentError) { @client.get("key\nINJECT") }
    assert_raises(ArgumentError) { @client.delete("key INJECT") }
  end

  def test_value_injection_prevention
    assert_raises(ArgumentError) { @client.set("key", "value\nINJECT") }
    assert_raises(ArgumentError) { @client.set("key", "value\" INJECT") }
  end

  def test_value_with_spaces_allowed
    assert @client.set('city', 'New York')
  end
end
