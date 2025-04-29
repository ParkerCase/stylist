#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

# The port to serve on
PORT = 5050

# Create a custom handler that serves the widget HTML for all requests
class WidgetHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # No matter what path is requested, serve the widget
        self.path = '/full-widget.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

# Try to start the server
try:
    # Create the server
    with socketserver.TCPServer(("", PORT), WidgetHandler) as httpd:
        print(f"Server started at http://localhost:{PORT}")
        print(f"Serving widget from: {os.getcwd()}/full-widget.html")
        print("Press Ctrl+C to stop the server")
        
        # Start the server
        httpd.serve_forever()
except OSError as e:
    if e.errno == 48:  # Address already in use
        print(f"Port {PORT} is already in use.")
        print("Please try a different port or close the process using this port.")
        sys.exit(1)
    else:
        raise
except KeyboardInterrupt:
    print("\nServer stopped.")