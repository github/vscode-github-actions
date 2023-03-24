import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat.js'
import relativeTime from 'dayjs/plugin/relativeTime.js'
import duration from 'dayjs/plugin/duration.js'
import {WorkflowRun, WorkflowRunAttempt} from '../../store/workflowRun'

dayjs.extend(duration)
dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)

// Returns a string like "**Succeeded** in **1m 2s**"
// For use in markdown tooltip
export function getStatusString(item: WorkflowRun | WorkflowRunAttempt, capitalize = false): string {
  let statusText = item.run.conclusion || item.run.status || ''
  switch (statusText) {
    case 'success':
      statusText = 'succeeded'
      break
    case 'failure':
      statusText = 'failed'
      break
  }

  statusText = statusText.replace('_', ' ')

  if (capitalize) {
    statusText = statusText.charAt(0).toUpperCase() + statusText.slice(1)
  }

  statusText = `**${statusText}**`

  if (item.run.conclusion && item.run.conclusion !== 'skipped') {
    const duration = dayjs.duration(item.duration())
    // Format and remove leading 0's
    const formattedDuration = duration
      .format('D[d] H[h] m[m] s[s]')
      .replace(/^0d /, '')
      .replace(/^0h /, '')
      .replace(/^0m /, '')
    statusText += ` in **${formattedDuration}**`
  }

  return statusText
}

// Returns a string like "Manually run by [user](user_url) 4 minutes ago *(December 31, 1969 7:00 PM)*"
// For use in markdown tooltip
export function getEventString(item: WorkflowRun | WorkflowRunAttempt): string {
  let eventString = 'Triggered'
  if (item.hasPreviousAttempts) {
    eventString = 'Re-run'
  } else {
    const event = item.run.event
    if (event) {
      switch (event) {
        case 'workflow_dispatch':
          eventString = 'Manually triggered'
          break
        case 'dynamic':
          eventString = 'Triggered'
          break
        default:
          eventString = 'Triggered via ' + event.replace('_', ' ')
      }
    }
  }

  if (item.run.triggering_actor) {
    eventString += ` by [${item.run.triggering_actor.login}](${item.run.triggering_actor.html_url})`
  }

  if (item.run.run_started_at) {
    const started_at = dayjs(item.run.run_started_at)
    eventString += ` ${started_at.fromNow()} *(${started_at.format('LLL')})*`
  }

  return eventString
}
