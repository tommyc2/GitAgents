import { generateDependencyReview } from "../agents/dependencyReview.js";

//TODO: Create separate types file for this
interface FileData {
    data: any; // raw file data from GitHub API
    content: any; // content of the file
}

export async function onManifestChange(octokit, owner, repo, pullNumber,commitId, manifestFileData: FileData[]) {

    console.log("Package manifest files: ", manifestFileData);

    const dependencyReviewResponse = await generateDependencyReview(owner, repo, pullNumber, commitId, manifestFileData);

    console.log(" ----- Dependency Review ------\n", dependencyReviewResponse);

    await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews', dependencyReviewResponse);

}
