import moment from "moment";
import "moment-duration-format";
import {WorkflowRun} from "../../store/workflowRun";
import {WorkflowRunAttempt} from "../../store/workflowRun";

// Reutrns a string like "**Succeeded** in **1m 2s**"
// For use in markdown tooltip
export function getStatusString(item: WorkflowRun | WorkflowRunAttempt, capitalize: boolean = false): string {
  let statusText = item.run.conclusion || item.run.status || "";
  switch (statusText) {
    case "success":
      statusText = "succeeded";
      break;
    case "failure":
      statusText = "failed";
      break;
  }

  statusText = statusText.replace("_", " ");

  if (capitalize) {
    statusText = statusText.charAt(0).toUpperCase() + statusText.slice(1);
  }

  statusText = `**${statusText}**`;

  if (item.run.conclusion && item.run.conclusion !== "skipped") {
    const duration = moment.duration(item.duration());
    statusText += ` in **${duration.format("D[d] h[h] m[m] s[s]")}**`;
  }

  return statusText;
}

// Reutrns a string like "Manually run by [user](user_url) 4 minutes ago *(December 31, 1969 7:00 PM)*"
// For use in markdown tooltip
export function getEventString(item: WorkflowRun | WorkflowRunAttempt): string {
  let eventString = "Triggered";
  if (item.hasPreviousAttempts) {
    eventString = "Re-run";
  } else {
    const event = item.run.event;
    if (event) {
      switch (event) {
        case "workflow_dispatch":
          eventString = "Manually triggered";
          break;
        case "dynamic":
          eventString = "Triggered";
          break;
        default:
          eventString = "Triggered via " + event.replace("_", " ");
      }
    }
  }

  if (item.run.triggering_actor) {
    eventString += ` by [${item.run.triggering_actor.login}](${item.run.triggering_actor.html_url})`;
  }

  let started_at = moment(item.run.run_started_at);
  eventString += ` ${started_at.fromNow()} *(${started_at.format("LLL")})*`;

  return eventString;
}
