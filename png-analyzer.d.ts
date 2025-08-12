import type { PNGMetadata, PNGImageInfo, PNGTextMetadata, PNGTimestamp } from "./types";
/**
 * PNG画像ファイルの詳細解析を行うクラス
 * バイナリレベルでPNGの構造を解析し、メタデータを抽出する
 */
export declare class PNGAnalyzer {
    /** PNG色タイプの定義（PNG仕様に基づく） */
    private colorTypes;
    /**
     * ファイルから指定範囲のバイトデータを読み取る
     * @param file - 読み取り対象のファイル
     * @param start - 開始位置（バイト）
     * @param length - 読み取り長さ（バイト）
     * @returns バイトデータの配列
     */
    readBytes(file: File, start: number, length: number): Promise<Uint8Array>;
    /**
     * バイト配列を32ビット符号なし整数に変換（ビッグエンディアン）
     * @param bytes - バイト配列
     * @param offset - 開始オフセット
     * @returns 32ビット整数値
     */
    bytesToUint32(bytes: Uint8Array, offset?: number): number;
    /**
     * バイト配列を16ビット符号なし整数に変換（ビッグエンディアン）
     * @param bytes - バイト配列
     * @param offset - 開始オフセット
     * @returns 16ビット整数値
     */
    bytesToUint16(bytes: Uint8Array, offset?: number): number;
    /**
     * バイト配列を文字列に変換
     * @param bytes - バイト配列
     * @param start - 開始位置
     * @param end - 終了位置（省略時は配列の最後まで）
     * @returns 変換された文字列
     */
    bytesToString(bytes: Uint8Array, start?: number, end?: number): string;
    /**
     * バイト配列を16進数文字列に変換
     * @param bytes - バイト配列
     * @returns 16進数文字列（例: "89504e47"）
     */
    bytesToHex(bytes: Uint8Array): string;
    /**
     * IHDRチャンク（画像ヘッダー）を解析
     * PNG画像の基本情報（幅、高さ、色深度など）を抽出
     * @param data - IHDRチャンクのデータ部分
     * @returns 画像情報オブジェクト
     */
    parseIHDR(data: Uint8Array): PNGImageInfo;
    /**
     * テキストチャンク（tEXt, iTXt）を解析
     * PNG内に埋め込まれたテキストメタデータを抽出
     * @param data - テキストチャンクのデータ部分
     * @param chunkType - チャンクタイプ（"tEXt" または "iTXt"）
     * @returns テキストメタデータオブジェクト
     */
    parseTextChunk(data: Uint8Array, chunkType: string): PNGTextMetadata;
    /**
     * tIMEチャンク（タイムスタンプ）を解析
     * PNG作成時刻の情報を抽出
     * @param data - tIMEチャンクのデータ部分（7バイト固定）
     * @returns タイムスタンプオブジェクト、または解析失敗時はnull
     */
    parseTime(data: Uint8Array): PNGTimestamp | null;
    /**
     * PNGファイルの完全解析を実行
     * ファイル全体を読み込み、全チャンクを解析してメタデータを抽出
     * @param file - 解析対象のPNGファイル
     * @returns 完全なメタデータオブジェクト
     * @throws PNG形式でない場合やファイル破損時にエラー
     */
    analyze(file: File): Promise<PNGMetadata>;
}
//# sourceMappingURL=png-analyzer.d.ts.map