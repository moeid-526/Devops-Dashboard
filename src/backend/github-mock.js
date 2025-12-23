// Mock GitHub pipelines for when API is unavailable
export const getMockPipelines = () => {
  const statuses = ["queued", "in_progress", "completed"];
  const conclusions = ["success", "failure", "cancelled", null];
  const workflowNames = [
    "CI/CD Pipeline",
    "Docker Build",
    "Test Suite",
    "Deploy to Production",
    "Security Scan",
    "Code Quality Check"
  ];
  
  const pipelines = [];
  const now = new Date();
  
  for (let i = 1; i <= 5; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const conclusion = status === "completed" 
      ? conclusions[Math.floor(Math.random() * (conclusions.length - 1))]
      : null;
    
    const createdAt = new Date(now.getTime() - (i * 3600000));
    const updatedAt = new Date(createdAt.getTime() + (Math.random() * 1800000));
    
    pipelines.push({
      id: 1000 + i,
      name: workflowNames[Math.floor(Math.random() * workflowNames.length)],
      status: status,
      conclusion: conclusion,
      created_at: createdAt.toISOString(),
      updated_at: updatedAt.toISOString(),
      html_url: `https://github.com/octocat/Hello-World/actions/runs/${1000 + i}`,
      branch: i % 2 === 0 ? "main" : "develop",
      commit: `abc${i}def`,
      actor: i % 2 === 0 ? "github-actions" : "developer"
    });
  }
  
  return pipelines;
};