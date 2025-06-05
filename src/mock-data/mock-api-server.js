/* eslint-disable */
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mockData = require("./index");

const app = express();
const PORT = process.env.MOCK_API_PORT || 4000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Helper to handle all API requests
function handleMockRequest(req, res) {
  const endpoint = req.path;
  const method = req.method.toLowerCase();
  const options = {
    ...req.query,
    ...req.body,
    method,
    url: req.originalUrl,
    headers: req.headers,
  };
  try {
    const data = mockData.get(endpoint, options);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Mock API error", details: err.message });
  }
}

// Handle all GET/POST requests to /api/v1/*
app.get("/api/v1/*", handleMockRequest);
app.post("/api/v1/*", handleMockRequest);
app.put("/api/v1/*", handleMockRequest);
app.delete("/api/v1/*", handleMockRequest);

app.get("/", (req, res) => {
  res.send("Mock API server is running.");
});

app.listen(PORT, () => {
  console.log(`Mock API server running at http://localhost:${PORT}`);
});
