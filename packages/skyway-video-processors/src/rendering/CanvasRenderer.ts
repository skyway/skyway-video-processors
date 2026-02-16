import type { Results } from '@mediapipe/selfie_segmentation';

/**
 * Canvas 描画の共通処理を提供する基底クラス
 * セグメンテーション結果を使用した合成処理の共通部分を実装
 */
export abstract class CanvasRenderer {
  protected canvas: HTMLCanvasElement | OffscreenCanvas;
  protected ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  protected width: number;
  protected height: number;

  protected constructor(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  /**
   * セグメンテーション結果を使用してフレームを合成する
   * @param results - セグメンテーション結果
   */
  abstract render(results: Results): void;

  /**
   * 前景（人物）をマスク内に描画する共通処理
   * @param results - セグメンテーション結果
   */
  protected renderForeground(results: Results): void {
    // セグメンテーションマスクを描画
    this.ctx.drawImage(results.segmentationMask, 0, 0, this.width, this.height);

    // マスク内に人物（前景）を描画
    this.ctx.globalCompositeOperation = 'source-in';
    this.ctx.drawImage(results.image, 0, 0, this.width, this.height);
  }

  /**
   * Canvas をクリアする
   */
  protected clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * 背景を描画する（destination-over モード）
   * @param image - 背景として描画する画像
   */
  protected renderBackground(image: CanvasImageSource): void {
    this.ctx.globalCompositeOperation = 'destination-over';
    this.ctx.drawImage(image, 0, 0, this.width, this.height);
  }

  /**
   * Canvas の状態を保存する
   */
  protected save(): void {
    this.ctx.save();
  }

  /**
   * Canvas の状態を復元する
   */
  protected restore(): void {
    this.ctx.restore();
  }
}
