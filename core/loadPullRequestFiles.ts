import { githubApiVersion } from "../config/config.js";
import { convertBase64ToString } from "../utils/utils.js";
import { FileData } from "../types/index.js";

// Fetches the changed files of a pull request and returns each non-removed file
// alongside its decoded content. Content is read at `commitId` (the PR head SHA)
// so the review can't race a moving head. Uses the REST client (octokit.rest)
// rather than an App-installation-authenticated raw fetch, so this works with any
// token-authenticated octokit (App installation token or Action GITHUB_TOKEN).
export async function loadPullRequestFiles(
    octokit,
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string
): Promise<FileData[]> {
    const files: FileData[] = [];

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

        files.push({
            data: file, // raw file metadata from the PR files endpoint
            content: convertBase64ToString(data.content),
        });
    }

    return files;
}
