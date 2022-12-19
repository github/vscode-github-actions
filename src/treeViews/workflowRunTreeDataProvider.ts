import {RunStore} from "../store/store";
import {WorkflowRunNode} from "./shared/workflowRunNode";

export abstract class WorkflowRunTreeDataProvider {
  protected _runNodes = new Map<number, WorkflowRunNode>();

  constructor(protected store: RunStore) {
    this.store.event(({run}) => {
      // Get tree node
      const node = this._runNodes.get(run.id);
      if (node) {
        node.updateRun(run);
        this._updateNode(node);
      }
    });
  }

  protected abstract _updateNode(node: WorkflowRunNode): void;
}
