import { useEffect, useState } from "react";
import axios from "axios";

const Dashboard = () => {
  const [pipelines, setPipelines] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/api/github/pipelines")
      .then(res => setPipelines(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>🚀 DevOps Dashboard</h2>

      <h3>Pipeline Status</h3>
      {pipelines.map(pipe => (
        <div key={pipe.id} style={{
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "10px"
        }}>
          <p><b>Name:</b> {pipe.name}</p>
          <p><b>Status:</b> {pipe.status}</p>
          <p><b>Result:</b> {pipe.conclusion || "Running"}</p>
        </div>
      ))}

      <h3>Container Status</h3>
      <p>Docker containers status will appear here</p>

      <h3>Logs</h3>
      <p>Application logs will appear here</p>

      <h3>Metrics</h3>
      <p>CPU & Memory metrics from Grafana</p>

      <h3>Alerts</h3>
      <p>Active alerts from Grafana</p>
    </div>
  );
};

export default Dashboard;
