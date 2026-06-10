import yaml from "js-yaml";

export function convertBase64ToString(base64: string): string {
    return Buffer.from(base64, 'base64').toString('utf-8');
}

export function convertStringToBase64(val: string): string {
    return Buffer.from(val, 'utf-8').toString('base64');
}

export function isEmpty(list: any[]): boolean {
    return list.length === 0;
}

export function isNotEmpty(list: any[]): boolean {
    return list.length > 0;
}

export function isNull(value: any): boolean {
    return value === null;
}

export function isNotNull(value: any): boolean {
    return value !== null;
}

export function parseYAML(input: string) {
    return yaml.load(input);
}

export function stripCodeFences(text: string): string {
    const match = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
    return match ? match[1] ?? text : text;
}

// Translate a single glob pattern to a RegExp with .gitignore-like semantics:
// `**` spans path separators, `*` stays within a segment, and a slashless pattern
// (e.g. "*.min.js") matches the basename at any depth.
function globToRegExp(pattern: string): RegExp {
    const matchBase = !pattern.includes("/");

    let re = "";
    for (let i = 0; i < pattern.length; i++) {
        const c = pattern.charAt(i);
        if (c === "*") {
            if (pattern.charAt(i + 1) === "*") {
                re += ".*";
                i++;
                if (pattern.charAt(i + 1) === "/") i++; // let "dist/**" match "dist/a/b"
            } else {
                re += "[^/]*";
            }
        } else if (c === "?") {
            re += "[^/]";
        } else {
            re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
        }
    }

    return new RegExp(matchBase ? `(^|/)${re}$` : `^${re}$`);
}

// Compile code_review.ignore_patterns once into a reusable predicate that reports
// whether a filename should be skipped. Precompiling here (rather than per file)
// avoids rebuilding the same RegExps for every changed file in the PR. Used to drop
// generated/vendored files (e.g. dist/**) before they reach the LLM.
export function buildIgnoreMatcher(patterns?: string[]): (filename: string) => boolean {
    const regexps = Array.isArray(patterns) ? patterns.map(globToRegExp) : [];
    if (regexps.length === 0) return () => false;
    return (filename: string) => regexps.some((re) => re.test(filename));
}

export async function postInformativeComment(
    octokit: any,
    owner: string,
    repo: string,
    pullNumber: number,
    body: string
): Promise<void> {
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner,
        repo,
        issue_number: pullNumber,
        body,
    });
}