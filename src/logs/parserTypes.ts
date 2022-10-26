export const enum NodeType {
  Plain = 0,
  Command = 1,
  Debug = 2,
  Error = 3,
  Info = 4,
  Section = 5,
  Verbose = 6,
  Warning = 7,
  Group = 8,
  EndGroup = 9,
  Icon = 10,
  Notice = 11
}

interface IGroupInfo {
  lineIndex: number;
  nodeIndex: number;
}

export interface ISectionFind {
  line: number;
}

interface IFindResult {
  lines: ISectionFind[];
  text: string;
}

export interface IParsedFindResult extends IFindResult {
  selectedLine: number;
}

export interface IParseNode {
  type: NodeType;
  /**
   * Index of the node inside ILine
   */
  index: number;
  /**
   * Index of the ILine this node belongs to
   */
  lineIndex: number;
  /**
   * Starting index of content
   */
  start: number;
  /**
   * Ending index of content
   */
  end: number;
  /**
   * If this is part of a group, this will refer to the node that's a group
   */
  group?: IGroupInfo;
  /**
   * If this is a group, this would be set
   */
  isGroup?: boolean;
  /**
   *  The number of groups before this node
   */
  groupCount: number;
}

export interface ILine {
  nodes: IParseNode[];
}
