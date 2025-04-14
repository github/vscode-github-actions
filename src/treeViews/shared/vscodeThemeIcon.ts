/**
 * VSCode Theme Icons for the Testing UI. Documented at https://code.visualstudio.com/api/references/icons-in-labels. Generated with Copilot AI 2023-06-20
 *
 * Testing Icons:
 * - terminal-view-icon: View icon of the terminal view.
 * - test-view-icon: View icon of the test view.
 * - testing-cancel-icon: Icon to cancel ongoing test runs.
 * - testing-debug-icon: Icon of the "debug test" action.
 * - testing-error-icon: Icon shown for tests that have an error.
 * - testing-failed-icon: Icon shown for tests that failed.
 * - testing-passed-icon: Icon shown for tests that passed.
 * - testing-queued-icon: Icon shown for tests that are queued.
 * - testing-run-all-icon: Icon of the "run all tests" action.
 * - testing-run-icon: Icon of the "run test" action.
 * - testing-show-as-list-icon: Icon shown when the test explorer is disabled as a tree.
 * - testing-skipped-icon: Icon shown for tests that are skipped.
 * - testing-unset-icon: Icon shown for tests that are in an unset state.
 * - loading~spin: Icon for a loading animation. Used for tests that are currently running.
 * - question: Generic question icon. Needed for unmatched cases which should be rare.
 * - circle-slash: Used to indicate when a task was cancelled.
 * - warning: used when there is an issue with running a task such as when action is required
 */
export type vscodeTestingThemeIcon =
  | "terminal-view-icon"
  | "test-view-icon"
  | "testing-cancel-icon"
  | "testing-debug-icon"
  | "testing-error-icon"
  | "testing-failed-icon"
  | "testing-passed-icon"
  | "testing-queued-icon"
  | "testing-run-all-icon"
  | "testing-run-icon"
  | "testing-show-as-list-icon"
  | "testing-skipped-icon"
  | "testing-unset-icon"
  | "loading~spin"
  | "question"
  | "warning"
  | "circle-slash";