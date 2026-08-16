/* eslint-env node */

// @ts-check

import {
  begin,
  blockRule,
  indentIsLessThanOrEqualTo,
  matchPartialObjectProperty,
  matchPropertyNameAndValue,
  matchSequenceItem,
  matchTrailingLineContent,
  matchWholeObjectProperty,
  plainRule,
  ref,
  rule,
  SYNTAX,
  writeGrammarFile
} from "./common.mjs";

/**
 * Names of rules that are not specific to a shell.
 */
const RULE_NAMES = {
  on: "on",
  runs: "runs",
  workflowDefaults: "defaults",
  workflowDefaultsRun: "defaults.run",
  jobs: "jobs",
  job: "job",
  jobDefaults: "job.defaults",
  jobDefaultsRun: "job.defaults.run",
  stepsNoDefaultShell: "steps.no-default-shell",
  step: "step.no-default-shell",
  stepWith: "step.with"
};

const MATCH_NOTHING = "^(?!.*)$";

/**
 * Generates a grammar for the `run` input of steps.
 */
export async function generateRunGrammar() {
  const languages = [
    defineLanguage("shell", ["bash", "sh"]),
    defineLanguage("batchfile", ["cmd"]),
    defineLanguage("powershell", ["pwsh", "powershell"]),
    defineLanguage("python", ["python"])
  ];

  const grammar = {
    scopeName: "source.github-actions-workflow.run",
    injectionSelector: "L:source.github-actions-workflow",
    patterns: [{include: ref(RULE_NAMES.on)}, {include: ref(RULE_NAMES.runs)}],
    repository: {
      // This rule matches the workflow's `on` property. We cannot define
      // the "jobs" rule as a top-level pattern, because doing that means
      // it takes precedence over the "jobs with a default shell" rule that
      // we only include within other rules. To avoid that, we need a top-level
      // rule that captures the entire workflow, and then we include the rules
      // for other properties within it to narrow their scope. Since every
      // workflow requires an `on` property, we can match to that property.
      ...rule(RULE_NAMES.on, {
        ...matchWholeObjectProperty("on", false),

        // Match to the end of the file instead of the end of the property.
        // Do this by using an end pattern that won't match to any line.
        end: MATCH_NOTHING,

        patterns: [
          // Here we include the top-level properties that we can match to.
          {include: ref(RULE_NAMES.workflowDefaults)},
          {include: ref(RULE_NAMES.jobs)},

          // Anything else can be handled by the workflow grammar.
          SYNTAX.anyWorkflowSyntax
        ]
      }),

      // This rule matches a composite action's `runs` property.
      ...rule(RULE_NAMES.runs, {
        ...matchWholeObjectProperty("runs", false),

        patterns: [
          // Composite actions do not have a default shell, so we
          // only need to match to the `steps` property. Within that
          // we can use the same rules for the steps in a workflow.
          {include: ref(RULE_NAMES.stepsNoDefaultShell)},

          // Anything else can be handled by the workflow grammar.
          SYNTAX.anyWorkflowSyntax
        ]
      }),

      // This rule matches the `defaults` property at the workflow-level,
      // which allows the default shell to be set for the entire
      // workflow. It only works as intended when the `defaults`
      // property is defined before the `jobs` property.
      ...rule(RULE_NAMES.workflowDefaults, {
        ...matchWholeObjectProperty("defaults", false),

        patterns: [
          // Match the `run` property in the defaults.
          // If this matches, this will extend the end of
          // this rule's range to the end of the workflow.
          {include: ref(RULE_NAMES.workflowDefaultsRun)},

          // Anything else can be handled by the workflow grammar.
          SYNTAX.anyWorkflowSyntax
        ]
      }),

      // This rule matches the `run` property within the workflow's `defaults`
      // property, which allows the default shell to be set for the workflow.
      ...rule(RULE_NAMES.workflowDefaultsRun, {
        ...matchWholeObjectProperty("run", true),

        patterns: [
          // Match to the `jobs` property. If we match to this, then
          // we didn't match to a default shell, because the default
          // shell match would continue to the end of the workflow.
          {include: ref(RULE_NAMES.jobs)},

          // Match to the default shell property for each language.
          // These rules will match the `shell` property in the defaults
          // and continue all the way through to the end of the workflow.
          ...languages.map(language => ({include: ref(language.rules.workflowDefaultsRunShell)})),

          // Anything else can be handled by the workflow grammar.
          SYNTAX.anyWorkflowSyntax
        ]
      }),

      // This rule matches the `jobs` property
      // and all of its child properties. It is used
      // as a way to find the individual job properties.
      ...rule(RULE_NAMES.jobs, jobs(RULE_NAMES.job)),

      // This rule matches the `job` property and
      // all of its child properties. It is used
      // to detect the default shell for the job.
      ...rule(RULE_NAMES.job, job(RULE_NAMES.stepsNoDefaultShell)),

      // This rule matches the `defaults` property within a job,
      // which allows the default shell to be set for the job.
      // It only works as intended when the `defaults`
      // property is defined before the `steps` property.
      ...rule(RULE_NAMES.jobDefaults, {
        ...matchWholeObjectProperty("defaults", true),

        patterns: [
          // Match the `run` property in the defaults.
          // If this matches, this will extend the end of
          // this rule's range to the end of the steps.
          {include: ref(RULE_NAMES.jobDefaultsRun)},

          // Anything else can be handled by the workflow grammar.
          SYNTAX.anyWorkflowSyntax
        ]
      }),

      // This rule matches the `run` property within a job's `defaults`
      // property, which allows the default shell to be set for the job.
      ...rule(RULE_NAMES.jobDefaultsRun, {
        ...matchWholeObjectProperty("run", true),

        patterns: [
          // Match to the `steps` property. If we match to this, then
          // we didn't match to a default shell, because the default
          // shell match would continue to the end of the job.
          {include: ref(RULE_NAMES.stepsNoDefaultShell)},

          // Match to the default shell property for each language.
          // These rules will match the `shell` property in the defaults
          // and continue all the way through to the end of the job.
          ...languages.map(language => ({include: ref(language.rules.jobDefaultsRunShell)})),

          // Anything else can be handled by the workflow grammar.
          SYNTAX.anyWorkflowSyntax
        ]
      }),

      // This rule matches the `steps` property. It will only
      // be tested when the job does not have a default shell.
      ...rule(RULE_NAMES.stepsNoDefaultShell, {
        ...matchWholeObjectProperty("steps", true),

        patterns: [
          // Match to a step that starts with a `shell` property. This must
          // be declared before the next pattern because that next pattern
          // will match to _any_ step, regardless of what it starts with.
          ...languages.map(language => ({include: ref(language.rules.stepStartingWithShell)})),

          // Match to any step.
          {include: ref(RULE_NAMES.step)},

          // Anything else can be handled by the workflow grammar.
          SYNTAX.anyWorkflowSyntax
        ]
      }),

      // Define a rule that matches to a step. Although this matches
      // to any step, it will only end up matching to steps that do
      // not start with a `shell` property because a step that starts
      // with a shell property will be matched before this rule is tested.
      // This rule is only used when there is no default shell defined.
      ...rule(RULE_NAMES.step, {
        // Match to a sequence item. This rule is only used
        // within the `steps` property, so we can guarantee
        // that any sequence item we match to is a step.
        ...matchSequenceItem(),

        patterns: [
          // Match to the `shell` property for each language. That allows
          // us to set the shell for everything that follows it in the step.
          ...languages.map(language => ({include: ref(language.rules.stepShell)})),

          // Anything else can be handled by the workflow grammar.
          SYNTAX.anyWorkflowSyntax
        ]
      }),

      // Define a rule that matches to a `with` property in a step. This is used
      // to skip over the inputs for an action so that if there's an input
      // called `run`, it won't get interpreted as the step's `run` property.
      ...rule(RULE_NAMES.stepWith, {
        // Match to a sequence item. This rule is only used
        // within the `steps` property, so we can guarantee
        // that any sequence item we match to is a step.
        ...matchWholeObjectProperty("with", true),

        patterns: [
          // Let everything be handled by the workflow grammar
          // so that we don't match an input called `run`.
          SYNTAX.anyWorkflowSyntax
        ]
      }),

      ...languages
        .map(language => ({
          // This rule matches the `shell` property in a workflow's
          // `defaults.run` property for a specific language.
          ...rule(language.rules.workflowDefaultsRunShell, {
            ...matchPartialObjectProperty("shell", language.shellPattern),

            // The match needs to continue to the end of the workflow
            // instead of to the end of the object. It needs to do this
            // because we want to match to the `jobs` property so that we
            // can apply the default shell to that property and its children.
            // Do this by using a pattern that won't match anything.
            end: MATCH_NOTHING,

            patterns: [
              // Match to the jobs property. The jobs will
              // use the default shell for this language.
              {include: ref(language.rules.jobsDefaultShell)},

              // Anything else can be handled by the workflow grammar.
              SYNTAX.anyWorkflowSyntax
            ]
          }),

          // This rule matches the `jobs` property
          // when the workflow has a default shell.
          ...rule(language.rules.jobsDefaultShell, jobs(language.rules.jobDefaultShell)),

          // This rule matches the `job` property
          // when the workflow has a default shell.
          ...rule(language.rules.jobDefaultShell, job(language.rules.stepsDefaultShell)),

          // This rule matches the `shell` property in a job's
          // `defaults.run` property for a specific language.
          ...rule(language.rules.jobDefaultsRunShell, {
            ...begin(
              {
                // We want this rule to cover the steps in the job. To do this, we
                // need to know the amount of whitespace used for one indent level.
                // We know that a job has one level of indentation. The `defaults`
                // property for the job will therefore have two levels, the `run`
                // property will have three and the `shell` property will have four.
                // Match to four equal levels of spaces, capturing the first level.
                pattern: String.raw`^([ ]+)\1{3}`,
                captures: [undefined]
              },
              matchPropertyNameAndValue("shell", language.shellPattern),
              matchTrailingLineContent()
            ),

            // End the match at the end of the job. That will be when the
            // line has less than or equal to one level of indentation.
            end: indentIsLessThanOrEqualTo(String.raw`\1`),

            patterns: [
              // Match to the steps property. The steps will
              // use the default shell for this language.
              {include: ref(language.rules.stepsDefaultShell)},

              // Anything else can be handled by the workflow grammar.
              SYNTAX.anyWorkflowSyntax
            ]
          }),

          // This rule matches the `steps` property in a job that
          // has a default shell defined for a specific language.
          ...rule(language.rules.stepsDefaultShell, {
            ...matchWholeObjectProperty("steps", true),

            // Within a `steps` property, we can handle steps that start with
            // a `shell` property (the default does not apply), or steps that
            // don't start with a `shell` property (the default might apply).
            // hey must be defined in this order. If the `step` rule is included
            // first, then all steps will match to that and nothing will match to
            // the shell-step rule.
            patterns: [
              // Match to a step that starts with a `shell` property. That step
              // is overriding the default shell. We need one pattern for each language.
              ...languages.map(language => ({include: ref(language.rules.stepStartingWithShell)})),

              // Match to a step that starts with a `run` property.
              // The value can be either a block scalar, or a plain
              // flow scalar. We require the shell to be declared
              // before the `run` property, which means steps starting
              // with a `run` property will be using the default shell.
              {include: ref(language.rules.stepStartingWithRunBlock)},
              {include: ref(language.rules.stepStartingWithRunPlain)},

              // Match to a step that does not start with a `shell`
              // or `run` property. That step may define a `shell`
              // property later, in which case that will override the
              // default shell, but if it doesn't define a `shell`
              // property, then it will use the default shell.
              {include: ref(language.rules.stepMaybeDefaultShell)},

              // Anything else can be handled by the workflow grammar.
              SYNTAX.anyWorkflowSyntax
            ]
          }),

          // This rule matches to a step that starts with a `shell` property.
          // Note that this is different to the plain `step` rule. This rule is
          // used to override the default shell, so we specifically match to the
          // `shell` property _and_ the value, whereas the `step` rule matches
          // to just the sequence item and not the property that follows it.
          ...rule(language.rules.stepStartingWithShell, {
            ...matchSequenceItem("shell", language.shellPattern),

            patterns: [
              // Match to a `run` property that contains either
              // a block scalar, or a plain flow scalar.
              {include: ref(language.rules.runBlock)},
              {include: ref(language.rules.runPlain)},

              // Anything else can be handled by the workflow grammar.
              SYNTAX.anyWorkflowSyntax
            ]
          }),

          // This rule matches to a step that does not start with a `shell` property.
          // The step might define a `shell` property later, but if it doesn't, then
          // it will use the default shell. This is different to the `step` rule
          // by the patterns that are included. For this rule, we need to match t
          // which matches to any step, regardless of what it starts with.
          ...rule(language.rules.stepMaybeDefaultShell, {
            // We don't care what the step starts with here
            // because when this rule is included, it's always
            // after the rule for steps that start with a `shell`.
            ...matchSequenceItem(),

            patterns: [
              // Match to a `with` property. We match to this first so that an
              // input in the `with` block called "run" doesn't cause the value of
              // that input to have the syntax highlighting from the default shell.
              {include: ref(RULE_NAMES.stepWith)},

              // Match to a `shell` property. If we match to this,
              // then the step is overriding the default shell.
              // We need one pattern for each language.
              ...languages.map(language => ({include: ref(language.rules.stepShell)})),

              // Match to a `run` property that contains either
              // a block scalar, or a plain flow scalar. If we match
              // to these, then they will use the default shell.
              {include: ref(language.rules.runBlock)},
              {include: ref(language.rules.runPlain)},

              // Anything else can be handled by the workflow grammar.
              SYNTAX.anyWorkflowSyntax
            ]
          }),

          // This rule matches the `shell` property in a step.
          // This is used to override the default shell for a step,
          // or to set the shell for a step when there is no default.
          ...rule(language.rules.stepShell, {
            ...matchPartialObjectProperty("shell", language.shellPattern),

            patterns: [
              // Match to a `run` property that contains either
              // a block scalar, or a plain flow scalar. If we match
              // to these, then they will use the default shell.
              {include: ref(language.rules.runBlock)},
              {include: ref(language.rules.runPlain)},

              // Anything else can be handled by the workflow grammar.
              SYNTAX.anyWorkflowSyntax
            ]
          }),

          // This rule matches the `run` property when it
          // is a block scalar and does not start a step.
          [language.rules.runBlock]: blockRule(
            "run",
            `meta.embedded.inline.${language.name}`,
            `source.${language.name}`,
            false
          ),

          // This rule matches the `run` property when
          // it is a block scalar and does start a step.
          [language.rules.stepStartingWithRunBlock]: blockRule(
            "run",
            `meta.embedded.inline.${language.name}`,
            `source.${language.name}`,
            true
          ),

          // This rule matches the `script` property when it
          // is a plain flow scalar and does not start a step.
          [language.rules.runPlain]: plainRule(
            "run",
            `meta.embedded.inline.${language.name}`,
            `source.${language.name}`,
            false
          ),

          // This rule matches the `script` property when it
          // is a plain flow scalar and does start a step.
          [language.rules.stepStartingWithRunPlain]: plainRule(
            "run",
            `meta.embedded.inline.${language.name}`,
            `source.${language.name}`,
            true
          )
        }))
        .reduce((previous, current) => Object.assign(previous, current), {})
    }
  };

  await writeGrammarFile(grammar, "run.tmGrammar.json");
}

/**
 *
 * @param {string} name The name of the language.
 * @param {string[]} shells The shells that use the language.
 * @returns {Language} The language definition.
 */
function defineLanguage(name, shells) {
  return {
    name,
    shellPattern: shells.join("|"),
    rules: {
      workflowDefaultsRunShell: `defaults.run.shell.${name}`,
      jobsDefaultShell: `jobs.default-shell.${name}`,
      jobDefaultShell: `job.default-shell.${name}`,
      jobDefaultsRunShell: `job.defaults.run.shell.${name}`,
      stepsDefaultShell: `steps.default-shell.${name}`,
      stepStartingWithShell: `step.starting-with-shell.${name}`,
      stepMaybeDefaultShell: `step.maybe-default-shell.${name}`,
      stepShell: `step.shell.${name}`,
      runBlock: `run.block.${name}`,
      stepStartingWithRunBlock: `step.run.block.${name}`,
      runPlain: `run.plain.${name}`,
      stepStartingWithRunPlain: `step.run.plain.${name}`
    }
  };
}

/**
 * Creates a rule that matches a jobs property.
 * @param {string} jobRuleName The name of the rule to include that matches each job property.
 * @returns {Rule} The rule definition.
 */
function jobs(jobRuleName) {
  return {
    // The `jobs` property is at the
    // top-level, so there will be no indent.
    ...matchWholeObjectProperty("jobs", false),

    patterns: [
      // Match to the `job` property. This allows us
      // to detect the default shell for the job.
      {include: ref(jobRuleName)},

      // Anything else can be handled by the workflow grammar.
      SYNTAX.anyWorkflowSyntax
    ]
  };
}

/**
 * Creates a rule that matches a job property.
 * @param {string} stepsRuleName The name of the rule to include that matches the job's
 *                               steps when the job does not define a default shell.
 * @returns {Rule} The rule definition.
 */
function job(stepsRuleName) {
  return {
    // A job is a child of `jobs`. This rule is only matched within
    // our `jobs` rule for a default shell, so the first indented line
    // that is not a comment or sequence item will be the start of a job.
    ...matchWholeObjectProperty(String.raw`(?![#-])\S+`, true),

    patterns: [
      // Match the `defaults` property. This allows
      // us to set the default shell for the job.
      {include: ref(RULE_NAMES.jobDefaults)},

      // Match the `steps` property. This will continue to the end of the
      // job. If we match this, then the job does not have a default shell.
      {include: ref(stepsRuleName)},

      // Anything else can be handled by the workflow grammar.
      SYNTAX.anyWorkflowSyntax
    ]
  };
}

/**
 * @typedef Language
 * @property {string} name The name of the language.
 * @property {string} shellPattern The regular expression that matches any of the shells.
 * @property {LanguageRules} rules The names of rules for this language.
 */

/**
 * @typedef LanguageRules
 * @property {string} workflowDefaultsRunShell The name of the rule that matches a workflow's default shell.
 * @property {string} jobsDefaultShell The name of the rule that matches a workflow's `jobs` property when the workflow has a default shell.
 * @property {string} jobDefaultShell The name of the rule that matches a job property when the workflow has a default shell.
 * @property {string} jobDefaultsRunShell The name of the rule that matches a job's default shell.
 * @property {string} stepsDefaultShell The name of the rule for the steps in a job that has a default shell.
 * @property {string} stepStartingWithShell The name of the rule for a step that starts with a `shell` property.
 * @property {string} stepMaybeDefaultShell The name of the rule for a step that does not start with a `shell` property. It may define a shell later.
 * @property {string} stepShell The name of the rule for a `shell` property that is within a step, but does not start the step.
 * @property {string} runBlock The name of the rule for a `run` property containing a block scalar.
 * @property {string} stepStartingWithRunBlock The name of the rule for a step that starts with a `run` property containing a block scalar.
 * @property {string} runPlain The name of the rule for a `run` property containing a plain string.
 * @property {string} stepStartingWithRunPlain The name of the rule for a step that starts with a `run` property containing a plain string.
 */

/**
 * @typedef {import('./common.mjs').Rule} Rule
 */
