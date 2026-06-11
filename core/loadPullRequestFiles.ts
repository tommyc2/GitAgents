import { githubApiVersion } from "../config/config.js";
import { buildIgnoreMatcher } from "../utils/utils.js";
import { FileData } from "../types/index.js";

// Upper bound on a single file's diff that we hand to the model. A committed
// lockfile or generated bundle's patch can, on its own, exceed the entire
// per-minute input-token rate limit. Oversized patches are truncated (not
// dropped) so the file still appears in the review with partial context and
// the agent can read_file it if needed.
const MAX_PATCH_CHARS = 70_000;

// Fetches the changed files of a pull request, diff-only: each file's unified
// diff (`patch`) comes straight from the PR files endpoint, so no per-file
// Contents API calls and no full file contents in the prompt. Agents that need
// more context than a hunk shows pull the full file on demand via the
// read_file tool (see agents/toolHandlers.ts).
//
// Files matching `ignorePatterns` (code_review.ignore_patterns) are skipped,
// keeping generated/vendored files (e.g. dist/**) out of the LLM prompt and
// avoiding token rate limits. Removed files are included — their patch shows
// the deletion, which is reviewable.
export async function loadPullRequestFiles(
    octokit,
    owner: string,
    repo: string,
    pullNumber: number,
    ignorePatterns?: string[]
): Promise<FileData[]> {
    const files: FileData[] = [];
    const isIgnored = buildIgnoreMatcher(ignorePatterns);

    const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
        owner: owner,
        repo: repo,
        pull_number: pullNumber,
        per_page: 100,
        headers: {
            'X-GitHub-Api-Version': githubApiVersion
        }
    });

    if (!response) {
        return files;
    }

    for (const file of response.data) {
        if (isIgnored(file.filename)) {
            console.log(`Skipping ignored file (matches ignore_patterns): ${file.filename}`);
            continue;
        }

        // The endpoint omits `patch` for binary files and very large diffs. Keep the
        // file (so the reviewer knows it changed) and let formatFilesForPrompt note
        // that the diff is unavailable.
        let patch: string | undefined = file.patch;
        if (patch && patch.length > MAX_PATCH_CHARS) {
            console.warn(`Truncating oversized diff for ${file.filename} (${patch.length} chars > ${MAX_PATCH_CHARS} limit)`);
            patch = patch.slice(0, MAX_PATCH_CHARS)
                + `\n... [diff truncated: showing ${MAX_PATCH_CHARS} of ${patch.length} chars]`;
        }

        files.push({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            patch,
            previous_filename: file.previous_filename,
        });
    }

    return files;
}
