import { useEffect, useState } from "react";
import axios from "axios";
import "./Dashboard.css";

const Dashboard = () => {
  const [stats, setStats] = useState({ containers: 0, runningContainers: 0, pipelines: 0 });
  const [pipelines, setPipelines] = useState([]);
  const [containers, setContainers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState("");
  const [loading, setLoading] = useState({
    stats: true,
    pipelines: true,
    containers: true,
    logs: true,
    metrics: true,
    alerts: true
  });

  // Use Docker service name for backend
  const API_BASE = "http://localhost:5000";

  const fetchAllData = async () => {
    console.log("Fetching data from:", API_BASE);
    
    try {
      // Fetch containers directly (bypass summary endpoint error)
      axios.get(`${API_BASE}/api/docker/containers`)
        .then(res => {
          if (res.data.success && res.data.containers) {
            const running = res.data.containers.filter(c => c.isRunning).length;
            const total = res.data.containers.length;
            setContainers(res.data.containers || []);
            setStats(prev => ({
              ...prev,
              containers: total,
              runningContainers: running
            }));
          }
          setLoading(prev => ({ ...prev, containers: false, stats: false }));
        })
        .catch(err => {
          console.error("Error fetching containers:", err);
          setLoading(prev => ({ ...prev, containers: false, stats: false }));
        });

      // Fetch pipelines
      axios.get(`${API_BASE}/api/github/pipelines`)
        .then(res => {
          const pipelineData = res.data.pipelines || [];
          setPipelines(pipelineData);
          
          // Count active pipelines (in_progress, queued, pending)
          const activePipelines = pipelineData.filter(p => 
            p.status === "in_progress" || 
            p.status === "queued" || 
            p.status === "pending" ||
            (p.status === "completed" && p.conclusion === "in_progress")
          ).length;
          
          setStats(prev => ({
            ...prev,
            pipelines: activePipelines
          }));
          setLoading(prev => ({ ...prev, pipelines: false }));
        })
        .catch(err => {
          console.error("Error fetching pipelines:", err);
          setLoading(prev => ({ ...prev, pipelines: false }));
        });

      // Fetch logs
      const logsUrl = selectedContainer 
        ? `${API_BASE}/api/docker/logs?name=${selectedContainer}&lines=30`
        : `${API_BASE}/api/docker/logs?lines=20`;
      
      axios.get(logsUrl)
        .then(res => {
          setLogs(res.data.logs || []);
          setLoading(prev => ({ ...prev, logs: false }));
        })
        .catch(err => {
          console.error("Error fetching logs:", err);
          setLoading(prev => ({ ...prev, logs: false }));
        });

      // Fetch metrics
      axios.get(`${API_BASE}/api/docker/metrics`)
        .then(res => {
          setMetrics(res.data.metrics || []);
          setLoading(prev => ({ ...prev, metrics: false }));
        })
        .catch(err => {
          console.error("Error fetching metrics:", err);
          setLoading(prev => ({ ...prev, metrics: false }));
        });

      // Fetch alerts
      axios.get(`${API_BASE}/api/docker/alerts`)
        .then(res => {
          setAlerts(res.data.alerts || []);
          setLoading(prev => ({ ...prev, alerts: false }));
        })
        .catch(err => {
          console.error("Error fetching alerts:", err);
          setLoading(prev => ({ ...prev, alerts: false }));
        });

    } catch (error) {
      console.error("Error in fetchAllData:", error);
    }
  };

  useEffect(() => {
    fetchAllData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [selectedContainer]);

  const getStatusColor = (status) => {
    if (status === "success" || status?.includes("Up")) return "green";
    if (status === "failure" || status === "cancelled") return "red";
    if (status === "in_progress" || status === "queued") return "orange";
    return "gray";
  };

  const getStatusText = (status, conclusion) => {
    if (status?.includes("Up")) return "Running";
    if (status === "completed") return conclusion === "success" ? "Success" : "Failed";
    if (status === "in_progress") return "In Progress";
    if (status === "queued") return "Queued";
    return status || "Unknown";
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="header">
        <h1>🚀 DevOps Dashboard</h1>
        <div className="stats-bar">
          <div className="stat-card">
            <span className="stat-label">Containers</span>
            <span className="stat-value">{stats.containers}</span>
            <span className="stat-sub">({stats.runningContainers} running)</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Pipelines</span>
            <span className="stat-value">{stats.pipelines}</span>
            <span className="stat-sub">active</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Last Updated</span>
            <span className="stat-value">{new Date().toLocaleTimeString()}</span>
            <button onClick={fetchAllData} className="refresh-btn">🔄 Refresh</button>
          </div>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* Pipeline Status */}
        <div className="card pipeline-card">
          <h2>📋 Pipeline Status ({pipelines.length} total)</h2>
          {loading.pipelines ? (
            <div className="loading">Loading pipelines...</div>
          ) : pipelines.length > 0 ? (
            <div className="pipeline-list">
              {pipelines.map((pipe) => (
                <div key={pipe.id} className="pipeline-item">
                  <div className="pipeline-header">
                    <span className="pipeline-name">{pipe.name}</span>
                    <span className={`status-badge status-${getStatusColor(pipe.conclusion || pipe.status)}`}>
                      {getStatusText(pipe.status, pipe.conclusion)}
                    </span>
                  </div>
                  <div className="pipeline-details">
                    <span>Branch: {pipe.branch}</span>
                    <span>Commit: {pipe.commit}</span>
                    <span>{new Date(pipe.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No pipeline data available</div>
          )}
        </div>

        {/* Container Status */}
        <div className="card container-card">
          <h2>🐳 Container Status ({containers.length} total)</h2>
          {loading.containers ? (
            <div className="loading">Loading containers...</div>
          ) : containers.length > 0 ? (
            <div className="container-list">
              <div className="container-filter">
                <select 
                  value={selectedContainer} 
                  onChange={(e) => setSelectedContainer(e.target.value)}
                  className="container-select"
                >
                  <option value="">All Containers</option>
                  {containers.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              {containers.map((c) => (
                <div key={c.name} className="container-item">
                  <div className="container-info">
                    <span className="container-name">{c.name}</span>
                    <span className="container-image">{c.image}</span>
                  </div>
                  <div className="container-status">
                    <span className={`status-dot ${c.isRunning ? 'running' : 'stopped'}`}></span>
                    <span>{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No running containers</div>
          )}
        </div>

        {/* Metrics */}
        <div className="card metrics-card">
          <h2>📊 Container Metrics ({metrics.length} containers)</h2>
          {loading.metrics ? (
            <div className="loading">Loading metrics...</div>
          ) : metrics.length > 0 ? (
            <div className="metrics-list">
              {metrics.map((m, i) => (
                <div key={i} className="metric-item">
                  <span className="metric-name">{m.name}</span>
                  <div className="metric-bars">
                    <div className="metric-bar">
                      <div className="metric-label">CPU</div>
                      <div className="bar-container">
                        <div 
                          className="bar cpu-bar" 
                          style={{ width: `${Math.min(m.cpu, 100)}%` }}
                        ></div>
                        <span className="bar-value">{m.cpu.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="metric-bar">
                      <div className="metric-label">Memory</div>
                      <div className="bar-container">
                        <div 
                          className="bar memory-bar" 
                          style={{ width: `${Math.min(m.memory, 100)}%` }}
                        ></div>
                        <span className="bar-value">{m.memory.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No metrics available</div>
          )}
        </div>

        {/* Logs */}
        <div className="card logs-card">
          <h2>📝 Container Logs {selectedContainer && `- ${selectedContainer}`}</h2>
          {loading.logs ? (
            <div className="loading">Loading logs...</div>
          ) : logs.length > 0 ? (
            <div className="logs-container">
              {logs.map((log, i) => (
                <div key={i} className="log-entry">
                  <div className="log-header">
                    <span className="log-container">{log.name}</span>
                    <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <pre className={`log-content ${log.error ? 'error-log' : ''}`}>
                    {log.logs || "No logs available"}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No logs available</div>
          )}
        </div>

        {/* Alerts Section */}
        <div className="card alerts-card">
          <h2>🚨 Alerts & Notifications</h2>
          <div className="alerts-list">
            {metrics.filter(m => m.cpu > 80).map((m, i) => (
              <div key={i} className="alert-item alert-warning">
                ⚠️ High CPU usage on {m.name} ({m.cpu.toFixed(1)}%)
              </div>
            ))}
            {metrics.filter(m => m.memory > 80).map((m, i) => (
              <div key={i} className="alert-item alert-critical">
                🔥 High Memory usage on {m.name} ({m.memory.toFixed(1)}%)
              </div>
            ))}
            {containers.filter(c => !c.isRunning).map((c, i) => (
              <div key={i} className="alert-item alert-info">
                ℹ️ Container {c.name} is stopped
              </div>
            ))}
            {pipelines.filter(p => p.conclusion === "failure").map((p, i) => (
              <div key={i} className="alert-item alert-critical">
                ❌ Pipeline failed: {p.name}
              </div>
            ))}
            {pipelines.filter(p => p.conclusion === "success").map((p, i) => (
              <div key={i} className="alert-item alert-success">
                ✅ Pipeline succeeded: {p.name}
              </div>
            ))}
            {alerts.length === 0 && metrics.length === 0 && containers.length === 0 && pipelines.length === 0 && (
              <div className="no-alerts">No alerts to display</div>
            )}
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>DevOps Dashboard v1.0 • Monitoring {stats.containers} containers • Auto-refresh every 30s</p>
        <p>Backend: http://localhost:5000 • Frontend: http://localhost:5173 • Grafana: http://localhost:3000</p>
      </footer>
    </div>
  );
};

export default Dashboard;