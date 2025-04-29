import http.server
import socketserver
import os
import sys

# Try different ports starting from 4000
for port in range(4000, 4010):
    try:
        print(f"Attempting to start server on port {port}...")
        handler = http.server.SimpleHTTPRequestHandler
        httpd = socketserver.TCPServer(("", port), handler)
        print(f"Success! Server started at http://localhost:{port}")
        print(f"Access the widget at http://localhost:{port}/full-widget.html")
        print("Press Ctrl+C to stop the server")
        httpd.serve_forever()
        break
    except OSError as e:
        print(f"Port {port} failed: {e}")
        continue
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)
else:
    print("Could not find an available port in range 4000-4010. Please try again later or manually specify a different port.")