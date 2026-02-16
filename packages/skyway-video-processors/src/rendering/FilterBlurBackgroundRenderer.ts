import type { Results } from '@mediapipe/selfie_segmentation';
import { CanvasRenderer } from './CanvasRenderer';

/**
 * ブラー背景のレンダリングを行うクラス
 * セグメンテーション結果を使用して、人物を前景に、ブラーをかけた背景を合成する
 */
export class FilterBlurBackgroundRenderer extends CanvasRenderer {
  private readonly blurRadius: number;

  constructor(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    width: number,
    height: number,
    blurRadius: number
  ) {
    super(canvas, ctx, width, height);
    this.blurRadius = blurRadius;
  }

  /**
   * セグメンテーション結果を使用してフレームを合成する
   * 1. Canvas をクリア
   * 2. 前景（人物）をマスク内に描画
   * 3. ブラーをかけた背景を描画
   * @param results - セグメンテーション結果
   */
  render(results: Results): void {
    this.save();
    this.clear();
    this.renderForeground(results);
    this.renderBlurredBackground(results);
    this.restore();
  }

  /**
   * ブラーをかけた背景を描画する
   * Chrome (OffscreenCanvas) では CSS filter を使用
   * @param results - セグメンテーション結果
   */
  private renderBlurredBackground(results: Results): void {
    this.ctx.globalCompositeOperation = 'destination-over';
    this.ctx.filter = `blur(${this.blurRadius}px)`;
    this.ctx.drawImage(results.image, 0, 0, this.width, this.height);
    this.ctx.filter = 'none';
  }
}
