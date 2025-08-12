import type { PNGMetadata } from "./types";
/**
 * 画像プレビュー機能を管理するクラス
 * ズーム、パン、色解析、統計情報表示を提供
 */
export declare class ImagePreview {
    private container;
    private zoom;
    private position;
    private isDragging;
    private dragStart;
    private imageElement;
    private naturalSize;
    constructor(container: HTMLElement);
    /**
     * 画像プレビューをレンダリング
     * 統計情報、コントロール、画像表示エリア、色解析を含む完全なUIを構築
     * @param imageUrl - 表示する画像のURL（nullの場合は空状態を表示）
     * @param metadata - 画像のメタデータ
     */
    render(imageUrl: string | null, metadata: PNGMetadata): void;
    /**
     * 画像プレビューのイベントリスナーを設定
     * 画像読み込み、ズーム操作、ドラッグ操作、ダウンロードなど
     * @param imageUrl - 画像URL
     * @param metadata - 画像メタデータ
     */
    private setupEventListeners;
    /**
     * 画像の変形（ズーム・パン）を適用
     * CSS transformを使用して画像の表示を更新
     */
    private updateImageTransform;
    /**
     * ズーム表示の更新
     * ズーム率の表示、ボタンの有効/無効状態、カーソルの変更
     */
    private updateZoomDisplay;
    /**
     * アスペクト比を計算
     * 最大公約数を使用して簡約形で表示（例: 16:9）
     * @returns アスペクト比の文字列
     */
    private calculateAspectRatio;
    /**
     * ファイルサイズを人間が読みやすい形式にフォーマット
     * @param bytes - バイト数
     * @returns フォーマットされたサイズ文字列
     */
    private formatFileSize;
    /**
     * 画像の色解析を実行
     * Canvas APIを使用して平均色と主要色を抽出
     */
    private analyzeColors;
    /**
     * 色解析結果をUIに表示
     * @param averageColor - 平均色のCSS色値
     * @param dominantColors - 主要色の配列
     * @param pixelCount - 解析したピクセル数
     */
    private displayColorAnalysis;
}
//# sourceMappingURL=image-preview.d.ts.map