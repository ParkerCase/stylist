#!/usr/bin/env python3
"""
Simple HTTP Server for The Stylist application.
Serves files from the current directory on the specified port.
"""

import http.server
import socketserver
import os
import sys

# Default port
DEFAULT_PORT = 3456

def run_server(port):
    """Run a simple HTTP server on the specified port."""
    # Change to the directory containing the script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    handler = http.server.SimpleHTTPRequestHandler
    handler.extensions_map = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '': 'application/octet-stream'
    }
    
    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            print(f"Server running at http://localhost:{port}/")
            print(f"To access the widget, go to: http://localhost:{port}/public/full-widget.html")
            print("Press Ctrl+C to stop the server")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"Error: Port {port} is already in use.")
            print("Try using a different port number.")
            sys.exit(1)
        else:
            raise

if __name__ == "__main__":
    port = DEFAULT_PORT
    
    # Check if port is provided as command-line argument
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port number: {sys.argv[1]}")
            print(f"Using default port {DEFAULT_PORT} instead.")
            port = DEFAULT_PORT
    
    run_server(port)