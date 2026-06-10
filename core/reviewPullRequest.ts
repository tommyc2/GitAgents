import { runAgent } from "../agents/runAgent.js";
import { generateCodeReview } from "../agents/codeReview.js";
import { runFeedbackAgent } from "../agents/feedbackAgent.js";
import { FileData, YAMLConfig, ReviewIdentifiers } from "../types/index.js";
import { loadPullRequestFiles } from "./loadPullRequestFiles.js";
import { runManifestReview } from "./runManifestReview.js";
import { filesReviewedSection } from "../utils/utils.js";

// Core review pipeline, decoupled from webhook/Action arrival semantics. Callers
// resolve the PR identifiers and the YAML config, then hand off here. Takes any
// token-authenticated octokit, so it serves both the App and the Action.
export async function reviewPullRequest(octokit, config: YAMLConfig, ids: ReviewIdentifiers) {
    const { owner, repo, pullNumber, commitId } = ids;

    const files: FileData[] = await loadPullRequestFiles(octokit, owner, repo, pullNumber, commitId, config.code_review?.ignore_patterns);
    console.log("---- Files ----\n", files);

    //////// Dependency Checker /////////////////////////

    const userRepoManifestFileData: FileData[] = [];

    for (const file of files) {
        if (config.dependency_review?.manifest_files?.includes(file.data.filename)) {
            console.log("Package manifest file found: ", file.data.filename);
            userRepoManifestFileData.push(file);
        }
    }

    if (!config.dependency_review) {
        console.log(`Dependency review is not configured`);
    }
    else if (!config.dependency_review.enabled) {
        console.log(`Dependency review is disabled, skipping...`);
    }

    if (config.dependency_review?.enabled && userRepoManifestFileData.length > 0) {
        await runManifestReview(config, octokit, owner, repo, pullNumber, commitId, userRepoManifestFileData);
    }
    ///////////////////////////////////////////////////

    // Initial review by primary agent (draft review)
    const codeReviewResponse = await runAgent(config, octokit, owner, repo, pullNumber, commitId, files, generateCodeReview);

    // Feedback review by feedback agent (final review)
    const finalReview = await runFeedbackAgent(config, owner, repo, pullNumber, commitId, files, codeReviewResponse);

    if (!finalReview?.event) {
        throw new Error("Code review produced no usable result (the model returned nothing — commonly an API rate limit). See logs above.");
    }

    // Append the ground-truth list of files sent to the reviewer to the posted comment
    // so readers can see the review's coverage. Done here, after the feedback agent, so
    // it can't be dropped when the feedback agent rewrites the body.
    finalReview.body = (finalReview.body || "") + filesReviewedSection(files.map((f) => f.data.filename));

    await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews', finalReview);
}
