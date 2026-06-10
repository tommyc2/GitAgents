import { runAgent } from "../agents/runAgent.js";
import { generateDependencyReview } from "../agents/dependencyReview.js";
import { runFeedbackAgent } from "../agents/feedbackAgent.js";
import { FileData } from "../types/index.js";

// Runs the dependency review agent over the changed manifest files and posts the
// feedback-agent-verified result as a review. Moved from handlers/onManifestChange.ts
// so all review business logic lives under core/ and stays transport-agnostic.
export async function runManifestReview(config, octokit, owner, repo, pullNumber, commitId, manifestFileData: FileData[]) {

    console.log("Package manifest files: ", manifestFileData);

    const dependencyReviewResponse = await runAgent(config, octokit, owner, repo, pullNumber, commitId, manifestFileData, generateDependencyReview);

    console.log(" ----- Dependency Review ------\n", dependencyReviewResponse);

    const finalReview = await runFeedbackAgent(config, owner, repo, pullNumber, commitId, manifestFileData, dependencyReviewResponse);

    if (!finalReview?.event) {
        console.warn("Dependency review produced no usable result; skipping post.");
        return;
    }

    await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews', finalReview);

}
