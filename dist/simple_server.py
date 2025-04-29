import http.server
import socketserver
import os

PORT = 4000
DIRECTORY = os.getcwd()

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def log_message(self, format, *args):
        print(f"Request: {self.path}")

handler = Handler

with socketserver.TCPServer(("", PORT), handler) as httpd:
    print(f"Server started at http://localhost:{PORT}")
    print(f"Access the widget at http://localhost:{PORT}/full-widget.html")
    print("Press Ctrl+C to stop the server")
    httpd.serve_forever()