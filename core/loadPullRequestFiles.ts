import { githubApiVersion } from "../config/config.js";
import { convertBase64ToString, buildIgnoreMatcher } from "../utils/utils.js";
import { FileData } from "../types/index.js";

// Upper bound on the size (decoded content + diff) of a single file we hand to the
// model. A committed lockfile or generated bundle can, on its own, exceed the entire
// per-minute input-token rate limit; see the skip in loadPullRequestFiles below.
const MAX_REVIEWABLE_FILE_CHARS = 70_000;

// Fetches the changed files of a pull request and returns each non-removed file
// alongside its decoded content. Content is read at `commitId` (the PR head SHA)
// so the review can't race a moving head. Uses the REST client (octokit.rest)
// rather than an App-installation-authenticated raw fetch, so this works with any
// token-authenticated octokit (App installation token or Action GITHUB_TOKEN).
//
// Files matching `ignorePatterns` (code_review.ignore_patterns) are skipped before
// their content is fetched, keeping generated/vendored files (e.g. dist/**) out of
// both the Contents API calls and the LLM prompt — avoiding token rate limits.
export async function loadPullRequestFiles(
    octokit,
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    ignorePatterns?: string[]
): Promise<FileData[]> {
    const files: FileData[] = [];
    const isIgnored = buildIgnoreMatcher(ignorePatterns);

    const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
        owner: owner,
        repo: repo,
        pull_number: pullNumber,
        headers: {
            'X-GitHub-Api-Version': githubApiVersion
        }
    });

    if (!response) {
        return files;
    }

    for (const file of response.data) {
        if (file.status === "removed") {
            continue;
        }

        if (isIgnored(file.filename)) {
            console.log(`Skipping ignored file (matches ignore_patterns): ${file.filename}`);
            continue;
        }

        const { data } = await octokit.rest.repos.getContent({
            owner: owner,
            repo: repo,
            path: file.filename,
            ref: commitId,
        });

        // getContent's response is a union: file | directory | symlink | submodule.
        // We only handle regular files; skip anything else.
        if (Array.isArray(data) || data.type !== "file") {
            continue;
        }

        // Files larger than ~1MB are returned without inline content (content is empty
        // and a download_url is provided instead). Log + skip for now.
        if (!data.content) {
            console.warn(`Skipping ${file.filename}: no inline content (file may exceed the 1MB API limit)`);
            continue;
        }

        const content = convertBase64ToString(data.content);

        // A single oversized file (e.g. a committed lockfile or generated bundle) can,
        // on its own, exceed the model's per-minute input-token rate limit — starving
        // every later agent call. Skip it here; the diff is still visible on the PR.
        const reviewSize = content.length + (file.patch?.length ?? 0);
        if (reviewSize > MAX_REVIEWABLE_FILE_CHARS) {
            console.warn(`Skipping ${file.filename}: too large to review (${reviewSize} chars > ${MAX_REVIEWABLE_FILE_CHARS} limit)`);
            continue;
        }

        files.push({
            data: file, // raw file metadata from the PR files endpoint
            content,
        });
    }

    return files;
}
