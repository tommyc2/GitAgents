import { runAgent } from "../agents/runAgent.js";
import { generateDependencyReview } from "../agents/dependencyReview.js";
import { runFeedbackAgent } from "../agents/feedbackAgent.js";
import { FileData } from "../types/index.js";

export async function onManifestChange(config, octokit, owner, repo, pullNumber, commitId, manifestFileData: FileData[]) {

    console.log("Package manifest files: ", manifestFileData);

    const dependencyReviewResponse = await runAgent(config, octokit, owner, repo, pullNumber, commitId, manifestFileData, generateDependencyReview);

    console.log(" ----- Dependency Review ------\n", dependencyReviewResponse);

    const finalReview = await runFeedbackAgent(config, owner, repo, pullNumber, commitId, manifestFileData, dependencyReviewResponse);

    await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews', finalReview);

}
