import axios from "axios";

export const getPipelines = async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/moeid-526/Devops-Dashboard/actions/runs`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      }
    );

    const pipelines = response.data.workflow_runs.map(run => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      created_at: run.created_at,
    }));

    res.json(pipelines);
  } catch (error) {
    res.status(500).json({ error: "GitHub API Error" });
  }
};
