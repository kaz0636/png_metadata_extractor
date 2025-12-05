import "./styles.scss"
import { PNGAnalyzer } from "./png-analyzer"
import { ImagePreview } from "./image-preview"
import type { PNGMetadata, JSNViewOptions } from "./types"

// CDN経由で読み込まれるjsnviewをグローバル関数として宣言
declare global {
  function jsnview(data: any, options?: JSNViewOptions): HTMLElement
}

/**
 * PNGメタデータ抽出ツールのメインクラス
 * ファイルのアップロード、解析、表示を統合管理する
 */
class PNGMetadataExtractor {
  private analyzer: PNGAnalyzer // PNG解析エンジン
  private imagePreview: ImagePreview // 画像プレビュー管理
  private currentMetadata: PNGMetadata | null = null // 現在解析中のメタデータ
  private currentImageUrl: string | null = null // 現在表示中の画像URL

  constructor() {
    // PNG解析エンジンを初期化
    this.analyzer = new PNGAnalyzer()

    // 画像プレビューコンテナを取得して初期化
    const previewContainer = document.getElementById("imagePreview")
    if (!previewContainer) {
      throw new Error("画像プレビューコンテナが見つかりません")
    }
    this.imagePreview = new ImagePreview(previewContainer)

    // イベントリスナーを設定
    this.initializeEventListeners()
  }

  /**
   * 全てのイベントリスナーを初期化
   * ファイルアップロード、ドラッグ&ドロップ、タブ切り替えなど
   */
  private initializeEventListeners(): void {
    // 必要なDOM要素を取得
    const uploadArea = document.getElementById("uploadArea")
    const uploadButton = document.getElementById("uploadButton")
    const fileInput = document.getElementById("fileInput") as HTMLInputElement
    const exportButton = document.getElementById("exportButton")

    // 必須要素の存在確認
    if (!uploadArea || !uploadButton || !fileInput || !exportButton) {
      throw new Error("必要なDOM要素が見つかりません")
    }

    // ファイル選択イベント（input要素）
    fileInput.addEventListener("change", (e: Event) => {
      const target = e.target as HTMLInputElement
      if (target.files && target.files.length > 0 && target.files[0]) {
        this.handleFile(target.files[0])
      }
    })

    // アップロードボタンクリック（ファイル選択ダイアログを開く）
    uploadButton.addEventListener("click", () => {
      fileInput.click()
    })

    // アップロードエリアクリック（ファイル選択ダイアログを開く）
    uploadArea.addEventListener("click", () => {
      fileInput.click()
    })

    // ドラッグオーバー時の視覚的フィードバック
    uploadArea.addEventListener("dragover", (e: DragEvent) => {
      e.preventDefault() // デフォルトの動作を無効化
      uploadArea.classList.add("drag-over") // ドラッグ中のスタイルを適用
    })

    // ドラッグが離れた時の視覚的フィードバック解除
    uploadArea.addEventListener("dragleave", () => {
      uploadArea.classList.remove("drag-over")
    })

    // ファイルドロップ処理
    uploadArea.addEventListener("drop", (e: DragEvent) => {
      e.preventDefault() // デフォルトの動作を無効化
      uploadArea.classList.remove("drag-over") // ドラッグスタイルを解除

      // ドロップされたファイルを処理
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0 && e.dataTransfer.files[0]) {
        this.handleFile(e.dataTransfer.files[0])
      }
    })

    // エクスポートボタン（JSON形式でメタデータをダウンロード）
    exportButton.addEventListener("click", () => {
      this.exportResults()
    })

    // タブ切り替えイベント
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", () => {
        const tabButton = button as HTMLElement
        const tabName = tabButton.dataset.tab
        if (tabName) {
          this.switchTab(tabName)
        }
      })
    })
  }

  /**
   * ファイル処理のメイン関数
   * PNG形式の検証、解析、結果表示を行う
   * @param file - 処理対象のファイル
   */
  private async handleFile(file: File): Promise<void> {
    // PNG形式の検証
    if (!file.type.includes("png")) {
      this.showError("PNGファイルを選択してください")
      return
    }

    // ローディング表示開始
    this.showLoading(true)
    this.hideError()

    // 前回の画像URLをクリーンアップ（メモリリーク防止）
    if (this.currentImageUrl) {
      URL.revokeObjectURL(this.currentImageUrl)
    }

    try {
      // PNG解析を実行
      const metadata = await this.analyzer.analyze(file)
      this.currentMetadata = metadata

      // 画像表示用のURLを作成
      this.currentImageUrl = URL.createObjectURL(file)

      // 解析結果を表示
      this.displayResults(metadata)
      this.showLoading(false)

      // プレビュータブに自動切り替え
      this.switchTab("preview")
    } catch (error) {
      // エラーハンドリング
      const errorMessage = error instanceof Error ? error.message : "PNGファイルの解析に失敗しました"
      this.showError(errorMessage)
      this.showLoading(false)
    }
  }

  /**
   * 解析結果をUIに表示
   * サマリーカード、各タブコンテンツ、画像プレビューを更新
   * @param metadata - 表示するメタデータ
   */
  private displayResults(metadata: PNGMetadata): void {
    // 結果セクションを表示
    const resultsEl = document.getElementById("results")
    if (resultsEl) resultsEl.style.display = "block"

    // サマリーカードの更新
    const fileSizeEl = document.getElementById("fileSize")
    const dimensionsEl = document.getElementById("dimensions")
    const colorTypeEl = document.getElementById("colorType")
    const chunkCountEl = document.getElementById("chunkCount")

    if (fileSizeEl) fileSizeEl.textContent = `${(metadata.fileSize / 1024).toFixed(1)} KB`
    if (dimensionsEl)
      dimensionsEl.textContent = `${metadata.imageInfo?.width || 0} × ${metadata.imageInfo?.height || 0}`
    if (colorTypeEl) colorTypeEl.textContent = metadata.imageInfo?.colorType || "不明"
    if (chunkCountEl) chunkCountEl.textContent = metadata.chunks.length.toString()

    // 各タブコンテンツの更新
    this.updateImageInfo(metadata.imageInfo)
    this.updateChunks(metadata.chunks)
    this.updateMetadata(metadata.textMetadata)
    this.updateTimestamp(metadata.timestamp)
    this.updateRawData(metadata.rawChunks)
    this.displayJSONTree(metadata, document.getElementById("fullJsonContainer"))

    // 画像プレビューの更新
    if (this.currentImageUrl) {
      this.imagePreview.render(this.currentImageUrl, metadata)
    }
  }

  /**
   * 画像情報タブの内容を更新
   * @param imageInfo - 画像の基本情報
   */
  private updateImageInfo(imageInfo: PNGMetadata["imageInfo"]): void {
    const container = document.getElementById("imageInfoGrid")
    if (!container) return

    if (!imageInfo) {
      container.innerHTML = "<p>画像情報が利用できません</p>"
      return
    }

    // 画像情報をグリッド形式で表示
    container.innerHTML = Object.entries(imageInfo)
      .map(
        ([key, value]) => `
                <div class="info-item">
                    <span class="info-label">${this.translateImageInfoKey(key)}</span>
                    <span class="info-value">${value}</span>
                </div>
            `,
      )
      .join("")
  }

  /**
   * 画像情報のキーを日本語に翻訳
   * @param key - 英語のキー名
   * @returns 日本語のキー名
   */
  private translateImageInfoKey(key: string): string {
    const translations: { [key: string]: string } = {
      width: "幅",
      height: "高さ",
      bitDepth: "ビット深度",
      colorType: "色タイプ",
      compressionMethod: "圧縮方式",
      filterMethod: "フィルター方式",
      interlaceMethod: "インターレース方式",
    }
    return translations[key] || key
  }

  /**
   * チャンク情報タブの内容を更新
   * @param chunks - PNGチャンクの配列
   */
  private updateChunks(chunks: PNGMetadata["chunks"]): void {
    const container = document.getElementById("chunksContainer")
    if (!container) return

    container.innerHTML = chunks
      .map(
        (chunk) => `
            <div class="chunk-item">
                <div class="chunk-header">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="chunk-type">${chunk.type}</span>
                        <span class="chunk-info">長さ: ${chunk.length} バイト</span>
                    </div>
                    <span class="chunk-crc">CRC: ${chunk.crc}</span>
                </div>
                <div class="chunk-data">${chunk.dataPreview}</div>
            </div>
        `,
      )
      .join("")
  }

  /**
   * テキストメタデータタブの内容を更新
   * @param textMetadata - テキスト形式のメタデータ
   */
  private updateMetadata(textMetadata: PNGMetadata["textMetadata"]): void {
    const container = document.getElementById("metadataContainer")
    if (!container) return

    if (Object.keys(textMetadata).length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-info-circle empty-icon"></i>
                    <p>このPNGファイルにはテキストメタデータが見つかりませんでした</p>
                </div>
            `
      return
    }

    container.innerHTML = Object.entries(textMetadata)
      .map(
        ([key, value]) => `
                <div class="chunk-item">
                    <h4 style="margin-bottom: 0.5rem; font-weight: 600;">${key}</h4>
                    <div style="background-color: #f9fafb; padding: 0.75rem; border-radius: 0.375rem; font-size: 0.875rem; color: #6b7280; word-break: break-all;">
                        ${
                          typeof value === "object"
                            ? `<pre style="white-space: pre-wrap; margin: 0;">${JSON.stringify(value, null, 2)}</pre>`
                            : `<span>${value}</span>`
                        }
                    </div>
                </div>
            `,
      )
      .join("")
  }

  /**
   * タイムスタンプタブの内容を更新
   * @param timestamp - PNG作成時刻情報
   */
  private updateTimestamp(timestamp: PNGMetadata["timestamp"]): void {
    const container = document.getElementById("timestampContainer")
    if (!container) return

    if (!timestamp) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock empty-icon"></i>
                    <p>タイムスタンプ情報が見つかりませんでした</p>
                </div>
            `
      return
    }

    // タイムスタンプ情報をグリッド形式で表示
    container.innerHTML = `
            <div class="chunk-item">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                    <i class="fas fa-clock" style="color: #3b82f6;"></i>
                    <h4 style="margin: 0; font-weight: 600;">作成時刻</h4>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem;">
                    ${Object.entries(timestamp)
                      .filter(([key]) => key !== "datetime") // datetime は除外
                      .map(
                        ([key, value]) => `
                        <div style="text-align: center; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.375rem;">
                            <div style="font-size: 0.875rem; color: #6b7280; text-transform: capitalize; margin-bottom: 0.25rem;">${this.translateTimestampKey(key)}</div>
                            <div style="font-weight: bold;">${value}</div>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
                <div style="margin-top: 1rem; text-align: center; font-size: 1.1rem; font-weight: 600; color: #374151;">
                    ${timestamp.datetime}
                </div>
            </div>
        `
  }

  /**
   * タイムスタンプのキーを日本語に翻訳
   * @param key - 英語のキー名
   * @returns 日本語のキー名
   */
  private translateTimestampKey(key: string): string {
    const translations: { [key: string]: string } = {
      year: "年",
      month: "月",
      day: "日",
      hour: "時",
      minute: "分",
      second: "秒",
    }
    return translations[key] || key
  }

  /**
   * 生データタブの内容を更新
   * @param rawChunks - 生のチャンクデータ
   */
  private updateRawData(rawChunks: PNGMetadata["rawChunks"]): void {
    const container = document.getElementById("rawDataContainer")
    if (!container) return

    container.innerHTML = rawChunks
      .map(
        (chunk) => `
            <div class="chunk-item">
                <div style="padding: 1rem; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb; display: flex; justify-content: space-between; align-items: center;">
                    <span class="chunk-type">${chunk.type}</span>
                    <span style="font-size: 0.875rem; color: #6b7280;">
                        ${chunk.length} バイト | CRC: 0x${chunk.crc.toString(16).padStart(8, "0")}
                    </span>
                </div>
                <div style="padding: 1rem;">
                    <div style="font-family: monospace; font-size: 0.75rem; background-color: #f3f4f6; padding: 0.75rem; border-radius: 0.375rem; max-height: 8rem; overflow-y: auto; word-break: break-all;">
                        ${chunk.data.match(/.{1,64}/g)?.join("\n") || chunk.data}
                    </div>
                </div>
            </div>
        `,
      )
      .join("")
  }

  /**
   * JSONツリービューを表示する
   * @param metadata - 表示するメタデータ
   * @param parentElement - 表示先の要素
   * @param options - 表示オプション
   */
  private displayJSONTree(
    metadata: PNGMetadata,
    parentElement: HTMLElement | null,
    options: JSNViewOptions = {},
  ): void {
    // JSONビューのデフォルト設定
    const DEFAULT_JSON_VIEW_OPTIONS: JSNViewOptions = {
      showLen: false, // 配列の長さを表示しない
      showType: false, // データ型を表示しない
      showBrackets: true, // 括弧を表示
      showFoldmarker: false, // 折りたたみマーカーを表示しない
      colors: {
        boolean: "#ff2929", // 真偽値の色
        null: "#ff2929", // null値の色
        string: "#690", // 文字列の色
        number: "#905", // 数値の色
        float: "#002f99", // 浮動小数点数の色
      },
    }

    if (!parentElement) return

    // コンテナをリセット
    parentElement.innerHTML = ""
    parentElement.className = ""

    // メタデータの有効性チェック
    if (!metadata || typeof metadata !== "object" || Object.keys(metadata).length === 0) {
      parentElement.className = "text-center text-secondary"
      parentElement.innerHTML = "データがありません"
      return
    }

    // オプションをマージ
    const mergedOptions: JSNViewOptions = {
      ...DEFAULT_JSON_VIEW_OPTIONS,
      ...options,
      colors: {
        ...DEFAULT_JSON_VIEW_OPTIONS.colors,
        ...(options.colors || {}),
      },
    }

    // JSONツリービューを生成して表示
    const treeView = jsnview(metadata, mergedOptions)
    parentElement.appendChild(treeView)
  }

  /**
   * タブを切り替える
   * @param tabName - 切り替え先のタブ名
   */
  private switchTab(tabName: string): void {
    // タブボタンの状態を更新
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.remove("active")
    })
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`)
    if (activeTab) activeTab.classList.add("active")

    // タブコンテンツの表示を更新
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active")
    })
    const activeContent = document.getElementById(`tab-${tabName}`)
    if (activeContent) activeContent.classList.add("active")
  }

  /**
   * 解析結果をJSONファイルとしてエクスポート
   */
  private exportResults(): void {
    if (!this.currentMetadata) return

    // JSONデータを整形
    const dataStr = JSON.stringify(this.currentMetadata, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)

    // ダウンロードリンクを作成して実行
    const link = document.createElement("a")
    link.href = url
    link.download = `${this.currentMetadata.fileName}_metadata.json`
    link.click()

    // メモリリーク防止のためURLを解放
    URL.revokeObjectURL(url)
  }

  /**
   * ローディング表示の制御
   * @param show - 表示するかどうか
   */
  private showLoading(show: boolean): void {
    const loadingEl = document.getElementById("loading")
    if (loadingEl) loadingEl.style.display = show ? "flex" : "none"
  }

  /**
   * エラーメッセージを表示
   * @param message - 表示するエラーメッセージ
   */
  private showError(message: string): void {
    const errorElement = document.getElementById("error")
    if (errorElement) {
      errorElement.textContent = message
      errorElement.style.display = "block"
    }
  }

  /**
   * エラーメッセージを非表示
   */
  private hideError(): void {
    const errorElement = document.getElementById("error")
    if (errorElement) errorElement.style.display = "none"
  }
}

/**
 * Service Workerを登録する
 * PWAとしてオフライン動作を可能にする
 */
function registerServiceWorker(): void {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker 登録成功:", registration.scope)
        })
        .catch((error) => {
          console.error("[PWA] Service Worker 登録失敗:", error)
        })
    })
  }
}

// アプリケーションの初期化
// DOMが完全に読み込まれた後にメインクラスをインスタンス化
document.addEventListener("DOMContentLoaded", () => {
  new PNGMetadataExtractor()
})

// Service Workerの登録
registerServiceWorker()
