import { convertBase64ToString } from "../utils/utils.js";
import { githubApiVersion } from "./config.js";

// Maintainer-controlled, free-form review guidance (AI_PR_REVIEWER.md). Read from
// the repo's default branch (the contents API defaults to it when `ref` is omitted)
// so a pull request can't alter the reviewer's own instructions. Returns null when
// the file is absent so the review falls back to the built-in prompt guidance.
export async function fetchReviewerInstructions(
    octokit,
    owner: string,
    repo: string,
    path = "AI_PR_REVIEWER.md"
): Promise<string | null> {
    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: owner,
            repo: repo,
            path: path,
            headers: {
                'X-GitHub-Api-Version': githubApiVersion
            }
        });

        if (response.data?.type === "file" && response.data.content) {
            return convertBase64ToString(response.data.content).trim() || null;
        }

        // A directory, or a >1MB file returned without inline content.
        return null;
    } catch (error) {
        if (error?.status === 404) {
            console.log(`No ${path} on the default branch; using built-in review guidance.`);
            return null;
        }
        // Never block a review on this optional file.
        console.error(`Failed to fetch ${path}: ${error?.message ?? String(error)}`);
        return null;
    }
}
