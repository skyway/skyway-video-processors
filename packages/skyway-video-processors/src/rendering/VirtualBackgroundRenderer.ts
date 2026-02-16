import type { Results } from '@mediapipe/selfie_segmentation';
import { CanvasRenderer } from './CanvasRenderer';

/**
 * 仮想背景（背景画像置換）のレンダリングを行うクラス
 * セグメンテーション結果を使用して、人物を前景に、指定した画像を背景に合成する
 */
export class VirtualBackgroundRenderer extends CanvasRenderer {
  private readonly backgroundImage: HTMLImageElement;

  constructor(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    width: number,
    height: number,
    backgroundImage: HTMLImageElement
  ) {
    super(canvas, ctx, width, height);
    this.backgroundImage = backgroundImage;
  }

  /**
   * セグメンテーション結果を使用してフレームを合成する
   * 1. Canvas をクリア
   * 2. 前景（人物）をマスク内に描画
   * 3. 背景画像を描画
   * @param results - セグメンテーション結果
   */
  render(results: Results): void {
    this.save();
    this.clear();
    this.renderForeground(results);
    this.renderBackground(this.backgroundImage);
    this.restore();
  }
}
