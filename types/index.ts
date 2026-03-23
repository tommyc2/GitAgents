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
}

export interface FileData {
    data: any; // raw file data from GitHub API
    content: any; // content of the file
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
    files: any[],
    availableTools: string,
    messages: any[]
) => Promise<any>;
