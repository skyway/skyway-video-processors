import {
  type Results,
  SelfieSegmentation,
} from '@mediapipe/selfie_segmentation';
import { SELFIE_SEGMENTATION_CONFIG } from '../constants';

/**
 * SelfieSegmentation の結果を受け取るコールバック型
 */
export type SegmentationResultCallback = (results: Results) => void;

/**
 * SelfieSegmentation のライフサイクルを管理するクラス
 * セグメンテーション処理の初期化、実行、破棄を一元管理する
 */
export class SelfieSegmentationManager {
  private selfieSegmentation: SelfieSegmentation | null = null;
  private isInitialized: boolean = false;
  private resultCallback: SegmentationResultCallback | null = null;

  /**
   * SelfieSegmentation を初期化する
   * @throws {Error} 既に初期化されている場合
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('SelfieSegmentationManager is already initialized');
    }

    this.selfieSegmentation = new SelfieSegmentation({
      locateFile: (path: string) =>
        `${SELFIE_SEGMENTATION_CONFIG.CDN_BASE_URL}${path}`,
    });

    this.selfieSegmentation.setOptions({
      modelSelection: SELFIE_SEGMENTATION_CONFIG.MODEL_SELECTION,
    });

    if (this.resultCallback) {
      this.selfieSegmentation.onResults(this.resultCallback);
    }

    await this.selfieSegmentation.initialize();
    this.isInitialized = true;
  }

  /**
   * セグメンテーション結果を受け取るコールバックを設定する
   * @param callback - 結果を受け取るコールバック関数
   */
  setResultCallback(callback: SegmentationResultCallback): void {
    this.resultCallback = callback;
    if (this.selfieSegmentation) {
      this.selfieSegmentation.onResults(callback);
    }
  }

  /**
   * 画像をセグメンテーション処理に送信する
   * @param image - 処理する画像（Canvas または ImageElement）
   * @throws {Error} 初期化されていない場合
   */
  async send(image: HTMLCanvasElement | OffscreenCanvas): Promise<void> {
    if (!this.isInitialized || !this.selfieSegmentation) {
      throw new Error('SelfieSegmentationManager is not initialized');
    }

    await this.selfieSegmentation.send({
      image: image as unknown as HTMLCanvasElement,
    });
  }

  /**
   * リソースを解放する
   * @throws {Error} 初期化されていない場合
   */
  async dispose(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('SelfieSegmentationManager is not initialized');
    }

    if (this.selfieSegmentation) {
      await this.selfieSegmentation.close();
      this.selfieSegmentation = null;
    }

    this.resultCallback = null;
    this.isInitialized = false;
  }
}
