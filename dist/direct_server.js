const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4000;

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.url}`);
  
  // Redirect all requests to full-widget.html
  if (req.url.includes('/src/app/') || 
      req.url.includes('jsx-dev-runtime') || 
      req.url.includes('/_next/') ||
      req.url !== '/full-widget.html') {
    
    console.log(`Redirecting ${req.url} to /full-widget.html`);
    
    res.writeHead(302, {
      'Location': '/full-widget.html'
    });
    res.end();
    return;
  }
  
  // Serve full-widget.html
  const filePath = path.join(__dirname, 'full-widget.html');
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      res.writeHead(500);
      res.end('Server error');
      return;
    }
    
    // Set headers
    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // Send the file content
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`
============================================
  Direct Server running at http://localhost:${PORT}
  Serving widget from: ${__dirname}/full-widget.html
  
  Access the widget at: http://localhost:${PORT}/full-widget.html
  
  NOTE: ALL paths will redirect to the widget!
============================================
  `);
});