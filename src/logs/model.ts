const ansiColorRE = /\u001b\[((?:\d+;?)+)m(.*)\u001b\[0m/gm;
const groupMarker = '##[group]';
const commandRE = /##\[[a-z]+\]/gm;

export enum Type {
  Setup,
  Step
}

export interface LogSection {
  type: Type;
  start: number;
  end: number;
  name?: string;
}

export interface LogColorInfo {
  line: number;
  start: number;
  end: number;

  color: CustomColor;
}

export interface CustomColor {
  foreground?: string;
  background?: string;
}

export interface LogInfo {
  updatedLog: string;
  sections: LogSection[];
  colorFormats: LogColorInfo[];
}

export function parseLog(log: string): LogInfo {
  let firstSection: LogSection | null = {
    name: 'Setup',
    type: Type.Setup,
    start: 0,
    end: 1
  };

  // Assume there is always the setup section
  const sections: LogSection[] = [firstSection];

  const colorInfo: LogColorInfo[] = [];

  let currentRange: LogSection | null = null;
  const lines = log.split(/\n|\r/).filter(l => !!l);
  let lineIdx = 0;

  for (const line of lines) {
    // Groups
    const groupMarkerStart = line.indexOf(groupMarker);
    if (groupMarkerStart !== -1) {
      // If this is the first group marker we encounter, the previous range was the job setup
      if (firstSection) {
        firstSection.end = lineIdx - 1;
        firstSection = null;
      }

      if (currentRange) {
        currentRange.end = lineIdx - 1;
        sections.push(currentRange);
      }

      const name = line.substr(groupMarkerStart + groupMarker.length);

      currentRange = {
        name,
        type: Type.Step,
        start: lineIdx,
        end: lineIdx + 1
      };
    }

    // Remove commands
    lines[lineIdx] = line.replace(commandRE, '');

    // Check for custom colors
    let match: RegExpExecArray | null;
    if ((match = ansiColorRE.exec(line))) {
      const colorConfig = match[1];
      const text = match[2];

      colorInfo.push({
        line: lineIdx,
        color: parseCustomColor(colorConfig),
        start: match.index,
        end: match.index + text.length
      });

      // Remove from output
      lines[lineIdx] = line.replace(ansiColorRE, text);
    }

    ++lineIdx;
  }

  if (currentRange) {
    currentRange.end = lineIdx - 1;
    sections.push(currentRange);
  }

  return {
    updatedLog: lines.join('\n'),
    sections,
    colorFormats: colorInfo
  };
}

function parseCustomColor(str: string): CustomColor {
  const ret: CustomColor = {};

  const segments = str.split(';');
  if (segments.length > 0) {
    ret.foreground = segments[0];
  }

  if (segments.length > 1) {
    ret.background = segments[1];
  }

  return ret;
}
