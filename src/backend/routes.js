import express from "express";
import { getPipelines } from "./github.js";
import { 
    getContainers, 
    getLogs, 
    getDockerStats, 
    getPrometheusMetrics, 
    getGrafanaAlerts,
    getSystemInfo 
} from "./docker.js";
import axios from "axios";

const router = express.Router();

// GitHub Routes
router.get("/github/pipelines", getPipelines);

// Docker Routes - Use Docker stats as PRIMARY metrics source
router.get("/docker/containers", getContainers);
router.get("/docker/logs", getLogs);
router.get("/docker/metrics", getDockerStats); // PRIMARY: Use Docker stats
router.get("/docker/stats", getDockerStats); // Alternative endpoint
router.get("/docker/prometheus-metrics", getPrometheusMetrics); // For testing only
router.get("/docker/alerts", getGrafanaAlerts);
router.get("/docker/system", getSystemInfo);

// Health and Info
router.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        service: "DevOps Dashboard API",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        endpoints: [
            "/api/github/pipelines",
            "/api/docker/containers",
            "/api/docker/logs",
            "/api/docker/metrics",
            "/api/docker/alerts",
            "/api/docker/system"
        ],
        connectedServices: {
            docker: "connected",
            github: process.env.GITHUB_TOKEN ? "connected" : "mock",
            grafana: process.env.GRAFANA_URL ? "configured" : "not configured",
            prometheus: process.env.PROMETHEUS_URL ? "configured" : "not configured"
        }
    });
});

// Dashboard summary
// Dashboard summary - FIXED VERSION
router.get("/summary", async (req, res) => {
  try {
    // Create a mock response wrapper to prevent headers sent error
    const createMockRes = () => ({
      json: (data) => data
    });

    // Get data from each endpoint
    const containersPromise = getContainers(req, createMockRes()).catch(() => ({ containers: [] }));
    const alertsPromise = getGrafanaAlerts(req, createMockRes()).catch(() => ({ alerts: [] }));
    const systemInfoPromise = getSystemInfo(req, createMockRes()).catch(() => ({}));

    const [containersResult, alertsResult, systemInfoResult] = await Promise.all([
      containersPromise,
      alertsPromise,
      systemInfoPromise
    ]);

    // Send ONE response
    res.json({
      success: true,
      summary: {
        containers: {
          total: containersResult.containers?.length || 0,
          running: containersResult.containers?.filter(c => c.isRunning).length || 0,
          stopped: containersResult.containers?.filter(c => !c.isRunning).length || 0
        },
        alerts: {
          total: alertsResult.alerts?.length || 0,
          critical: alertsResult.alerts?.filter(a => a.severity === "critical").length || 0,
          warning: alertsResult.alerts?.filter(a => a.severity === "warning").length || 0
        },
        system: systemInfoResult.docker || {},
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Summary error:", error.message);
    // Send ONE error response
    res.json({
      success: false,
      summary: {
        containers: { total: 0, running: 0, stopped: 0 },
        alerts: { total: 0, critical: 0, warning: 0 },
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Debug endpoints
router.get("/debug/prometheus", async (req, res) => {
  try {
    const prometheusURL = process.env.PROMETHEUS_URL || "http://host.docker.internal:9090";
    console.log(`Debug: Testing Prometheus connection to ${prometheusURL}`);
    
    const response = await axios.get(`${prometheusURL}/api/v1/query?query=up`, { timeout: 5000 });
    
    res.json({
      success: true,
      prometheusUrl: prometheusURL,
      status: response.data.status,
      data: response.data.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      prometheusUrl: prometheusURL,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get("/debug/grafana", async (req, res) => {
  try {
    const grafanaURL = process.env.GRAFANA_URL || "http://localhost:3000";
    const apiKey = process.env.GRAFANA_API_KEY;
    
    console.log(`Debug: Testing Grafana connection to ${grafanaURL}`);
    
    if (!apiKey) {
      return res.json({
        success: false,
        message: "GRAFANA_API_KEY not configured",
        timestamp: new Date().toISOString()
      });
    }
    
    const response = await axios.get(`${grafanaURL}/api/health`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 5000
    });
    
    res.json({
      success: true,
      grafanaUrl: grafanaURL,
      status: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      grafanaUrl: grafanaURL,
      error: error.message,
      response: error.response?.data,
      timestamp: new Date().toISOString()
    });
  }
});

router.get("/debug/github", async (req, res) => {
  try {
    const token = process.env.GITHUB_TOKEN;
    const repo = "moeid-526/Devops-Dashboard";
    
    console.log(`Debug: Testing GitHub API for repo ${repo}`);
    
    const headers = {
      'User-Agent': 'DevOps-Dashboard',
      'Accept': 'application/vnd.github.v3+json'
    };
    
    if (token && token !== 'mock_token_for_testing') {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await axios.get(
      `https://api.github.com/repos/${repo}/actions/runs?per_page=1`,
      { headers, timeout: 5000 }
    );
    
    res.json({
      success: true,
      repo: repo,
      totalRuns: response.data.total_count,
      hasToken: !!(token && token !== 'mock_token_for_testing'),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      status: error.response?.status,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;