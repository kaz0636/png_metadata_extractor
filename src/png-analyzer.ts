import type { PNGMetadata, PNGImageInfo, PNGTextMetadata, PNGTimestamp, ColorTypes } from "./types"

/**
 * PNG画像ファイルの詳細解析を行うクラス
 * バイナリレベルでPNGの構造を解析し、メタデータを抽出する
 */
export class PNGAnalyzer {
  /** PNG色タイプの定義（PNG仕様に基づく） */
  private colorTypes: ColorTypes = {
    0: "グレースケール",
    2: "RGB",
    3: "パレット",
    4: "グレースケール + アルファ",
    6: "RGB + アルファ",
  }

  /**
   * ファイルから指定範囲のバイトデータを読み取る
   * @param file - 読み取り対象のファイル
   * @param start - 開始位置（バイト）
   * @param length - 読み取り長さ（バイト）
   * @returns バイトデータの配列
   */
  async readBytes(file: File, start: number, length: number): Promise<Uint8Array> {
    const slice = file.slice(start, start + length)
    const buffer = await slice.arrayBuffer()
    return new Uint8Array(buffer)
  }

  /**
   * バイト配列を32ビット符号なし整数に変換（ビッグエンディアン）
   * @param bytes - バイト配列
   * @param offset - 開始オフセット
   * @returns 32ビット整数値
   */
  bytesToUint32(bytes: Uint8Array, offset = 0): number {
    if (offset + 3 >= bytes.length) return 0
    const b0 = bytes[offset]
    const b1 = bytes[offset + 1]
    const b2 = bytes[offset + 2]
    const b3 = bytes[offset + 3]
    if (b0 == null || b1 == null || b2 == null || b3 == null) return 0
    return (b0 << 24) | (b1 << 16) | (b2 << 8) | b3
  }

  /**
   * バイト配列を16ビット符号なし整数に変換（ビッグエンディアン）
   * @param bytes - バイト配列
   * @param offset - 開始オフセット
   * @returns 16ビット整数値
   */
  bytesToUint16(bytes: Uint8Array, offset = 0): number {
    if (offset + 1 >= bytes.length) return 0
    const b0 = bytes[offset]
    const b1 = bytes[offset + 1]
    if (b0 == null || b1 == null) return 0
    return (b0 << 8) | b1
  }

  /**
   * バイト配列を文字列に変換
   * @param bytes - バイト配列
   * @param start - 開始位置
   * @param end - 終了位置（省略時は配列の最後まで）
   * @returns 変換された文字列
   */
  bytesToString(bytes: Uint8Array, start = 0, end?: number): string {
    const slice = end ? bytes.slice(start, end) : bytes.slice(start)
    return Array.from(slice)
      .map((b) => String.fromCharCode(b))
      .join("")
  }

  /**
   * バイト配列を16進数文字列に変換
   * @param bytes - バイト配列
   * @returns 16進数文字列（例: "89504e47"）
   */
  bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }

  /**
   * IHDRチャンク（画像ヘッダー）を解析
   * PNG画像の基本情報（幅、高さ、色深度など）を抽出
   * @param data - IHDRチャンクのデータ部分
   * @returns 画像情報オブジェクト
   */
  parseIHDR(data: Uint8Array): PNGImageInfo {
    if (data.length < 13) {
      throw new Error("IHDRチャンクのデータが不正です")
    }

    const bitDepth = data[8]
    const colorTypeValue = data[9]
    const compressionMethod = data[10]
    const filterMethod = data[11]
    const interlaceMethod = data[12]

    if (
      bitDepth == null ||
      colorTypeValue == null ||
      compressionMethod == null ||
      filterMethod == null ||
      interlaceMethod == null
    ) {
      throw new Error("IHDRチャンクのデータが不正です")
    }

    return {
      width: this.bytesToUint32(data, 0), // 画像の幅（ピクセル）
      height: this.bytesToUint32(data, 4), // 画像の高さ（ピクセル）
      bitDepth, // ビット深度（1, 2, 4, 8, 16）
      colorType: this.colorTypes[colorTypeValue as keyof ColorTypes] || `不明 (${colorTypeValue})`, // 色タイプ
      compressionMethod, // 圧縮方式（常に0）
      filterMethod, // フィルター方式（常に0）
      interlaceMethod, // インターレース方式（0=なし, 1=Adam7）
    }
  }

  /**
   * テキストチャンク（tEXt, iTXt）を解析
   * PNG内に埋め込まれたテキストメタデータを抽出
   * @param data - テキストチャンクのデータ部分
   * @param chunkType - チャンクタイプ（"tEXt" または "iTXt"）
   * @returns テキストメタデータオブジェクト
   */
  parseTextChunk(data: Uint8Array, chunkType: string): PNGTextMetadata {
    const result: PNGTextMetadata = {}

    try {
      if (chunkType === "tEXt") {
        // tEXtチャンク: キーワード\0テキスト の形式
        const nullIndex = data.indexOf(0) // null文字の位置を検索
        if (nullIndex !== -1) {
          const keyword = this.bytesToString(data, 0, nullIndex)
          const text = this.bytesToString(data, nullIndex + 1)
          result[keyword] = text
        }
      } else if (chunkType === "iTXt") {
        // iTXtチャンク: より複雑な国際化テキスト形式
        const parts: number[] = []

        // null文字の位置を4つまで検索
        for (let i = 0; i < data.length && parts.length < 4; i++) {
          if (data[i] === 0) {
            parts.push(i)
          }
        }

        if (parts.length >= 4) {
          const keyword = this.bytesToString(data, 0, parts[0]) // キーワード
          const compressionFlagByte = parts[0] != null && parts[0] + 1 < data.length ? data[parts[0] + 1] : undefined
          const compressionFlag = compressionFlagByte != null ? compressionFlagByte : 0 // 圧縮フラグ
          const languageTag =
            parts[1] != null && parts[2] != null ? this.bytesToString(data, parts[1] + 1, parts[2]) : "" // 言語タグ
          const translatedKeyword =
            parts[2] != null && parts[3] != null ? this.bytesToString(data, parts[2] + 1, parts[3]) : "" // 翻訳されたキーワード
          const text = parts[3] != null ? this.bytesToString(data, parts[3] + 1) : "" // テキスト本体

          result[keyword] = {
            text,
            language: languageTag,
            translatedKeyword,
            compressed: compressionFlag === 1,
          }
        }
      }
    } catch (error) {
      // 解析に失敗した場合は生データを16進数で保存
      result["_raw_data"] = this.bytesToHex(data)
    }

    return result
  }

  /**
   * tIMEチャンク（タイムスタンプ）を解析
   * PNG作成時刻の情報を抽出
   * @param data - tIMEチャンクのデータ部分（7バイト固定）
   * @returns タイムスタンプオブジェクト、または解析失敗時はnull
   */
  parseTime(data: Uint8Array): PNGTimestamp | null {
    // tIMEチャンクは必ず7バイト
    if (data.length !== 7) return null

    // バイナリデータから日時情報を抽出
    const year = this.bytesToUint16(data, 0) // 年（2バイト）
    const month = data[2] // 月（1バイト、1-12）
    const day = data[3] // 日（1バイト、1-31）
    const hour = data[4] // 時（1バイト、0-23）
    const minute = data[5] // 分（1バイト、0-59）
    const second = data[6] // 秒（1バイト、0-60）

    if (month == null || day == null || hour == null || minute == null || second == null) {
      return null
    }

    return {
      year,
      month,
      day,
      hour,
      minute,
      second,
      // 読みやすい形式の日時文字列も生成
      datetime: `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")} ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:${second.toString().padStart(2, "0")}`,
    }
  }

  /**
   * PNGファイルの完全解析を実行
   * ファイル全体を読み込み、全チャンクを解析してメタデータを抽出
   * @param file - 解析対象のPNGファイル
   * @returns 完全なメタデータオブジェクト
   * @throws PNG形式でない場合やファイル破損時にエラー
   */
  async analyze(file: File): Promise<PNGMetadata> {
    // PNGファイルシグネチャの検証
    const signature = await this.readBytes(file, 0, 8)
    const expectedSignature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

    // シグネチャが一致しない場合はエラー
    for (let i = 0; i < 8; i++) {
      if (signature[i] !== expectedSignature[i]) {
        throw new Error("無効なPNGファイルシグネチャです")
      }
    }

    // メタデータオブジェクトを初期化
    const metadata: PNGMetadata = {
      fileName: file.name,
      fileSize: file.size,
      chunks: [], // チャンク情報の配列
      imageInfo: null, // 画像基本情報
      textMetadata: {}, // テキストメタデータ
      timestamp: null, // タイムスタンプ
      physicalDimensions: null, // 物理的寸法（未実装）
      rawChunks: [], // 生チャンクデータ
    }

    let offset = 8 // PNGシグネチャをスキップ

    // ファイル終端まで全チャンクを順次解析
    while (offset < file.size) {
      // チャンクヘッダー（8バイト）を読み取り
      if (offset + 8 > file.size) break

      const header = await this.readBytes(file, offset, 8)
      const length = this.bytesToUint32(header, 0) // データ長（4バイト）
      const type = this.bytesToString(header, 4, 8) // チャンクタイプ（4バイト）

      // チャンクデータとCRCを読み取り
      if (offset + 8 + length + 4 > file.size) break

      const data = await this.readBytes(file, offset + 8, length)
      const crcBytes = await this.readBytes(file, offset + 8 + length, 4)
      const crc = this.bytesToUint32(crcBytes, 0)

      // チャンク情報を保存（表示用）
      const chunkInfo = {
        type,
        length,
        crc: `0x${crc.toString(16).padStart(8, "0")}`,
        dataPreview: this.bytesToHex(data.slice(0, Math.min(32, data.length))) + (data.length > 32 ? "..." : ""),
      }
      metadata.chunks.push(chunkInfo)

      // 生チャンクデータを保存（詳細表示用）
      metadata.rawChunks.push({
        type,
        length,
        data: this.bytesToHex(data),
        crc,
      })

      // 特定チャンクの詳細解析
      if (type === "IHDR") {
        // 画像ヘッダー情報を解析
        metadata.imageInfo = this.parseIHDR(data)
      } else if (["tEXt", "zTXt", "iTXt"].includes(type)) {
        // テキストメタデータを解析
        const textData = this.parseTextChunk(data, type)
        Object.assign(metadata.textMetadata, textData)
      } else if (type === "tIME") {
        // タイムスタンプを解析
        metadata.timestamp = this.parseTime(data)
      } else if (type === "IEND") {
        // 画像終端チャンクに到達したら解析終了
        break
      }

      // 次のチャンクへ移動
      offset += 8 + length + 4
    }

    return metadata
  }
}
