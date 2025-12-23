import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";

const execAsync = promisify(exec);

// Helper function to parse memory strings to MB
function parseMemoryToMB(memoryStr) {
  if (!memoryStr) return 0;
  
  const match = memoryStr.match(/^([\d.]+)([KMGT]?i?B)$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  switch (unit) {
    case 'B': return value / 1024 / 1024;
    case 'KB': case 'KIB': return value / 1024;
    case 'MB': case 'MIB': return value;
    case 'GB': case 'GIB': return value * 1024;
    case 'TB': case 'TIB': return value * 1024 * 1024;
    default: return value;
  }
}

// Get running containers
export const getContainers = async (req, res) => {
    try {
        const { stdout } = await execAsync('docker ps --format "{{.Names}}:::{{.Status}}:::{{.Image}}:::{{.Ports}}"');
        
        const containers = stdout
            .trim()
            .split("\n")
            .filter(line => line.trim() !== "")
            .map(line => {
                const [name, status, image, ports] = line.split(":::");
                return { 
                    id: `container_${Date.now()}_${Math.random()}`,
                    name, 
                    status: status || "Unknown",
                    image: image || "Unknown",
                    ports: ports || "N/A",
                    isRunning: status?.includes("Up") || false,
                    health: status?.includes("healthy") ? "healthy" : 
                           status?.includes("unhealthy") ? "unhealthy" : "unknown"
                };
            });

        res.json({
            success: true,
            containers: containers,
            total: containers.length,
            running: containers.filter(c => c.isRunning).length,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error("Docker error:", err.message);
        res.json({ 
            success: false,
            error: "Docker not accessible", 
            containers: [],
            total: 0,
            running: 0,
            timestamp: new Date().toISOString()
        });
    }
};

// Get container logs
export const getLogs = async (req, res) => {
    const containerName = req.query.name;
    const lines = req.query.lines || 50;

    try {
        let containers = [];
        
        if (containerName) {
            containers = [containerName];
        } else {
            const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
            containers = stdout.trim().split("\n").filter(name => name.trim() !== "");
        }

        if (containers.length === 0) {
            return res.json({
                success: true,
                logs: [],
                total: 0,
                timestamp: new Date().toISOString()
            });
        }

        const logsPromises = containers.map(async (name) => {
            try {
                const { stdout } = await execAsync(`docker logs --tail ${lines} ${name} 2>&1`);
                return { 
                    id: `log_${Date.now()}_${Math.random()}`,
                    name, 
                    logs: stdout.substring(0, 5000), // Limit to 5k chars
                    hasMore: stdout.length > 5000,
                    timestamp: new Date().toISOString(),
                    error: false
                };
            } catch (err) {
                return { 
                    id: `log_${Date.now()}_${Math.random()}`,
                    name, 
                    logs: `Error fetching logs: ${err.message.substring(0, 200)}`,
                    timestamp: new Date().toISOString(),
                    error: true
                };
            }
        });

        const results = await Promise.all(logsPromises);
        res.json({
            success: true,
            logs: results,
            total: results.length,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error("Logs error:", err.message);
        res.json({ 
            success: false,
            error: "Failed to fetch logs",
            logs: [],
            total: 0,
            timestamp: new Date().toISOString()
        });
    }
};

// Get Docker metrics using docker stats (PRIMARY METRICS SOURCE)
export const getDockerStats = async (req, res) => {
    try {
        const { stdout } = await execAsync('docker stats --no-stream --format "{{.Name}}::{{.CPUPerc}}::{{.MemPerc}}::{{.MemUsage}}::{{.NetIO}}::{{.BlockIO}}"');
        
        const metrics = stdout
            .trim()
            .split("\n")
            .filter(line => line.trim() !== "" && !line.includes('CONTAINER'))
            .map(line => {
                const [name, cpuPerc, memPerc, memUsage, netIO, blockIO] = line.split("::");
                
                // Parse memory usage string (e.g., "10.5MiB / 1.945GiB")
                let usedMemMB = 0;
                let totalMemMB = 0;
                if (memUsage) {
                    const [usedStr, totalStr] = memUsage.split(' / ');
                    usedMemMB = parseMemoryToMB(usedStr);
                    totalMemMB = parseMemoryToMB(totalStr);
                }
                
                return {
                    id: `metric_${Date.now()}_${Math.random()}`,
                    name: name?.trim() || "Unknown",
                    cpu: parseFloat(cpuPerc?.replace('%', '') || 0),
                    memory: parseFloat(memPerc?.replace('%', '') || 0),
                    memoryUsage: memUsage?.trim() || "0B",
                    usedMemoryMB: usedMemMB,
                    totalMemoryMB: totalMemMB,
                    networkIO: netIO?.trim() || "0B",
                    diskIO: blockIO?.trim() || "0B",
                    timestamp: new Date().toISOString()
                };
            });

        res.json({
            success: true,
            source: "docker-stats",
            metrics: metrics,
            totalContainers: metrics.length,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error("Docker stats error:", err.message);
        res.json({
            success: false,
            source: "docker-stats",
            metrics: [],
            totalContainers: 0,
            error: "Could not fetch Docker stats",
            timestamp: new Date().toISOString()
        });
    }
};

// Get Prometheus metrics (Windows Docker Desktop workaround - uses Docker stats)
export const getPrometheusMetrics = async (req, res) => {
  try {
    const prometheusURL = process.env.PROMETHEUS_URL || "http://localhost:9090";
    console.log(`Using Docker stats for metrics (cAdvisor limited on Windows)`);
    
    // Always use Docker stats on Windows Docker Desktop
    return await getDockerStats(req, res);

  } catch (err) {
    console.error("Prometheus metrics error:", err.message);
    console.log("Falling back to Docker stats");
    return await getDockerStats(req, res);
  }
};

// Get Grafana alerts with better debugging
export const getGrafanaAlerts = async (req, res) => {
  try {
    const grafanaURL = process.env.GRAFANA_URL || "http://localhost:3000";
    const apiKey = process.env.GRAFANA_API_KEY;
    
    console.log(`Fetching Grafana alerts from: ${grafanaURL}`);
    console.log(`API Key configured: ${apiKey ? 'Yes' : 'No'}`);
    
    if (!apiKey || apiKey.includes('your_grafana_api_key_here')) {
      console.log("No valid Grafana API key configured");
      return await generateMockAlerts(res);
    }

    const endpoints = [
      `${grafanaURL}/api/alertmanager/grafana/api/v2/alerts`,
      `${grafanaURL}/api/alerts`,
      `${grafanaURL}/api/v1/alerts`
    ];

    let response = null;
    let endpointUsed = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        response = await axios.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        endpointUsed = endpoint;
        console.log(`Success with endpoint: ${endpoint}`);
        break;
      } catch (err) {
        console.log(`Failed with endpoint ${endpoint}: ${err.message}`);
      }
    }

    if (!response) {
      console.log("All Grafana endpoints failed, using mock alerts");
      return await generateMockAlerts(res);
    }

    const alertsData = Array.isArray(response.data) ? response.data : response.data.alerts || response.data.data || [];
    
    const alerts = alertsData.map(alert => ({
      id: alert.fingerprint || alert.id || `alert_${Date.now()}_${Math.random()}`,
      name: alert.labels?.alertname || alert.annotations?.summary || "Unknown Alert",
      status: alert.status?.state || alert.state || "unknown",
      severity: alert.labels?.severity || alert.annotations?.severity || "warning",
      description: alert.annotations?.description || alert.annotations?.message || alert.labels?.alertname,
      startsAt: alert.startsAt || alert.activeAt,
      endsAt: alert.endsAt,
      generatorURL: alert.generatorURL,
      labels: alert.labels
    }));

    console.log(`Found ${alerts.length} Grafana alerts`);
    
    return res.json({
      success: true,
      alerts: alerts,
      total: alerts.length,
      source: "grafana",
      endpoint: endpointUsed,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Grafana alerts error:", err.message);
    console.log("Using mock alerts due to error");
    return await generateMockAlerts(res);
  }
};

// Helper function for mock alerts
const generateMockAlerts = async (res) => {
  const mockAlerts = [
    {
      id: "alert_1",
      name: "High CPU Usage",
      status: "firing",
      severity: "warning",
      description: "CPU usage above 80% for container 'devops-backend'",
      startsAt: new Date(Date.now() - 300000).toISOString(),
      endsAt: null,
      generatorURL: "#"
    },
    {
      id: "alert_2",
      name: "Memory Pressure",
      status: "pending",
      severity: "critical",
      description: "Memory usage above 90% for container 'devops-frontend'",
      startsAt: new Date(Date.now() - 60000).toISOString(),
      endsAt: null,
      generatorURL: "#"
    },
    {
      id: "alert_3",
      name: "Container Restart",
      status: "resolved",
      severity: "info",
      description: "Container 'cadvisor' restarted 3 times in last hour",
      startsAt: new Date(Date.now() - 3600000).toISOString(),
      endsAt: new Date(Date.now() - 1800000).toISOString(),
      generatorURL: "#"
    }
  ];

  return res.json({
    success: false,
    alerts: mockAlerts,
    total: mockAlerts.length,
    message: "Using mock alerts - Grafana API unavailable",
    timestamp: new Date().toISOString()
  });
};

// Get Docker system info
export const getSystemInfo = async (req, res) => {
    try {
        const [version, info, dockerPs] = await Promise.all([
            execAsync('docker version --format "{{.Server.Version}}"'),
            execAsync('docker info --format "{{.ServerVersion}}::{{.Containers}}::{{.ContainersRunning}}::{{.ContainersPaused}}::{{.ContainersStopped}}"'),
            execAsync('docker ps -q | wc -l')
        ]);

        const [serverVersion, containers, running, paused, stopped] = info.stdout.trim().split("::");

        res.json({
            success: true,
            docker: {
                version: version.stdout.trim() || "Unknown",
                serverVersion: serverVersion || "Unknown",
                apiVersion: "1.45"
            },
            containers: {
                total: parseInt(containers) || 0,
                running: parseInt(running) || 0,
                paused: parseInt(paused) || 0,
                stopped: parseInt(stopped) || 0,
                active: parseInt(dockerPs.stdout.trim()) || 0
            },
            system: {
                hostname: process.env.HOSTNAME || "localhost",
                nodeEnv: process.env.NODE_ENV || "development",
                timestamp: new Date().toISOString()
            },
            services: {
                grafana: process.env.GRAFANA_URL || "Not configured",
                prometheus: process.env.PROMETHEUS_URL || "Not configured",
                github: process.env.GITHUB_TOKEN ? "Connected" : "Not configured"
            }
        });
    } catch (err) {
        console.error("System info error:", err.message);
        res.json({
            success: false,
            error: "Could not fetch system info",
            timestamp: new Date().toISOString()
        });
    }
};