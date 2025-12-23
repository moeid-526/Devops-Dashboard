import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes.js";
import axios from "axios";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// API routes
app.use("/api", routes);

// Root endpoint
app.get("/", (req, res) => {
    res.json({
        message: "🚀 DevOps Dashboard API",
        version: "1.0.0",
        description: "Centralized monitoring dashboard for DevOps workflows",
        endpoints: {
            dashboard: "/api/summary",
            github: "/api/github/pipelines",
            docker: {
                containers: "/api/docker/containers",
                logs: "/api/docker/logs",
                metrics: "/api/docker/metrics",
                alerts: "/api/docker/alerts",
                system: "/api/docker/system"
            },
            health: "/api/health"
        },
        connectedServices: {
            docker: "✅ Connected via Docker socket",
            github: process.env.GITHUB_TOKEN ? "✅ Connected" : "⚠️ Using mock data",
            grafana: process.env.GRAFANA_URL ? "✅ Configured" : "⚠️ Not configured",
            prometheus: process.env.PROMETHEUS_URL ? "✅ Configured" : "⚠️ Not configured"
        },
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("🚨 Server error:", err);
    res.status(500).json({
        error: "Internal server error",
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: "Endpoint not found",
        path: req.path,
        timestamp: new Date().toISOString(),
        availableEndpoints: [
            "/",
            "/api/health",
            "/api/summary",
            "/api/github/pipelines",
            "/api/docker/containers",
            "/api/docker/logs",
            "/api/docker/metrics",
            "/api/docker/alerts",
            "/api/docker/system"
        ]
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 DevOps Dashboard Backend Started`);
  console.log(`========================================`);
  console.log(`📊 API URL: http://localhost:${PORT}`);
  console.log(`🔌 Docker: Connected`);
  console.log(`🐙 GitHub: ${process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== 'mock_token_for_testing' ? '✅ Connected' : '⚠️ Using mock data'}`);
  console.log(`📈 Grafana: ${process.env.GRAFANA_URL || 'Not configured'}`);
  console.log(`⚡ Prometheus: ${process.env.PROMETHEUS_URL || 'Not configured'}`);
  console.log(`\n=== Debug Endpoints ===`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Prometheus Test: http://localhost:${PORT}/api/debug/prometheus`);
  console.log(`Grafana Test: http://localhost:${PORT}/api/debug/grafana`);
  console.log(`GitHub Test: http://localhost:${PORT}/api/debug/github`);
  console.log(`========================================\n`);
  
  // Test connections on startup
  testConnections();
});

// Function to test external connections
const testConnections = async () => {
  console.log("\n=== Testing External Connections ===");
  
  // Test Prometheus
  if (process.env.PROMETHEUS_URL) {
    try {
      const response = await axios.get(`${process.env.PROMETHEUS_URL}/api/v1/query?query=up`, { timeout: 3000 });
      console.log(`✅ Prometheus: Connected to ${process.env.PROMETHEUS_URL}`);
    } catch (error) {
      console.log(`❌ Prometheus: Cannot connect to ${process.env.PROMETHEUS_URL} - ${error.message}`);
    }
  }
  
  // Test Grafana
  if (process.env.GRAFANA_URL && process.env.GRAFANA_API_KEY) {
    try {
      const response = await axios.get(`${process.env.GRAFANA_URL}/api/health`, {
        headers: { 'Authorization': `Bearer ${process.env.GRAFANA_API_KEY}` },
        timeout: 3000
      });
      console.log(`✅ Grafana: Connected to ${process.env.GRAFANA_URL}`);
    } catch (error) {
      console.log(`❌ Grafana: Cannot connect to ${process.env.GRAFANA_URL} - ${error.message}`);
    }
  }
  
  // Test GitHub
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== 'mock_token_for_testing') {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` },
        timeout: 3000
      });
      console.log(`✅ GitHub: Authenticated as ${response.data.login}`);
    } catch (error) {
      console.log(`❌ GitHub: Authentication failed - ${error.message}`);
    }
  }
  
  console.log("=== Connection Tests Complete ===\n");
};




