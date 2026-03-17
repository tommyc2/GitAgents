import { runAgent } from "../agents/runAgent.js";
import { generateDependencyReview } from "../agents/dependencyReview.js";
interface FileData {
    data: any; // raw file data from GitHub API
    content: any; // content of the file
}

export async function onManifestChange(config, octokit, owner, repo, pullNumber, commitId, manifestFileData: FileData[]) {

    console.log("Package manifest files: ", manifestFileData);

    const dependencyReviewResponse = await runAgent(config, octokit, owner, repo, pullNumber, commitId, manifestFileData, generateDependencyReview);

    console.log(" ----- Dependency Review ------\n", dependencyReviewResponse);

    await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews', dependencyReviewResponse);

}
