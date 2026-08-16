/* eslint-env node */

// @ts-check

import {
  blockRule,
  matchPartialObjectProperty,
  matchSequenceItem,
  matchWholeObjectProperty,
  plainRule,
  ref,
  rule,
  SYNTAX,
  writeGrammarFile
} from "./common.mjs";

const RULE_NAMES = {
  usesActionsGitHubScript: "actions-github-script.uses",
  usesActionsGitHubScriptSequenceItem: "actions-github-script.uses-sequence-item",
  usesActionsGitHubScriptWith: "actions-github-script.with",
  scriptBlock: "actions-github-script.script.block",
  scriptPlain: "actions-github-script.script.plain"
};

/**
 * Generates a grammar for the `script` input of the `actions/github-script` action.
 */
export async function generateGitHubScriptGrammar() {
  const grammar = {
    scopeName: "source.github-actions-workflow.actions-github-script",
    injectionSelector: "L:source.github-actions-workflow",
    patterns: [
      {include: ref(RULE_NAMES.usesActionsGitHubScript)},
      {include: ref(RULE_NAMES.usesActionsGitHubScriptSequenceItem)}
    ],
    repository: {
      // This rule matches to a `uses: actions/github-script@...` property
      // that does not start a sequence item. We assume that this
      // property is within a step because it's unlikely to occur
      // anywhere else. The match continues until the end of the step.
      ...rule(RULE_NAMES.usesActionsGitHubScript, {
        ...matchPartialObjectProperty("uses", String.raw`actions/github-script@(?:\S+)`),

        patterns: [
          // Match to the step's `with` property.
          {include: ref(RULE_NAMES.usesActionsGitHubScriptWith)},

          // Anything else can be handled by the workflow grammar.
          SYNTAX.anyWorkflowSyntax
        ]
      }),

      // This rule is similar to the previous step, except it matches
      // a `uses: actions/github-script@...` property that starts a
      // sequence item. The match continues until the end of the step.
      ...rule(RULE_NAMES.usesActionsGitHubScriptSequenceItem, {
        ...matchSequenceItem("uses", String.raw`actions\/github-script@\S+`),

        patterns: [
          // Match to the step's `with` property.
          {include: ref(RULE_NAMES.usesActionsGitHubScriptWith)},

          // Anything else can be handled by the workflow grammar.
          SYNTAX.anyWorkflowSyntax
        ]
      }),

      // This rule matches to a `with` property. It's used to
      // ensure that we don't match to a `script` property
      // that is not within the step's `with` property.
      ...rule(RULE_NAMES.usesActionsGitHubScriptWith, {
        ...matchWholeObjectProperty("with", true),

        patterns: [
          // Match to the `script` property as either
          // a plain flow scalar or a block scalar.
          {include: ref(RULE_NAMES.scriptBlock)},
          {include: ref(RULE_NAMES.scriptPlain)},

          // Anything else can be handled by the workflow grammar.
          SYNTAX.anyWorkflowSyntax
        ]
      }),

      // This rule matches the `script`
      // property when it is a block scalar.
      [RULE_NAMES.scriptBlock]: blockRule("script", "meta.embedded.inline.javascript", "source.js", false),

      // This rule matches the `script`
      // property when it is a plain flow scalar.
      [RULE_NAMES.scriptPlain]: plainRule("script", "meta.embedded.inline.javascript", "source.js", false)
    }
  };

  await writeGrammarFile(grammar, "actions-github-script.tmGrammar.json");
}
