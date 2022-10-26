/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// From azure pipelines UI.
//   Class names have been changed to work with Primer styles
//   Source: https://github.com/microsoft/azure-devops-ui/blob/22b5ae5969d405f4459caf9b020019e95bbded38/packages/azure-pipelines-ui/src/Utilities/Parser.ts#L1
import {ILine, IParseNode, IParsedFindResult, NodeType} from './parserTypes'
import {TemplateResult, html} from 'lit-html/lit-html'

// #region ANSII section

const ESC = '\u001b'
const TimestampLength = 29
const TimestampRegex = /^.{27}Z /gm
const BrightClassPostfix = '-br'

// match characters that could be enclosing url to cleanly handle url formatting
export const URLRegex = /([{([]*https?:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.[^\s<>|'",]{2,})/gi
// URLs in logs can be wrapped in punctuation to assist with parsing
const URLPunctuation = {
  '(': ')',
  '[': ']',
  '{': '}'
}
type URLStartPunctuation = keyof typeof URLPunctuation
type URLEndPunctuation = typeof URLPunctuation[URLStartPunctuation]
const matchingURLPunctuation = (ch: string): URLEndPunctuation => URLPunctuation[ch as URLStartPunctuation]
const regexpEscape = (ch: string) => `\\${ch}`

/**
 * Regex for matching ANSII escape codes
 * \u001b - ESC character
 * ?: Non-capturing group
 * (?:\u001b[) : Match ESC[
 * (?:[\?|#])??: Match also ? and # formats that we don't supports but want to eat our special characters to get rid of ESC character
 * (?:[0-9]{1,3})?: Match one or more occurances of the simple format we want with out semicolon
 * (?:(?:;[0-9]{0,3})*)?: Match one or more occurances of the format we want with semicolon
 */
// eslint-disable-next-line no-control-regex
const _ansiEscapeCodeRegex = /(?:\u001b\[)(?:[?|#])?(?:(?:[0-9]{1,3})?(?:(?:;[0-9]{0,3})*)?[A-Z|a-z])/

/**
 * http://ascii-table.com/ansi-escape-sequences.php
 * https://en.wikipedia.org/wiki/ANSI_escape_code#3/4_bit
 * We support sequences of format:
 *  Esc[CONTENTHEREm
 *  Where CONTENTHERE can be of format: VALUE;VALUE;VALUE or VALUE
 *      Where VALUE is SGR parameter https://www.vt100.net/docs/vt510-rm/SGR
 *          We support: 0 (reset), 1 (bold), 3 (italic), 4 (underline), 22 (not bold), 23 (not italic), 24 (not underline), 38 (set fg), 39 (default fg), 48 (set bg), 49 (default bg),
 *                      fg colors - 30 (black), 31 (red), 32 (green), 33 (yellow), 34 (blue), 35 (magenta), 36 (cyan), 37 (white), 90 (grey)
 *                        with more brighness - 91 (red), 92 (green), 93 (yellow), 94 (blue), 95 (magenta), 96 (cyan), 97 (white)
 *                      bg colors - 40 (black), 41 (red), 42 (green), 43 (yellow), 44 (blue), 45 (magenta), 46 (cyan), 47 (white), 100 (grey)
 *                        with more brighness- 101 (red), 102 (green), 103 (yellow), 104 (blue), 105 (magenta), 106 (cyan), 107 (white)
 *  Where m refers to the "Graphics mode"
 *
 * 8-bit color is supported
 *  https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit
 *  Esc[38;5;<n> To set the foreground color
 *  Esc[48;5;<n> To set the background color
 *  n can be from 0-255
 *  0-7 are standard colors that match the 4_bit color palette
 *  8-15 are high intensity colors that match the 4_bit high intensity color palette
 *  16-231 are 216 colors that cover the entire spectrum
 *  232-255 are grayscale colors that go from black to white in 24 steps
 *
 * 24-bit color is also supported
 *  https://en.wikipedia.org/wiki/ANSI_escape_code#24-bit
 *  Esc[38;2;<r>;<g>;<b> To set the foreground color
 *  Esc[48;2;<r>;<g>;<b> To set the background color
 *  Where r,g and b must be between 0-255
 */
// #endregion ANSII section

// #region Pipelines commands
enum Resets {
  Reset = '0',
  Bold = '22',
  Italic = '23',
  Underline = '24',
  Set_Fg = '38',
  Default_Fg = '39',
  Set_Bg = '48',
  Default_Bg = '49'
}

const specials = {
  '1': 'bold',
  '3': 'italic',
  '4': 'underline'
} as {[key: string]: string}

const bgColors = {
  // 40 (black), 41 (red), 42 (green), 43 (yellow), 44 (blue), 45 (magenta), 46 (cyan), 47 (white), 100 (grey)
  '40': 'b',
  '41': 'r',
  '42': 'g',
  '43': 'y',
  '44': 'bl',
  '45': 'm',
  '46': 'c',
  '47': 'w',
  '100': 'gr'
} as {[key: string]: string}

const fgColors = {
  // 30 (black), 31 (red), 32 (green), 33 (yellow), 34 (blue), 35 (magenta), 36 (cyan), 37 (white), 90 (grey)
  '30': 'b',
  '31': 'r',
  '32': 'g',
  '33': 'y',
  '34': 'bl',
  '35': 'm',
  '36': 'c',
  '37': 'w',
  '90': 'gr'
} as {[key: string]: string}

const base8BitColors = {
  // 0 (black), 1 (red), 2 (green), 3 (yellow), 4 (blue), 5 (magenta), 6 (cyan), 7 (white), 8 (grey)
  '0': 'b',
  '1': 'r',
  '2': 'g',
  '3': 'y',
  '4': 'bl',
  '5': 'm',
  '6': 'c',
  '7': 'w'
} as Record<string, string>

//0-255 in 6 increments, used to generate 216 equally incrementing colors
const colorIncrements216 = {
  0: 0,
  1: 51,
  2: 102,
  3: 153,
  4: 204,
  5: 255
} as Record<number, number>

const PLAIN = 'plain'
const COMMAND = 'command'
const DEBUG = 'debug'
const ERROR = 'error'
const INFO = 'info'
const SECTION = 'section'
const VERBOSE = 'verbose'
const WARNING = 'warning'
const GROUP = 'group'
const END_GROUP = 'endgroup'
const ICON = 'icon'
const NOTICE = 'notice'

const commandToType: {[command: string]: NodeType} = {
  command: NodeType.Command,
  debug: NodeType.Debug,
  error: NodeType.Error,
  info: NodeType.Info,
  section: NodeType.Section,
  verbose: NodeType.Verbose,
  warning: NodeType.Warning,
  notice: NodeType.Notice,
  group: NodeType.Group,
  endgroup: NodeType.EndGroup,
  icon: NodeType.Icon
}

const typeToCommand: {[type: string]: string} = {
  '0': PLAIN,
  '1': COMMAND,
  '2': DEBUG,
  '3': ERROR,
  '4': INFO,
  '5': SECTION,
  '6': VERBOSE,
  '7': WARNING,
  '8': GROUP,
  '9': END_GROUP,
  '10': ICON,
  '11': NOTICE
}

// Store the max command length we support, for example, we support "section", "command" which are of length 7, which highest of all others
const maxCommandLength = 8
const supportedCommands = [COMMAND, DEBUG, ERROR, INFO, SECTION, VERBOSE, WARNING, GROUP, END_GROUP, ICON, NOTICE]

export function getType(node: IParseNode) {
  return typeToCommand[node.type]
}
// #endregion Pipelines commands

export function getText(text: string) {
  return (text || '').toLocaleLowerCase()
}
// #endregion Common functions

export interface IStyle {
  fg: string
  bg: string
  isFgRGB: boolean
  isBgRGB: boolean
  bold: boolean
  italic: boolean
  underline: boolean
  [key: string]: boolean | string
}

interface IRGBColor {
  r: number
  g: number
  b: number
}

interface IAnsiEscapeCodeState {
  output: string
  style?: IStyle
}

enum CharacterType {
  Standard,
  Search,
  EOL
}

// Set max to prevent any perf degradations
export const maxLineMatchesToParse = 100

const maxMatches = 50
const unsetValue = -1
const newLineChar = '\n'
const hashChar = '#'
const commandStart = '['
const commandEnd = ']'

export class Parser {
  /**
   * Converts the content to HTML with appropriate styles, escapes content to prevent XSS
   * @param content
   */
  public parse(content: string): TemplateResult {
    let result = html``
    const states = this.getStates(content)
    for (const x of states) {
      const classNames: string[] = []
      const styles: string[] = []
      const currentText = x.output
      if (x.style) {
        const fg = x.style.fg
        const bg = x.style.bg
        const isFgRGB = x.style.isFgRGB
        const isBgRGB = x.style.isBgRGB
        if (fg && !isFgRGB) {
          classNames.push(`ansifg-${fg}`)
        }
        if (bg && !isBgRGB) {
          classNames.push(`ansibg-${bg}`)
          classNames.push(`d-inline-flex`)
        }
        if (fg && isFgRGB) {
          styles.push(`color:rgb(${fg})`)
        }
        if (bg && isBgRGB) {
          styles.push(`background-color:rgb(${bg})`)
          classNames.push(`d-inline-flex`)
        }
        if (x.style.bold) {
          classNames.push('text-bold')
        }
        if (x.style.italic) {
          classNames.push('text-italic')
        }
        if (x.style.underline) {
          classNames.push('text-underline')
        }
      }

      let output
      const parseResult = Array(currentText.length).fill(CharacterType.Standard)

      result = html`${result}<span class="${classNames.join(' ')}" style="${styles.join(';')}">${output}</span>`
    }

    return result
  }

  /**
   * Parses the content into lines with nodes
   * @param content content to parse
   */
  public parseLines(content: string): ILine[] {
    // lines we return
    const lines: ILine[] = []
    // accumulated nodes for a particular line
    let nodes: IParseNode[] = []

    // start of a particular line
    let lineStartIndex = 0
    // start of plain node content
    let plainNodeStart = unsetValue

    // tells to consider the default logic where we check for plain text etc.,
    let considerDefaultLogic = true

    // stores the command, to match one of the 'supportedCommands'
    let currentCommand = ''
    // helps in finding commands in our format "##[command]" or "[command]"
    let commandSeeker = ''

    // when line ends, this tells if there's any pending node
    let pendingLastNode: number = unsetValue

    const resetCommandVar = () => {
      commandSeeker = ''
      currentCommand = ''
    }

    const resetPlain = () => {
      plainNodeStart = unsetValue
    }

    const resetPending = () => {
      pendingLastNode = unsetValue
    }

    const parseCommandEnd = () => {
      // possible continuation of our well-known commands
      const commandIndex = supportedCommands.indexOf(currentCommand)
      if (commandIndex !== -1) {
        considerDefaultLogic = false
        // we reached the end and found the command
        resetPlain()
        // command is for the whole line, so we are not pushing the node here but defering this to when we find the new line
        pendingLastNode = commandToType[currentCommand]

        if (
          currentCommand === SECTION ||
          currentCommand === GROUP ||
          currentCommand === END_GROUP ||
          currentCommand === COMMAND ||
          currentCommand === ERROR ||
          currentCommand === WARNING ||
          currentCommand === NOTICE
        ) {
          // strip off ##[$(currentCommand)] if there are no timestamps at start
          const possibleTimestamp = content.substring(lineStartIndex, lineStartIndex + TimestampLength) || ''
          if (!possibleTimestamp.match(TimestampRegex)) {
            // Replace command only if it's found at the beginning of the line
            if (possibleTimestamp.indexOf(currentCommand) < 4) {
              // ## is optional, so pick the right offset
              const offset = content.substring(lineStartIndex, lineStartIndex + 2) === '##' ? 4 : 2
              lineStartIndex = lineStartIndex + offset + currentCommand.length
            }
          }
        }

        if (currentCommand === GROUP) {
          groupStarted = true
        }

        // group logic- happyCase1: we found endGroup and there's already a group starting
        if (currentCommand === END_GROUP && currentGroupNode) {
          groupEnded = true
        }
      }

      resetCommandVar()
    }

    let groupStarted = false
    let groupEnded = false
    let currentGroupNode: IParseNode | undefined
    let nodeIndex = 0
    let groupCount = 0

    for (let index = 0; index < content.length; index++) {
      const char = content.charAt(index)
      // start with considering default logic, individual conditions are responsible to set it false
      considerDefaultLogic = true
      if (char === newLineChar || index === content.length - 1) {
        if (char === commandEnd) {
          parseCommandEnd()
        }

        const node = {
          type: pendingLastNode,
          start: lineStartIndex,
          end: index,
          lineIndex: lines.length,
          groupCount
        } as IParseNode

        let pushNode = false
        // end of the line/text, push any final nodes
        if (pendingLastNode !== NodeType.Plain) {
          // there's pending special node to be pushed
          pushNode = true
          // a new group has just started
          if (groupStarted) {
            currentGroupNode = node
            groupStarted = false
          }

          // a group has ended
          if (groupEnded && currentGroupNode) {
            // links to specifc lines in the UI need to match exactly what was provided by the runner for things like annotations so nodes can't be discarded
            // lineIndexes are further adjusted based on the number of groups to ensure consistent and continuout numbering of lines in the UI
            pushNode = true
            node.group = {
              lineIndex: currentGroupNode.lineIndex - 1,
              nodeIndex: currentGroupNode.index
            }
            node.groupCount = groupCount
            currentGroupNode.isGroup = true

            // since group has ended, clear all of our pointers
            groupEnded = false
            currentGroupNode = undefined
            groupCount++
          }
        } else if (pendingLastNode === NodeType.Plain) {
          // there's pending plain node to be pushed
          pushNode = true
        }

        if (pushNode) {
          node.index = nodeIndex++
          nodes.push(node)
        }

        // A group is pending
        if (currentGroupNode && node !== currentGroupNode) {
          node.group = {
            lineIndex: currentGroupNode.lineIndex,
            nodeIndex: currentGroupNode.index
          }
        }

        // end of the line, push all nodes that are accumulated till now
        if (nodes.length > 0) {
          lines.push({nodes})
        }

        // clear node as we are done with the line
        nodes = []
        // increment lineStart for the next line
        lineStartIndex = index + 1
        // unset
        resetPlain()
        resetPending()
        resetCommandVar()

        considerDefaultLogic = false
      } else if (char === hashChar) {
        // possible start of our well-known commands
        if (commandSeeker === '' || commandSeeker === '#') {
          considerDefaultLogic = false
          commandSeeker += hashChar
        }
      } else if (char === commandStart) {
        // possible continuation of our well-known commands
        if (commandSeeker === '##') {
          considerDefaultLogic = false
          commandSeeker += commandStart
        } else if (commandSeeker.length === 0) {
          // covers - "", for live logs, commands will be of [section], with out "##"
          considerDefaultLogic = false
          commandSeeker += commandStart
        }
      } else if (char === commandEnd) {
        if (currentCommand === ICON) {
          const startIndex = index + 1
          let endIndex = startIndex
          for (let i = startIndex; i < content.length; i++) {
            const iconChar = content[i]
            if (iconChar === ' ') {
              endIndex = i
              break
            }
          }
          nodes.push({
            type: NodeType.Icon,
            lineIndex: lines.length,
            start: startIndex,
            end: endIndex,
            index: nodeIndex++,
            groupCount
          })
          // jump to post Icon content
          index = endIndex + 1
          lineStartIndex = index
          continue
        } else {
          parseCommandEnd()
        }
      }

      if (considerDefaultLogic) {
        if (commandSeeker === '##[' || commandSeeker === '[') {
          // it's possible that we are parsing a command
          currentCommand += char.toLowerCase()
        }

        if (currentCommand.length > maxCommandLength) {
          // to avoid accumulating command unncessarily, let's check max length, if it exceeds, it's not a command
          resetCommandVar()
        }

        // considering as plain text
        if (plainNodeStart === unsetValue) {
          // we didn't set this yet, set now
          plainNodeStart = lineStartIndex
          // set pending node if there isn't one pending
          if (pendingLastNode === unsetValue) {
            pendingLastNode = NodeType.Plain
          }
        }
      }
    }

    return lines
  }

  /**
   * Parses the content into ANSII states
   * @param content content to parse
   */
  public getStates(content: string): IAnsiEscapeCodeState[] {
    const result: IAnsiEscapeCodeState[] = []
    // Eg: "ESC[0KESC[33;1mWorker informationESC[0m
    if (!_ansiEscapeCodeRegex.test(content)) {
      // Not of interest, don't touch content
      return [
        {
          output: content
        }
      ]
    }

    let command = ''
    let currentText = ''
    let code = ''
    let state = {} as IAnsiEscapeCodeState
    let isCommandActive = false
    let codes = []
    for (let index = 0; index < content.length; index++) {
      const character = content[index]
      if (isCommandActive) {
        if (character === ';') {
          if (code) {
            codes.push(code)
            code = ''
          }
        } else if (character === 'm') {
          if (code) {
            isCommandActive = false
            // done
            codes.push(code)
            state.style = state.style || ({} as IStyle)

            let setForeground = false
            let setBackground = false
            let isSingleColorCode = false
            let isRGBColorCode = false
            const rgbColors: number[] = []

            for (const currentCode of codes) {
              const style = state.style
              const codeNumber = parseInt(currentCode)
              if (setForeground && isSingleColorCode) {
                // set foreground color using 8-bit (256 color) palette - Esc[ 38:5:<n> m
                if (codeNumber >= 0 && codeNumber < 16) {
                  style.fg = this._get8BitColorClasses(codeNumber)
                } else if (codeNumber >= 16 && codeNumber < 256) {
                  style.fg = this._get8BitRGBColors(codeNumber)
                  style.isFgRGB = true
                }
                setForeground = false
                isSingleColorCode = false
              } else if (setForeground && isRGBColorCode) {
                // set foreground color using 24-bit (true color) palette - Esc[ 38:2:<r>:<g>:<b> m
                if (codeNumber >= 0 && codeNumber < 256) {
                  rgbColors.push(codeNumber)
                  if (rgbColors.length === 3) {
                    style.fg = `${rgbColors[0]},${rgbColors[1]},${rgbColors[2]}`
                    style.isFgRGB = true
                    rgbColors.length = 0 // clear array
                    setForeground = false
                    isRGBColorCode = false
                  }
                }
              } else if (setBackground && isSingleColorCode) {
                // set background color using 8-bit (256 color) palette - Esc[ 48:5:<n> m
                if (codeNumber >= 0 && codeNumber < 16) {
                  style.bg = this._get8BitColorClasses(codeNumber)
                } else if (codeNumber >= 16 && codeNumber < 256) {
                  style.bg = this._get8BitRGBColors(codeNumber)
                  style.isBgRGB = true
                }
                setBackground = false
                isSingleColorCode = false
              } else if (setBackground && isRGBColorCode) {
                // set background color using 24-bit (true color) palette - Esc[ 48:2:<r>:<g>:<b> m
                if (codeNumber >= 0 && codeNumber < 256) {
                  rgbColors.push(codeNumber)
                  if (rgbColors.length === 3) {
                    style.bg = `${rgbColors[0]},${rgbColors[1]},${rgbColors[2]}`
                    style.isBgRGB = true
                    rgbColors.length = 0 // clear array
                    setBackground = false
                    isRGBColorCode = false
                  }
                }
              } else if (setForeground || setBackground) {
                if (codeNumber === 5) {
                  isSingleColorCode = true
                } else if (codeNumber === 2) {
                  isRGBColorCode = true
                }
              } else if (fgColors[currentCode]) {
                style.fg = fgColors[currentCode]
              } else if (bgColors[currentCode]) {
                style.bg = bgColors[currentCode]
              } else if (currentCode === Resets.Reset) {
                // reset
                state.style = {} as IStyle
              } else if (currentCode === Resets.Set_Bg) {
                setBackground = true
              } else if (currentCode === Resets.Set_Fg) {
                setForeground = true
              } else if (currentCode === Resets.Default_Fg) {
                style.fg = ''
              } else if (currentCode === Resets.Default_Bg) {
                style.bg = ''
              } else if (codeNumber >= 91 && codeNumber <= 97) {
                style.fg = fgColors[codeNumber - 60] + BrightClassPostfix
              } else if (codeNumber >= 101 && codeNumber <= 107) {
                style.bg = bgColors[codeNumber - 60] + BrightClassPostfix
              } else if (specials[currentCode]) {
                style[specials[currentCode]] = true
              } else if (currentCode === Resets.Bold) {
                style.bold = false
              } else if (currentCode === Resets.Italic) {
                style.italic = false
              } else if (currentCode === Resets.Underline) {
                style.underline = false
              }
            }

            // clear
            command = ''
            currentText = ''
            code = ''
          } else {
            // To handle ESC[m, we should just ignore them
            isCommandActive = false
            command = ''
            state.style = {} as IStyle
          }

          codes = []
        } else if (isNaN(parseInt(character))) {
          // if this is not a number, eg: 0K, this isn't something we support
          code = ''
          isCommandActive = false
          command = ''
        } else if (code.length === 4) {
          // we probably got code that we don't support, ignore
          code = ''
          isCommandActive = false
          if (character !== ESC) {
            // if this is not an ESC, let's not consider command from now on
            // eg: ESC[0Ksometexthere, at this point, code would be 0K, character would be 's'
            command = ''
            currentText += character
          }
        } else {
          code += character
        }

        continue
      } else if (command) {
        if (command === ESC && character === '[') {
          isCommandActive = true
          // push state
          if (currentText) {
            state.output = currentText
            result.push(state)
            // deep copy exisiting style for the line to preserve different styles between commands
            let previousStyle
            if (state.style) {
              previousStyle = Object.assign({}, state.style)
            }
            state = {} as IAnsiEscapeCodeState
            if (previousStyle) {
              state.style = previousStyle
            }
            currentText = ''
          }
        }

        continue
      }

      if (character === ESC) {
        command = character
      } else {
        currentText += character
      }
    }

    // still pending text
    if (currentText) {
      state.output = currentText + (command ? command : '')
      result.push(state)
    }

    return result
  }

  /**
   * With 8 bit colors, from 16-256, rgb color combinations are used
   * 16-231 (216 colors) is a 6 x 6 x 6 color cube
   * 232 - 256 are grayscale colors
   * @param codeNumber 16-256 number
   */
  private _get8BitRGBColors(codeNumber: number): string {
    let rgbColor: IRGBColor
    if (codeNumber < 232) {
      rgbColor = this._get216Color(codeNumber - 16)
    } else {
      rgbColor = this._get8bitGrayscale(codeNumber - 232)
    }
    return `${rgbColor.r},${rgbColor.g},${rgbColor.b}`
  }

  /**
   * With 8 bit color, from 0-15, css classes are used to represent customer colors
   * @param codeNumber 0-15 number that indicates the standard or high intensity color code that should be used
   */
  private _get8BitColorClasses(codeNumber: number): string {
    let colorClass = ''
    if (codeNumber < 8) {
      colorClass = `${base8BitColors[codeNumber]}`
    } else {
      colorClass = `${base8BitColors[codeNumber - 8] + BrightClassPostfix}`
    }
    return colorClass
  }

  /**
   * 6 x 6 x 6 (216 colors) rgb color generator
   * https://en.wikipedia.org/wiki/Web_colors#Web-safe_colors
   * @param increment 0-215 value
   */
  private _get216Color(increment: number): IRGBColor {
    return {
      r: colorIncrements216[Math.floor(increment / 36)],
      g: colorIncrements216[Math.floor(increment / 6) % 6],
      b: colorIncrements216[increment % 6]
    }
  }

  /**
   * Grayscale from black to white in 24 steps. The first value of 0 represents rgb(8,8,8) while the last value represents rgb(238,238,238)
   * @param increment 0-23 value
   */
  private _get8bitGrayscale(increment: number): IRGBColor {
    const colorCode = increment * 10 + 8
    return {
      r: colorCode,
      g: colorCode,
      b: colorCode
    }
  }
}
