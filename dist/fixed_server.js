const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 4000;

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Handle specific Next.js error paths
app.use((req, res, next) => {
  // Check if the request is for a Next.js page or module
  if (req.url.includes('/src/app/') || 
      req.url.includes('jsx-dev-runtime') || 
      req.url.includes('/_next/')) {
    console.log(`Intercepting Next.js request: ${req.url}`);
    return res.redirect('/full-widget.html');
  }
  next();
});

// Serve static files from the current directory
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    // Set correct content types
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Redirect / to full-widget.html directly
app.get('/', (req, res) => {
  res.redirect('/full-widget.html');
});

// Special handling for full-widget.html
app.get('/full-widget.html', (req, res) => {
  const filePath = path.join(__dirname, 'full-widget.html');
  
  // Check if file exists
  if (fs.existsSync(filePath)) {
    console.log(`Serving file: ${filePath}`);
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Set response headers
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Send response
    res.send(content);
  } else {
    console.error(`File not found: ${filePath}`);
    res.status(404).send('File not found. Please check the path.');
  }
});

// Catch-all route for any path that includes 'react' to return a helpful error
app.use('/react', (req, res) => {
  res.status(200).send(`
    <html>
      <head>
        <title>React Module Redirecting</title>
        <meta http-equiv="refresh" content="0;url=/full-widget.html">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
        </style>
      </head>
      <body>
        <h1>Redirecting to Full Widget</h1>
        <p>You are being redirected to the full widget demo...</p>
        <script>
          window.location.href = "/full-widget.html";
        </script>
      </body>
    </html>
  `);
});

// Custom 404 handler that redirects to full-widget
app.use((req, res) => {
  console.log(`404 Fallback: ${req.url} - redirecting to full widget`);
  res.redirect('/full-widget.html');
});

// Start the server
app.listen(PORT, () => {
  console.log(`
============================================
  Server running at http://localhost:${PORT}
  Serving files from: ${__dirname}
  
  Available files:
  ${fs.readdirSync(__dirname).map(file => `  - ${file}`).join('\n')}
  
  Access the widget at: http://localhost:${PORT}/full-widget.html
  
  NOTE: All paths will now redirect to the widget
============================================
  `);
});