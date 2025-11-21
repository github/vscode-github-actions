import {GitHubRepoContext} from "../../git/repository";
import {RunStore} from "../../store/store";
import {WorkflowRun} from "../../store/workflowRun";
import {WorkflowRunNode} from "../shared/workflowRunNode";

export class CombinedWorkflowRunNode extends WorkflowRunNode {
  constructor(
    store: RunStore,
    gitHubRepoContext: GitHubRepoContext,
    run: WorkflowRun,
    workflowName?: string
  ) {
    super(store, gitHubRepoContext, run, workflowName);
    this.description = `${gitHubRepoContext.owner}/${gitHubRepoContext.name}`;
  }
}
