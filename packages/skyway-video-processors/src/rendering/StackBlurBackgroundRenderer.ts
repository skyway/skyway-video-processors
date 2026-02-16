import type { Results } from '@mediapipe/selfie_segmentation';
import { canvasRGB } from 'stackblur-canvas';
import { CanvasRenderer } from './CanvasRenderer';

/**
 * CanvasRenderingContext2D.filter 非対応環境向けブラー背景レンダラー
 * stackblur-canvas を使用してブラー処理を行う
 */
export class StackBlurBackgroundRenderer extends CanvasRenderer {
  private readonly blurRadius: number;
  private readonly blurCanvas: HTMLCanvasElement;
  private blurCtx: CanvasRenderingContext2D;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    blurRadius: number,
    blurCanvas: HTMLCanvasElement,
    blurCtx: CanvasRenderingContext2D
  ) {
    super(canvas, ctx, width, height);
    this.blurRadius = blurRadius;
    this.blurCanvas = blurCanvas;
    this.blurCtx = blurCtx;
  }

  /**
   * セグメンテーション結果を使用してフレームを合成する
   * 1. Canvas をクリア
   * 2. 前景（人物）をマスク内に描画
   * 3. stackblur-canvas でブラーをかけた背景を描画
   * @param results - セグメンテーション結果
   */
  render(results: Results): void {
    // ブラー用 Canvas に元画像を描画してブラー処理
    this.blurCtx.drawImage(results.image, 0, 0, this.width, this.height);
    canvasRGB(this.blurCanvas, 0, 0, this.width, this.height, this.blurRadius);

    // 合成処理
    this.save();
    this.clear();
    this.renderForeground(results);
    this.renderBackground(this.blurCanvas);
    this.restore();
  }
}
