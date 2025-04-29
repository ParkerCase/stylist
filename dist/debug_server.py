#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse

class DebugHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        sys.stderr.write("\n--------------------------------------------\n")
        sys.stderr.write(f"REQUEST: {self.path}\n")
        sys.stderr.write(f"METHOD: {self.command}\n")
        sys.stderr.write(f"CLIENT: {self.client_address}\n")
        sys.stderr.write(f"STATUS: {args[1]} {args[0]}\n")
        sys.stderr.write("--------------------------------------------\n\n")
    
    def do_GET(self):
        print(f"Handling GET request for: {self.path}")
        
        # Force specific Content-Type headers based on extensions
        path = self.path
        if path == '/':
            path = '/index.html'
        
        if path.startswith('/'):
            path = path[1:]
            
        # Normalize the path to match the local file structure
        local_path = os.path.join(os.getcwd(), path)
        
        print(f"Local file path: {local_path}")
        print(f"File exists: {os.path.exists(local_path)}")
        
        # Handle the request using the parent method
        super().do_GET()

def run_server(port=4444):
    try:
        handler = DebugHTTPRequestHandler
        httpd = socketserver.TCPServer(("", port), handler)
        print(f"\n{'='*50}")
        print(f"Server started on port {port}")
        print(f"Root directory: {os.getcwd()}")
        print(f"Available files in current directory:")
        for file in os.listdir('.'):
            print(f"  - {file}")
        print(f"\nAccess the widget at: http://localhost:{port}/full-widget.html")
        print(f"{'='*50}\n")
        httpd.serve_forever()
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"Port {port} is already in use. Trying port {port + 1}...")
            run_server(port + 1)
        else:
            print(f"Error starting server: {e}")
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    run_server()