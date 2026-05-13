import { checkSimilarityWithPythonServer, saveSimilarityResults } from "./similarity.service.js";

export const runSimilarityCheckInBackground = async (projectId, projectData) => {
  try {
    console.log(`Starting similarity check for project: ${projectId}`);
    
    // Prepare data for Python server
    const searchPayload = {
      title: projectData.title,
      introduction: projectData.introduction || "",
      actionPlan: projectData.actionPlan || "",
      expectedOutcome: projectData.expectedOutcome || "",
      objectives: projectData.objectives || []
    };
    
    // Call Python similarity server
    const similarityResults = await checkSimilarityWithPythonServer(searchPayload);
    
    if (similarityResults && similarityResults.results) {
      // Save results to database
      await saveSimilarityResults(projectId, similarityResults);
      console.log(`Similarity check completed for project: ${projectId}`);
      return similarityResults;
    } else {
      console.log(`No similarity results for project: ${projectId}`);
      return null;
    }
    
  } catch (error) {
    console.error(`Background similarity check failed for project ${projectId}:`, error.message);
    return null;
  }
};