export interface YAMLConfig {
    project?: string;
    model: any;
    global_config: any;
    code_review: any;
    dependency_review: any;
    feedback?: {
        enabled: boolean;
        model: {
            provider: string;
            name: string;
            max_tokens: number;
            temperature: number;
        };
    };
}

// ---- Tool types ----

export type ToolHandler = (...args: unknown[]) => unknown;

export type ToolMap = Map<string, ToolHandler>;

// ---- GitHub / repo types ----

export interface RepoContext {
    octokit: any;
    owner: string;
    repo: string;
    commitId: string; // PR head SHA — tools that read repo content pin to this ref
}

export interface ReviewIdentifiers {
    owner: string;
    repo: string;
    pullNumber: number;
    commitId: string;
}

// One changed file from the PR files endpoint, diff-only. Full file contents are
// no longer loaded upfront — agents pull them on demand via the read_file tool.
export interface FileData {
    filename: string;
    status: string; // added | modified | removed | renamed | ...
    additions: number;
    deletions: number;
    patch?: string; // unified diff; absent for binary or oversized files
    previous_filename?: string; // set when status is "renamed"
}

// ---- Code review types ----

export interface RequestToolResponse {
    type: "request_tool";
    tool: string;
    args?: any;
}

export interface ReviewComment {
    path: string;
    line: number;
    side: "LEFT" | "RIGHT";
    body: string;
}

export interface FinalReviewResponse {
    type: "final_review";
    content: {
        owner: string;
        repo: string;
        pull_number: number;
        commit_id: string;
        body: string;
        event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
        comments: ReviewComment[];
        headers: {
            "X-GitHub-Api-Version": string;
        };
    };
}

export type CodeReviewResponse = RequestToolResponse | FinalReviewResponse;

// ---- Dependency review types ----

export interface DependencyReviewResponse {
    owner: string;
    repo: string;
    pull_number: number;
    commit_id: string;
    body: string;
    event: "COMMENT";
    headers: {
        "X-GitHub-Api-Version": string;
    };
}

// ---- Agent types ----

export type GenerateReviewFn = (
    config: YAMLConfig,
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    files: FileData[],
    availableTools: string,
    messages: any[]
) => Promise<any>;
