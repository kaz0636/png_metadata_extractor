import type { PNGMetadata, Position, Size } from "./types"

/**
 * 画像プレビュー機能を管理するクラス
 * ズーム、パン、色解析、統計情報表示を提供
 */
export class ImagePreview {
  private container: HTMLElement // プレビューコンテナ要素
  private zoom = 1 // 現在のズーム倍率
  private position: Position = { x: 0, y: 0 } // 画像の表示位置
  private isDragging = false // ドラッグ中かどうか
  private dragStart: Position = { x: 0, y: 0 } // ドラッグ開始位置
  private imageElement: HTMLImageElement | null = null // 画像要素への参照
  private naturalSize: Size = { width: 0, height: 0 } // 画像の元サイズ

  constructor(container: HTMLElement) {
    this.container = container
  }

  /**
   * 画像プレビューをレンダリング
   * 統計情報、コントロール、画像表示エリア、色解析を含む完全なUIを構築
   * @param imageUrl - 表示する画像のURL（nullの場合は空状態を表示）
   * @param metadata - 画像のメタデータ
   */
  render(imageUrl: string | null, metadata: PNGMetadata): void {
    if (!imageUrl) {
      // 画像がない場合の空状態を表示
      this.container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-eye empty-icon"></i>
                    <p>PNGファイルをアップロードしてプレビューを表示</p>
                </div>
            `
      return
    }

    // 完全なプレビューUIを構築
    this.container.innerHTML = `
            <!-- 画像統計情報カード -->
            <div class="preview-stats">
                <div class="preview-card">
                    <i class="fas fa-ruler preview-icon blue"></i>
                    <div class="preview-content">
                        <p class="preview-label">元サイズ</p>
                        <p class="preview-value" id="naturalSize">読み込み中...</p>
                    </div>
                </div>
                <div class="preview-card">
                    <i class="fas fa-info preview-icon green"></i>
                    <div class="preview-content">
                        <p class="preview-label">アスペクト比</p>
                        <p class="preview-value" id="aspectRatio">読み込み中...</p>
                    </div>
                </div>
                <div class="preview-card">
                    <i class="fas fa-palette preview-icon purple"></i>
                    <div class="card-content">
                        <p class="preview-label">ビット深度</p>
                        <p class="preview-value">${metadata?.imageInfo?.bitDepth || "N/A"} ビット</p>
                    </div>
                </div>
                <div class="preview-card">
                    <i class="fas fa-download preview-icon orange"></i>
                    <div class="card-content">
                        <p class="preview-label">ファイルサイズ</p>
                        <p class="preview-value">${this.formatFileSize(metadata?.fileSize || 0)}</p>
                    </div>
                </div>
            </div>

            <!-- 画像表示コンテナ -->
            <div class="image-container">
                <div class="image-header">
                    <div class="image-title">
                        <i class="fas fa-eye"></i>
                        <span>画像プレビュー</span>
                        <span class="zoom-badge" id="zoomBadge">ズーム: 100%</span>
                    </div>
                    <!-- 画像操作コントロール -->
                    <div class="image-controls">
                        <button class="control-button" id="zoomOut" title="縮小">
                            <i class="fas fa-search-minus"></i>
                        </button>
                        <button class="control-button" id="zoomIn" title="拡大">
                            <i class="fas fa-search-plus"></i>
                        </button>
                        <button class="control-button" id="resetZoom" title="リセット">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button class="control-button" id="downloadImage" title="ダウンロード">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
                <!-- 画像表示ビューポート -->
                <div class="image-viewport" id="imageViewport">
                    <img class="preview-image" id="previewImage" src="${imageUrl}" alt="PNG プレビュー">
                    <div class="zoom-info" id="zoomInfo" style="display: none;">100% ズーム</div>
                </div>
            </div>

            <!-- 色解析セクション（画像読み込み後に表示） -->
            <div class="color-analysis" id="colorAnalysis" style="display: none;">
                <h3>色解析</h3>
                <div class="color-section">
                    <h4>平均色</h4>
                    <div class="average-color" id="averageColor">
                        <div class="spinner"></div>
                        <span>色を解析中...</span>
                    </div>
                </div>
                <div class="color-section">
                    <h4>主要色</h4>
                    <div class="dominant-colors" id="dominantColors"></div>
                </div>
            </div>
        `

    // イベントリスナーを設定
    this.setupEventListeners(imageUrl, metadata)
  }

  /**
   * 画像プレビューのイベントリスナーを設定
   * 画像読み込み、ズーム操作、ドラッグ操作、ダウンロードなど
   * @param imageUrl - 画像URL
   * @param metadata - 画像メタデータ
   */
  private setupEventListeners(imageUrl: string, metadata: PNGMetadata): void {
    // DOM要素を取得
    const image = document.getElementById("previewImage") as HTMLImageElement
    const viewport = document.getElementById("imageViewport") as HTMLElement
    const zoomBadge = document.getElementById("zoomBadge") as HTMLElement
    const zoomInfo = document.getElementById("zoomInfo") as HTMLElement

    // 画像読み込み完了イベント
    image.onload = () => {
      this.imageElement = image
      this.naturalSize = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      }

      // サイズ情報を更新
      const naturalSizeEl = document.getElementById("naturalSize")
      const aspectRatioEl = document.getElementById("aspectRatio")
      if (naturalSizeEl) naturalSizeEl.textContent = `${this.naturalSize.width} × ${this.naturalSize.height}`
      if (aspectRatioEl) aspectRatioEl.textContent = this.calculateAspectRatio()

      // 色解析セクションを表示して解析開始
      const colorAnalysisEl = document.getElementById("colorAnalysis")
      if (colorAnalysisEl) colorAnalysisEl.style.display = "block"
      this.analyzeColors()
    }

    // ズームコントロールボタンの設定
    const zoomInBtn = document.getElementById("zoomIn")
    const zoomOutBtn = document.getElementById("zoomOut")
    const resetZoomBtn = document.getElementById("resetZoom")
    const downloadBtn = document.getElementById("downloadImage")

    // 拡大ボタン
    if (zoomInBtn) {
      zoomInBtn.onclick = () => {
        this.zoom = Math.min(this.zoom * 1.5, 10) // 最大10倍まで
        this.updateImageTransform()
        this.updateZoomDisplay()
      }
    }

    // 縮小ボタン
    if (zoomOutBtn) {
      zoomOutBtn.onclick = () => {
        this.zoom = Math.max(this.zoom / 1.5, 0.1) // 最小0.1倍まで
        this.updateImageTransform()
        this.updateZoomDisplay()
      }
    }

    // リセットボタン
    if (resetZoomBtn) {
      resetZoomBtn.onclick = () => {
        this.zoom = 1 // ズームを100%に
        this.position = { x: 0, y: 0 } // 位置をリセット
        this.updateImageTransform()
        this.updateZoomDisplay()
      }
    }

    // ダウンロードボタン
    if (downloadBtn) {
      downloadBtn.onclick = () => {
        const link = document.createElement("a")
        link.href = imageUrl
        link.download = metadata.fileName
        link.click()
      }
    }

    // ドラッグ機能の設定（ズーム時のみ有効）
    viewport.onmousedown = (e: MouseEvent) => {
      if (this.zoom > 1) {
        this.isDragging = true
        this.dragStart = {
          x: e.clientX - this.position.x,
          y: e.clientY - this.position.y,
        }
        viewport.style.cursor = "grabbing" // ドラッグ中のカーソル
      }
    }

    // マウス移動（ドラッグ中の画像移動）
    viewport.onmousemove = (e: MouseEvent) => {
      if (this.isDragging && this.zoom > 1) {
        this.position = {
          x: e.clientX - this.dragStart.x,
          y: e.clientY - this.dragStart.y,
        }
        this.updateImageTransform()
      }
    }

    // マウスアップ（ドラッグ終了）
    viewport.onmouseup = () => {
      this.isDragging = false
      viewport.style.cursor = this.zoom > 1 ? "grab" : "default"
    }

    // マウスがビューポートから離れた時（ドラッグ終了）
    viewport.onmouseleave = () => {
      this.isDragging = false
      viewport.style.cursor = this.zoom > 1 ? "grab" : "default"
    }

    // 初期表示を更新
    this.updateZoomDisplay()
  }

  /**
   * 画像の変形（ズーム・パン）を適用
   * CSS transformを使用して画像の表示を更新
   */
  private updateImageTransform(): void {
    if (this.imageElement) {
      const transform = `scale(${this.zoom}) translate(${this.position.x / this.zoom}px, ${this.position.y / this.zoom}px)`
      this.imageElement.style.transform = transform
    }
  }

  /**
   * ズーム表示の更新
   * ズーム率の表示、ボタンの有効/無効状態、カーソルの変更
   */
  private updateZoomDisplay(): void {
    const zoomBadge = document.getElementById("zoomBadge")
    const zoomInfo = document.getElementById("zoomInfo")
    const viewport = document.getElementById("imageViewport")

    const zoomPercent = Math.round(this.zoom * 100)

    // ズーム率バッジの更新
    if (zoomBadge) zoomBadge.textContent = `ズーム: ${zoomPercent}%`

    // ズーム情報の表示/非表示
    if (zoomInfo) {
      if (this.zoom !== 1) {
        zoomInfo.textContent = `${zoomPercent}% ズーム`
        zoomInfo.style.display = "block"
      } else {
        zoomInfo.style.display = "none"
      }
    }

    // カーソルの変更（ズーム時はドラッグ可能を示す）
    if (viewport) {
      viewport.style.cursor = this.zoom > 1 ? "grab" : "default"
    }

    // ボタンの有効/無効状態を更新
    const zoomOutBtn = document.getElementById("zoomOut") as HTMLButtonElement
    const zoomInBtn = document.getElementById("zoomIn") as HTMLButtonElement
    if (zoomOutBtn) zoomOutBtn.disabled = this.zoom <= 0.1 // 最小ズーム時は縮小無効
    if (zoomInBtn) zoomInBtn.disabled = this.zoom >= 10 // 最大ズーム時は拡大無効
  }

  /**
   * アスペクト比を計算
   * 最大公約数を使用して簡約形で表示（例: 16:9）
   * @returns アスペクト比の文字列
   */
  private calculateAspectRatio(): string {
    if (!this.naturalSize.width || !this.naturalSize.height) return "N/A"

    // 最大公約数を求める関数（ユークリッドの互除法）
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
    const divisor = gcd(this.naturalSize.width, this.naturalSize.height)
    return `${this.naturalSize.width / divisor}:${this.naturalSize.height / divisor}`
  }

  /**
   * ファイルサイズを人間が読みやすい形式にフォーマット
   * @param bytes - バイト数
   * @returns フォーマットされたサイズ文字列
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  /**
   * 画像の色解析を実行
   * Canvas APIを使用して平均色と主要色を抽出
   */
  private analyzeColors(): void {
    if (!this.imageElement) return

    // 解析用のCanvasを作成
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // パフォーマンスのため、解析サイズを制限
    canvas.width = Math.min(this.imageElement.naturalWidth, 200)
    canvas.height = Math.min(this.imageElement.naturalHeight, 200)

    try {
      // 画像をCanvasに描画
      ctx.drawImage(this.imageElement, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // 色の出現回数をカウントするマップ
      const colorMap = new Map<string, number>()
      let totalR = 0,
        totalG = 0,
        totalB = 0 // 平均色計算用
      const pixelCount = data.length / 4

      // 全ピクセルを走査
      for (let i = 0; i < data.length; i += 4) {
        if (i + 3 >= data.length) break

        const r = data[i] // 赤成分
        const g = data[i + 1] // 緑成分
        const b = data[i + 2] // 青成分
        const a = data[i + 3] // アルファ成分

        // 透明でないピクセルのみ処理
        if (a > 128) {
          // 平均色計算用に累積
          totalR += r
          totalG += g
          totalB += b

          // 主要色抽出のため色をグループ化（32段階に量子化）
          const groupedR = Math.floor(r / 32) * 32
          const groupedG = Math.floor(g / 32) * 32
          const groupedB = Math.floor(b / 32) * 32
          const colorKey = `rgb(${groupedR},${groupedG},${groupedB})`

          // 色の出現回数をカウント
          colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1)
        }
      }

      // 平均色を計算
      const averageColor = `rgb(${Math.round(totalR / pixelCount)}, ${Math.round(totalG / pixelCount)}, ${Math.round(totalB / pixelCount)})`

      // 主要色を抽出（出現回数順にソートして上位8色）
      const dominantColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1]) // 出現回数の降順でソート
        .slice(0, 8) // 上位8色を取得
        .map(([color]) => color)

      // 結果を表示
      this.displayColorAnalysis(averageColor, dominantColors, Math.round(pixelCount))
    } catch (error) {
      console.error("色解析に失敗しました:", error)
      const avgColorEl = document.getElementById("averageColor")
      if (avgColorEl) {
        avgColorEl.innerHTML = '<span style="color: #dc2626;">色解析に失敗しました</span>'
      }
    }
  }

  /**
   * 色解析結果をUIに表示
   * @param averageColor - 平均色のCSS色値
   * @param dominantColors - 主要色の配列
   * @param pixelCount - 解析したピクセル数
   */
  private displayColorAnalysis(averageColor: string, dominantColors: string[], pixelCount: number): void {
    // 平均色の表示
    const avgColorEl = document.getElementById("averageColor")
    if (avgColorEl) {
      avgColorEl.innerHTML = `
            <div class="color-swatch" style="background-color: ${averageColor};"></div>
            <div class="color-info">
                <div class="color-value">${averageColor}</div>
                <div class="color-description">${pixelCount.toLocaleString()} ピクセルから計算</div>
            </div>
        `
    }

    // 主要色の表示
    const dominantContainer = document.getElementById("dominantColors")
    if (dominantContainer) {
      dominantContainer.innerHTML = dominantColors
        .map((color) => {
          const rgb = color.match(/\d+/g)
          let rgbValues = "N/A"

          if (rgb && rgb.length >= 3) {
            const r = rgb[0] || "0"
            const g = rgb[1] || "0"
            const b = rgb[2] || "0"
            rgbValues = `${r},${g},${b}`
          }

          return `
                <div class="dominant-color">
                    <div class="dominant-swatch" style="background-color: ${color};" title="${color}"></div>
                    <div class="dominant-value">${rgbValues}</div>
                </div>
            `
        })
        .join("")
    }
  }
}
