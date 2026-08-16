/* eslint-env node */

// @ts-check

import {generateRunGrammar} from "./generate-run.mjs";
import {generateGitHubScriptGrammar} from "./generate-github-script.mjs";

(async () => {
  await generateGitHubScriptGrammar();
  await generateRunGrammar();
})().catch(ex => {
  console.error(ex);
  process.exit(1);
});
