export interface WorkflowsResponse {
    total_count: number;
    workflows:   Workflow[];
}

export interface Workflow {
    id:         number;
    node_id:    string;
    name:       string;
    path:       string;
    state:      string;
    created_at: Date;
    updated_at: Date;
    url:        string;
    html_url:   string;
    badge_url:  string;
}

// Runs

export interface RunsResponse {
    total_count:   number;
    workflow_runs: WorkflowRun[];
}

export interface WorkflowRun {
    id:              number;
    node_id:         string;
    head_branch:     string;
    head_sha:        string;
    event:           string;
    status:          string;
    conclusion:      string;
    url:             string;
    before:          string;
    after:           string;
    // pull_requests:   PullRequest[];
    created_at:      Date;
    updated_at:      Date;
    jobs_url:        string;
    artifacts_url:   string;
    cancel_url:      string;
    rerun_url:       string;
    workflow_url:    string;
    // head_commit:     HeadCommit;
    // repository:      Repository;
    // head_repository: Repository;
}