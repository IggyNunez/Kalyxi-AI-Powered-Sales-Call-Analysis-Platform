/**
 * Google Meet and Docs API TypeScript Types
 * Server-only types for Google API responses
 */

// ===== Service Account =====
export interface GoogleServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}

// ===== Meet API Types =====

export type TranscriptState =
  | "STATE_UNSPECIFIED"
  | "STARTED"
  | "ENDED"
  | "FILE_GENERATED";

export interface ConferenceRecord {
  name: string; // e.g., "conferenceRecords/abc123"
  startTime: string; // RFC 3339 timestamp
  endTime?: string; // RFC 3339 timestamp
  expireTime?: string; // RFC 3339 timestamp
  space?: {
    name: string;
    meetingUri: string;
    meetingCode: string;
    config?: {
      accessType?: string;
      entryPointAccess?: string;
    };
  };
}

export interface ListConferenceRecordsResponse {
  conferenceRecords?: ConferenceRecord[];
  nextPageToken?: string;
}

export interface Transcript {
  name: string; // e.g., "conferenceRecords/abc123/transcripts/xyz789"
  state: TranscriptState;
  startTime?: string;
  endTime?: string;
  docsDestination?: {
    document: string; // Google Docs document ID
    exportUri: string; // URI to export the transcript
  };
}

export interface ListTranscriptsResponse {
  transcripts?: Transcript[];
  nextPageToken?: string;
}

export interface TranscriptEntry {
  name: string;
  participant: string;
  text: string;
  languageCode: string;
  startTime: string;
  endTime: string;
}

export interface ListTranscriptEntriesResponse {
  transcriptEntries?: TranscriptEntry[];
  nextPageToken?: string;
}

// ===== Docs API Types =====

export interface GoogleDocsDocument {
  documentId: string;
  title: string;
  body?: {
    content?: StructuralElement[];
  };
  headers?: Record<string, Header>;
  footers?: Record<string, Footer>;
  footnotes?: Record<string, Footnote>;
  documentStyle?: DocumentStyle;
  namedStyles?: NamedStyles;
  revisionId?: string;
  suggestionsViewMode?: string;
  inlineObjects?: Record<string, InlineObject>;
  positionedObjects?: Record<string, PositionedObject>;
}

export interface StructuralElement {
  startIndex: number;
  endIndex: number;
  paragraph?: Paragraph;
  sectionBreak?: SectionBreak;
  table?: Table;
  tableOfContents?: TableOfContents;
}

export interface Paragraph {
  elements?: ParagraphElement[];
  paragraphStyle?: ParagraphStyle;
  bullet?: Bullet;
}

export interface ParagraphElement {
  startIndex?: number;
  endIndex?: number;
  textRun?: TextRun;
  inlineObjectElement?: InlineObjectElement;
  pageBreak?: object;
  horizontalRule?: object;
  footnoteReference?: FootnoteReference;
  autoText?: AutoText;
  equation?: Equation;
  columnBreak?: object;
  person?: Person;
  richLink?: RichLink;
}

export interface TextRun {
  content: string;
  textStyle?: TextStyle;
  suggestedInsertionIds?: string[];
  suggestedDeletionIds?: string[];
  suggestedTextStyleChanges?: Record<string, object>;
}

export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  smallCaps?: boolean;
  backgroundColor?: OptionalColor;
  foregroundColor?: OptionalColor;
  fontSize?: Dimension;
  weightedFontFamily?: WeightedFontFamily;
  baselineOffset?: string;
  link?: Link;
}

// Simplified types for the less-used structures
export interface Header {
  headerId: string;
  content: StructuralElement[];
}

export interface Footer {
  footerId: string;
  content: StructuralElement[];
}

export interface Footnote {
  footnoteId: string;
  content: StructuralElement[];
}

export interface DocumentStyle {
  background?: Background;
  defaultHeaderId?: string;
  defaultFooterId?: string;
  evenPageHeaderId?: string;
  evenPageFooterId?: string;
  firstPageHeaderId?: string;
  firstPageFooterId?: string;
  useFirstPageHeaderFooter?: boolean;
  useEvenPageHeaderFooter?: boolean;
  pageNumberStart?: number;
  marginTop?: Dimension;
  marginBottom?: Dimension;
  marginRight?: Dimension;
  marginLeft?: Dimension;
  pageSize?: Size;
  marginHeader?: Dimension;
  marginFooter?: Dimension;
  useCustomHeaderFooterMargins?: boolean;
}

export interface NamedStyles {
  styles: NamedStyle[];
}

export interface NamedStyle {
  namedStyleType: string;
  textStyle?: TextStyle;
  paragraphStyle?: ParagraphStyle;
}

export interface ParagraphStyle {
  headingId?: string;
  namedStyleType?: string;
  alignment?: string;
  lineSpacing?: number;
  direction?: string;
  spacingMode?: string;
  spaceAbove?: Dimension;
  spaceBelow?: Dimension;
  borderBetween?: ParagraphBorder;
  borderTop?: ParagraphBorder;
  borderBottom?: ParagraphBorder;
  borderLeft?: ParagraphBorder;
  borderRight?: ParagraphBorder;
  indentFirstLine?: Dimension;
  indentStart?: Dimension;
  indentEnd?: Dimension;
  tabStops?: TabStop[];
  keepLinesTogether?: boolean;
  keepWithNext?: boolean;
  avoidWidowAndOrphan?: boolean;
  shading?: Shading;
  pageBreakBefore?: boolean;
}

export interface Bullet {
  listId: string;
  nestingLevel?: number;
  textStyle?: TextStyle;
}

export interface SectionBreak {
  sectionStyle?: SectionStyle;
}

export interface SectionStyle {
  columnProperties?: ColumnProperties[];
  columnSeparatorStyle?: string;
  contentDirection?: string;
  marginTop?: Dimension;
  marginBottom?: Dimension;
  marginRight?: Dimension;
  marginLeft?: Dimension;
  marginHeader?: Dimension;
  marginFooter?: Dimension;
  sectionType?: string;
  defaultHeaderId?: string;
  defaultFooterId?: string;
  firstPageHeaderId?: string;
  firstPageFooterId?: string;
  evenPageHeaderId?: string;
  evenPageFooterId?: string;
  pageNumberStart?: number;
  useFirstPageHeaderFooter?: boolean;
}

export interface ColumnProperties {
  width?: Dimension;
  paddingEnd?: Dimension;
}

export interface Table {
  rows: number;
  columns: number;
  tableRows?: TableRow[];
  suggestedInsertionIds?: string[];
  suggestedDeletionIds?: string[];
  tableStyle?: TableStyle;
}

export interface TableRow {
  startIndex?: number;
  endIndex?: number;
  tableCells?: TableCell[];
  suggestedInsertionIds?: string[];
  suggestedDeletionIds?: string[];
  tableRowStyle?: TableRowStyle;
  suggestedTableRowStyleChanges?: Record<string, object>;
}

export interface TableCell {
  startIndex?: number;
  endIndex?: number;
  content?: StructuralElement[];
  tableCellStyle?: TableCellStyle;
  suggestedInsertionIds?: string[];
  suggestedDeletionIds?: string[];
  suggestedTableCellStyleChanges?: Record<string, object>;
}

export interface TableStyle {
  tableColumnProperties?: TableColumnProperties[];
}

export interface TableColumnProperties {
  widthType?: string;
  width?: Dimension;
}

export interface TableRowStyle {
  minRowHeight?: Dimension;
  tableHeader?: boolean;
  preventOverflow?: boolean;
}

export interface TableCellStyle {
  rowSpan?: number;
  columnSpan?: number;
  backgroundColor?: OptionalColor;
  borderLeft?: TableCellBorder;
  borderRight?: TableCellBorder;
  borderTop?: TableCellBorder;
  borderBottom?: TableCellBorder;
  paddingLeft?: Dimension;
  paddingRight?: Dimension;
  paddingTop?: Dimension;
  paddingBottom?: Dimension;
  contentAlignment?: string;
}

export interface TableCellBorder {
  color?: OptionalColor;
  width?: Dimension;
  dashStyle?: string;
}

export interface TableOfContents {
  content?: StructuralElement[];
  suggestedInsertionIds?: string[];
  suggestedDeletionIds?: string[];
}

export interface InlineObject {
  objectId: string;
  inlineObjectProperties?: InlineObjectProperties;
  suggestedInlineObjectPropertiesChanges?: Record<string, object>;
  suggestedInsertionId?: string;
  suggestedDeletionIds?: string[];
}

export interface InlineObjectProperties {
  embeddedObject?: EmbeddedObject;
}

export interface EmbeddedObject {
  title?: string;
  description?: string;
  embeddedObjectBorder?: EmbeddedObjectBorder;
  size?: Size;
  marginTop?: Dimension;
  marginBottom?: Dimension;
  marginRight?: Dimension;
  marginLeft?: Dimension;
  linkedContentReference?: LinkedContentReference;
  imageProperties?: ImageProperties;
  embeddedDrawingProperties?: object;
}

export interface EmbeddedObjectBorder {
  color?: OptionalColor;
  width?: Dimension;
  dashStyle?: string;
  propertyState?: string;
}

export interface ImageProperties {
  contentUri?: string;
  sourceUri?: string;
  brightness?: number;
  contrast?: number;
  transparency?: number;
  cropProperties?: CropProperties;
  angle?: number;
}

export interface CropProperties {
  offsetLeft?: number;
  offsetRight?: number;
  offsetTop?: number;
  offsetBottom?: number;
  angle?: number;
}

export interface LinkedContentReference {
  sheetsChartReference?: SheetsChartReference;
}

export interface SheetsChartReference {
  spreadsheetId?: string;
  chartId?: number;
}

export interface PositionedObject {
  objectId: string;
  positionedObjectProperties?: PositionedObjectProperties;
  suggestedPositionedObjectPropertiesChanges?: Record<string, object>;
  suggestedInsertionId?: string;
  suggestedDeletionIds?: string[];
}

export interface PositionedObjectProperties {
  positioning?: PositionedObjectPositioning;
  embeddedObject?: EmbeddedObject;
}

export interface PositionedObjectPositioning {
  layout?: string;
  leftOffset?: Dimension;
  topOffset?: Dimension;
}

export interface InlineObjectElement {
  inlineObjectId?: string;
  textStyle?: TextStyle;
  suggestedInsertionIds?: string[];
  suggestedDeletionIds?: string[];
  suggestedTextStyleChanges?: Record<string, object>;
}

export interface FootnoteReference {
  footnoteId?: string;
  footnoteNumber?: string;
  textStyle?: TextStyle;
  suggestedInsertionIds?: string[];
  suggestedDeletionIds?: string[];
  suggestedTextStyleChanges?: Record<string, object>;
}

export interface AutoText {
  type?: string;
  textStyle?: TextStyle;
  suggestedInsertionIds?: string[];
  suggestedDeletionIds?: string[];
  suggestedTextStyleChanges?: Record<string, object>;
}

export interface Equation {
  suggestedInsertionIds?: string[];
  suggestedDeletionIds?: string[];
}

export interface Person {
  personId?: string;
  suggestedInsertionIds?: string[];
  suggestedDeletionIds?: string[];
  textStyle?: TextStyle;
  suggestedTextStyleChanges?: Record<string, object>;
  personProperties?: PersonProperties;
}

export interface PersonProperties {
  name?: string;
  email?: string;
}

export interface RichLink {
  richLinkId?: string;
  suggestedInsertionIds?: string[];
  suggestedDeletionIds?: string[];
  textStyle?: TextStyle;
  suggestedTextStyleChanges?: Record<string, object>;
  richLinkProperties?: RichLinkProperties;
}

export interface RichLinkProperties {
  title?: string;
  uri?: string;
  mimeType?: string;
}

export interface OptionalColor {
  color?: Color;
}

export interface Color {
  rgbColor?: RgbColor;
}

export interface RgbColor {
  red?: number;
  green?: number;
  blue?: number;
}

export interface Dimension {
  magnitude?: number;
  unit?: string;
}

export interface Size {
  height?: Dimension;
  width?: Dimension;
}

export interface WeightedFontFamily {
  fontFamily?: string;
  weight?: number;
}

export interface Link {
  url?: string;
  bookmarkId?: string;
  headingId?: string;
}

export interface Background {
  color?: OptionalColor;
}

export interface ParagraphBorder {
  color?: OptionalColor;
  width?: Dimension;
  padding?: Dimension;
  dashStyle?: string;
}

export interface TabStop {
  offset?: Dimension;
  alignment?: string;
}

export interface Shading {
  backgroundColor?: OptionalColor;
}

// ===== API Response Types =====

export interface TranscriptAPIResponse {
  ok: boolean;
  conferenceRecord?: string;
  transcript?: {
    name: string;
    state: TranscriptState;
    docsDocumentId?: string;
  };
  text?: string;
  entriesCount?: number;
  warnings?: string[];
  error?: string;
  suggestion?: string;
  retryAfter?: number;
}

export interface TranscriptRequestBody {
  meetingCode: string;
  prefer?: "docs" | "entries";
}
