/* eslint-env node */

// @ts-check

import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

/**
 * Common syntax patterns and captures.
 */
export const SYNTAX = {
  propertyName: {name: "entity.name.tag.yaml"},
  colon: {name: "punctuation.separator.key-value.mapping.yaml"},
  dash: {name: "punctuation.definition.block.sequence.item.yaml"},
  unquotedString: {name: "string.unquoted.plain.out.yaml"},
  commentOrIllegalCharacters: {
    patterns: [
      {include: "source.github-actions-workflow#comment"},
      {match: ".+", name: "invalid.illegal.expected-comment-or-newline.yaml"}
    ]
  },
  anyWorkflowSyntax: {include: "source.github-actions-workflow"}
};

/**
 * Creates a pattern that matches when the line starts with an indent
 * that is less than what the given pattern matches. Blank lines and comment lines are ignored.
 * @param {string} indent The pattern that matches the indent.
 * @returns The full pattern.
 */
export function indentIsLessThan(indent) {
  // Match when the line:
  //  - Does not start with the given pattern, and
  //  - Does not contain only whitespace, and
  //  - Does not contain only a comment.
  return String.raw`^(?!${indent}|[ ]*$|[ ]*#.*$)`;
}

/**
 * Creates a pattern that matches when the line starts with an indent that is
 * less than or equal to what the given pattern matches. Blank lines and comment lines are ignored.
 * @param {string} indent The pattern that matches the indent.
 * @returns The full pattern.
 */
export function indentIsLessThanOrEqualTo(indent) {
  // Match when the line:
  //  - Does not start with the given pattern plus at
  //    least one additional whitespace character, and
  //  - Does not contain only whitespace, and
  //  - Does not contain only a comment.
  return String.raw`^(?!${indent} |[ ]*$|[ ]*#.*$)`;
}

/**
 * Creates the `begin`, `beginCaptures` and `end` properties for matching
 * from the start of a property that defines an object or array (rather
 * than a string value) and continues until the end of the property.
 * @param {string} propertyNamePattern The pattern to match to the property name.
 * @param {boolean} hasIndent Whether the property is indented.
 * @returns {BeginAndEnd} The rule properties.
 */
export function matchWholeObjectProperty(propertyNamePattern, hasIndent) {
  return {
    ...begin(
      {pattern: "^", captures: []},
      hasIndent ? {pattern: "([ ]+)", captures: [undefined]} : undefined,
      {
        pattern: String.raw`(${propertyNamePattern})[ ]*(:)`,
        captures: [SYNTAX.propertyName, SYNTAX.colon]
      },
      matchTrailingLineContent()
    ),
    end: hasIndent
      ? // The property ends when the indent is less than or
        // equal to what we matched before the property name.
        indentIsLessThanOrEqualTo(String.raw`\1`)
      : // The property ends when the line has no indent.
        indentIsLessThanOrEqualTo("")
  };
}

/**
 * Creates the `begin`, `beginCaptures` and `end` properties for
 * matching to an object and continues until the end of the property.
 * The match will start from the property with the given name
 * and string value, and continues to the end of the object.
 * @param {string} namePattern The pattern that matches the name of the property.
 * @param {string} valuePattern The pattern that matches the value of the property.
 * @returns {BeginAndEnd} The rule properties.
 */
export function matchPartialObjectProperty(namePattern, valuePattern) {
  return {
    ...begin(
      // We're matching from somewhere after the object has started, which means
      // the line must be indented. If the line was not indented, then it would
      // be a top-level property, which is not what we are intended to match.
      {pattern: "^([ ]+)", captures: [undefined]},
      matchPropertyNameAndValue(namePattern, valuePattern),
      matchTrailingLineContent()
    ),

    // The property ends when the indent is less than what we matched
    // before the property name. If the indent is equal to what we
    // matched, then that's just another property on the same object.
    end: indentIsLessThan(String.raw`\1`)
  };
}

/**
 * Creates the `begin`, `beginCaptures` and `end` properties for matching
 * to a sequence item (array element). If specified, the first property
 * must match the given name and match the given value pattern.
 * The match will continue until the end of the sequence item.
 * @param {string} [namePattern] The pattern that matches the name of the property at the start of the sequence item.
 * @param {string} [valuePattern] The pattern that matches the value of the property.
 * @returns {BeginAndEnd} The rule properties.
 */
export function matchSequenceItem(namePattern, valuePattern) {
  return {
    ...begin(
      // Start with matching to just the start of the sequence
      // item without a property. We need this part of the pattern
      // whether or not we include a property in the match.
      // Sequence items cannot be defined at the top-level,
      // so there will always be an indent before the dash.
      {
        pattern: String.raw`^([ ]+)(-)([ ]+)`,
        captures: [undefined, SYNTAX.dash, undefined]
      },
      // If we need to match to a property as well, then
      // include the property and value in the pattern,
      // plus whatever can come after it on the line.
      ...(namePattern && valuePattern
        ? [matchPropertyNameAndValue(namePattern, valuePattern), matchTrailingLineContent()]
        : [])
    ),

    // The sequence item ends when the indent is less than the number
    // of characters before the property that started the step:
    //  - The indent in group one
    //  - One space for the dash (which is group 2)
    //  - Whatever spaces followed the dash in group 3.
    end: indentIsLessThan(String.raw`\1 \3`)
  };
}

/**
 * Generates a grammar for a block scalar property with the given name.
 * @param {string} namePattern The pattern that matches the property name.
 * @param {string} metaName The meta name to assign to the block.
 * @param {string} source The source language to include for the block content.
 * @param {boolean} isSequenceItem Indicates whether the property is at the start of a sequence item.
 * @returns {Rule} The grammar rule.
 */
export function blockRule(namePattern, metaName, source, isSequenceItem) {
  return {
    ...begin(
      {pattern: String.raw`^([ ]+)`, captures: [undefined]},
      isSequenceItem ? {pattern: "(-)([ ]+)", captures: [SYNTAX.dash, undefined]} : undefined,
      matchPropertyName(namePattern),
      {
        pattern: String.raw`[ ]+(?:(\|)|(>))([1-9])?([-+])?`,
        captures: [
          {name: "keyword.control.flow.block-scalar.literal.yaml"},
          {name: "keyword.control.flow.block-scalar.folded.yaml"},
          {name: "constant.numeric.indentation-indicator.yaml"},
          {name: "storage.modifier.chomping-indicator.yaml"}
        ]
      },
      matchTrailingLineContent()
    ),

    // The content of the block must be indented at least one space
    // more that the property name was, so we can detect the end
    // of the block by a line whose indentation is less than or equal
    // to the property's indentation. Don't end on blank lines so that
    // we don't end the block early when there are blank lines in it.
    // If we're matching to a sequence item, then the indent includes
    // the dash and the whitespace between it and the property name.
    end: isSequenceItem ? String.raw`^(?!\1 \3 |[ ]*$)` : String.raw`^(?!\1 |[ ]*$)`,

    patterns: [
      {
        // Within the block scalar, match to an indent, and continue until
        // the indent is reduced, but ignore blank lines. This range is
        // marked with the meta name (which would be an `meta.embedded.*` name),
        // and everything within it is matched to the specified source grammar.
        begin: String.raw`^([ ]+)(?! )`,
        end: String.raw`^(?!\1|[ ]*$)`,
        name: metaName,
        patterns: [{include: source}]
      }
    ]
  };
}

/**
 * Generates a grammar for a plain scalar property with the given name.
 * @param {string} namePattern The pattern that matches the property name.
 * @param {string} metaName The meta name to assign to the block.
 * @param {string} source The source language to include for the content.
 * @param {boolean} isSequenceItem Indicates whether the property is at the start of a sequence item.
 * @returns {Rule} The grammar.
 */
export function plainRule(namePattern, metaName, source, isSequenceItem) {
  return {
    ...begin(
      {pattern: "^([ ]+)", captures: [undefined]},
      isSequenceItem ? {pattern: "(-)([ ]+)", captures: [SYNTAX.dash, undefined]} : undefined,
      matchPropertyName(namePattern),
      // There must be at least one space after
      // the colon that follows the property name.
      // We don't want to capture the value though.
      {pattern: "[ ]+", captures: []}
    ),

    // Although the "plain scalar" is an unquoted string, it can span
    // multiple lines. Each line must be indented at least one space
    // more that the property name was, so we can detect the end of the
    // plain scalar by a line whose indentation is less than or equal
    // to the property's indentation. Don't end on blank lines so that
    // we don't break the block when there are blank lines in it.
    // If we're matching to a sequence item, then the indent includes
    // the dash and the whitespace between it and the property name.
    end: isSequenceItem ? String.raw`^(?!\1 \3 |[ ]*$)` : String.raw`^(?!\1 |[ ]*$)`,

    name: metaName,
    patterns: [{include: source}]
  };
}

/**
 * Creates the capture segment that matches a property name and colon.
 * @param {string} namePattern The pattern that matches the name of the property.
 * @returns {CaptureSegment}
 */
function matchPropertyName(namePattern) {
  return {
    // The property name can optionally be followed by whitespace.
    pattern: String.raw`(${namePattern})[ ]*(:)`,
    captures: [SYNTAX.propertyName, SYNTAX.colon]
  };
}

/**
 * Creates the capture segment that matches a property name, colon and value.
 * @param {string} namePattern The pattern that matches the name of the property.
 * @param {string} valuePattern The pattern that matches the value.
 * @returns {CaptureSegment}
 */
export function matchPropertyNameAndValue(namePattern, valuePattern) {
  return combine(matchPropertyName(namePattern), {
    // The colon must be followed by at least one space.
    pattern: String.raw`[ ]+(${valuePattern})`,
    captures: [SYNTAX.unquotedString]
  });
}

/**
 * Creates the capture segment that matches the content that can appear
 * at the end of a line. Includes the anchor for the end of the line.
 * @returns {CaptureSegment}
 */
export function matchTrailingLineContent() {
  return {pattern: "([ ]+.*)?$", captures: [SYNTAX.commentOrIllegalCharacters]};
}

/**
 * Creates a reference to a rule in the current grammar's repository.
 * @param {string} rule The name of the rule.
 * @returns {string} The reference to the rule.
 */
export function ref(rule) {
  return `#${rule}`;
}

/**
 * Provide a type-safe way to define a rule.
 * @param {string} name The name of the rule.
 * @param {Rule} rule The rule definition.
 * @returns {Record<string, RuleWithContentName>} The rule to include in the repository.
 */
export function rule(name, rule) {
  return {
    [name]: {
      ...rule,
      // Optionally include a content name that
      // matches the rule to assist with debugging.
      ...(process.env.INCLUDE_CONTENT_NAME ? {contentName: `source.github-actions-workflow.${name}`} : undefined)
    }
  };
}

/**
 * Creates the `begin` and `beginCaptures` properties for a rule.
 * @param {(CaptureSegment | undefined)[]} segments The segments that define the pattern and captures.
 * @returns {Begin} The `begin` and `beginCaptures` properties.
 */
export function begin(...segments) {
  const combined = combine(...segments);

  /** @type {Rule['beginCaptures']} */
  const beginCaptures = {};

  for (let i = 0; i < combined.captures.length; i++) {
    const capture = combined.captures[i];
    if (capture !== undefined) {
      beginCaptures[i + 1] = capture;
    }
  }

  return {begin: combined.pattern, beginCaptures};
}

/**
 * Combines capture segments.
 * @param {(CaptureSegment | undefined)[]} segments The segments to combine.
 * @returns {CaptureSegment} The combined segments.
 */
function combine(...segments) {
  /** @type {CaptureSegment} */
  const result = {pattern: "", captures: []};

  for (let segment of segments) {
    // Skip undefined segments. This allows callers to set conditional
    // segments to undefined within the call to `combine` instead of having
    // to store a partially constructed segment in a local variable.
    if (segment) {
      result.pattern += segment.pattern;
      result.captures.push(...segment.captures);
    }
  }

  return result;
}

/**
 * Writes the given grammar to a file in the `language/syntaxes` directory.
 * @param {object} grammar The grammar definition.
 * @param {string} name The file name.
 */
export async function writeGrammarFile(grammar, name) {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(dirname, "../..");
  const generator = path.join(dirname, "generate.mjs");

  await fs.writeFile(
    path.resolve(root, "language", "syntaxes", name),
    JSON.stringify(
      {
        information_for_contributors: [
          `This file has been generated by '${path.relative(root, generator).replace(/\\/g, "/")}'.`,
          "Any changes should be made in that script, then use `npm run grammars-generate` to regenerate this file."
        ],
        ...grammar
      },
      undefined,
      2
    ) + "\n"
  );
}

/**
 * @typedef NameCapture
 * @property {string} name The name of the capture.
 */

/**
 * @typedef IncludeCapture
 * @property {string} include The name of the rule to include.
 */

/**
 * @typedef PatternsCapture
 * @property {string} [begin] The pattern to match the beginning of a range.
 * @property {string} [end] The pattern to match the end of a range.
 * @property {(IncludeCapture | NameCapture)[]} patterns The patterns to match in the captured text.
 */

/**
 * @typedef {IncludeCapture | NameCapture | PatternsCapture} Capture
 */

/**
 * @typedef Rule
 * @property {string} begin The pattern matching the beginning of the range.
 * @property {Record<number, Capture>} beginCaptures The captures for the `begin` pattern.
 * @property {string} end The pattern matching the end of the range.
 * @property {(IncludeCapture | NameCapture | PatternsCapture)[]} patterns The patterns to match in the content.
 * @property {string} [name] The name of the matched portion.
 */

/**
 * @typedef {Rule & { contentName?: string }} RuleWithContentName
 */

/**
 * @typedef {Pick<Rule, 'begin' | 'beginCaptures' | 'end'>} BeginAndEnd
 */

/**
 * @typedef {Pick<Rule, 'begin' | 'beginCaptures'>} Begin
 */

/**
 * @typedef CaptureSegment
 * @property {string} pattern The pattern matching the beginning of the range.
 * @property {(Capture | undefined)[]} captures The captures for the `begin` pattern.
 *                                              Each element corresponds to the one-based capture group.
 *                                              Use an `undefined` element to skip a capture group.
 */
