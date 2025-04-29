const http = require('http');
const fs = require('fs');
const path = require('path');

// Load the full-widget.html file once at startup
const widgetHtml = fs.readFileSync(path.join(__dirname, 'full-widget.html'));

// Create a server that ONLY returns the widget HTML no matter what URL is accessed
const server = http.createServer((req, res) => {
  console.log(`Request for ${req.url} - serving widget HTML`);
  
  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Cache-Control': 'no-cache'
  });
  
  res.end(widgetHtml);
});

// Run on port 4000
server.listen(4000, () => {
  console.log('Server running at http://localhost:4000');
  console.log('ALL requests will serve the widget HTML');
});