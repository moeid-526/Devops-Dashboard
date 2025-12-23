import axios from "axios";
import { getMockPipelines } from "./github-mock.js";

export const getPipelines = async (req, res) => {
  try {
    // Use YOUR repository
    const repo = "moeid-526/Devops-Dashboard";
    const token = process.env.GITHUB_TOKEN;
    
    const headers = {
      'User-Agent': 'DevOps-Dashboard',
      'Accept': 'application/vnd.github.v3+json'
    };
    
    // Add token if available
    if (token && token !== 'mock_token_for_testing') {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await axios.get(
      `https://api.github.com/repos/${repo}/actions/runs?per_page=5`,
      { headers }
    );

    console.log(`GitHub API: Found ${response.data.workflow_runs?.length || 0} pipeline runs`);

    const pipelines = response.data.workflow_runs.map(run => ({
      id: run.id,
      name: run.name || run.workflow_id || "Unnamed Workflow",
      status: run.status,
      conclusion: run.conclusion || "pending",
      created_at: run.created_at,
      updated_at: run.updated_at,
      html_url: run.html_url,
      branch: run.head_branch || "main",
      commit: run.head_sha ? run.head_sha.substring(0, 7) : "N/A",
      actor: run.actor?.login || "Unknown"
    }));

    res.json({
      success: true,
      pipelines: pipelines,
      total: response.data.total_count || 0,
      repo: repo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("GitHub API Error:", error.message);
    console.log("Status:", error.response?.status);
    console.log("Response:", error.response?.data);
    
    // Fallback to mock data
    console.log("Using mock pipeline data");
    const mockPipelines = getMockPipelines();
    res.json({
      success: false,
      pipelines: mockPipelines,
      total: mockPipelines.length,
      repo: "moeid-526/Devops-Dashboard",
      timestamp: new Date().toISOString(),
      note: "Using mock data - GitHub API unavailable"
    });
  }
};