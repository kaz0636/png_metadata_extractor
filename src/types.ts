// Fixed duplicate file issue and ensured proper type exports
export interface PNGImageInfo {
  width: number
  height: number
  bitDepth: number
  colorType: string
  compressionMethod: number
  filterMethod: number
  interlaceMethod: number
}

export interface PNGChunk {
  type: string
  length: number
  crc: string
  dataPreview: string
}

export interface PNGRawChunk {
  type: string
  length: number
  data: string
  crc: number
}

export interface PNGTextMetadata {
  [key: string]:
    | string
    | {
        text: string
        language: string
        translatedKeyword: string
        compressed: boolean
      }
}

export interface PNGTimestamp {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  datetime: string
}

export interface PNGMetadata {
  fileName: string
  fileSize: number
  chunks: PNGChunk[]
  imageInfo: PNGImageInfo | null
  textMetadata: PNGTextMetadata
  timestamp: PNGTimestamp | null
  physicalDimensions: any | null
  rawChunks: PNGRawChunk[]
}

export interface ColorTypes {
  [key: number]: string
}

export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface JSNViewOptions {
  showLen?: boolean
  showType?: boolean
  showBrackets?: boolean
  showFoldmarker?: boolean
  colors?: {
    boolean?: string
    null?: string
    string?: string
    number?: string
    float?: string
  }
}

// Global JSNView function declaration
declare global {
  function jsnview(data: any, options?: JSNViewOptions): HTMLElement
}
