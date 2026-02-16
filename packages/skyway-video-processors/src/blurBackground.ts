import { BLUR_RADIUS_RANGE, DEFAULT_BLUR_RADIUS } from './constants';
import { createBlurProcessor } from './factory';
import type { ProcessedStream } from './processedStream';
import type { BlurBackgroundOptions, ProcessedStreamOptions } from './types';
import type { VideoProcessorBackgroundStrategy } from './types/processor';

/**
 * ブラー背景処理を行うメインクラス
 * カメラ映像の背景にブラー（ぼかし）効果を適用する
 * ブラウザの対応状況に応じて、Chrome 用または Safari 用の実装を自動的に選択する
 */
export class BlurBackground {
  /** 初期化済みかどうか */
  private isInitialized = false;
  /** ブラーの強度 */
  private readonly blurRadius: number;
  /** ビデオプロセッサー処理ロジック */
  private processor: VideoProcessorBackgroundStrategy | null = null;

  /**
   * BlurBackground のコンストラクタ
   * @param options - ブラー背景のオプション設定
   * @throws {Error} ブラー値が有効範囲外の場合
   */
  constructor(options?: BlurBackgroundOptions) {
    const blur = options?.blur ?? DEFAULT_BLUR_RADIUS;
    // ブラー値の範囲チェック
    if (blur < BLUR_RADIUS_RANGE.MIN || blur > BLUR_RADIUS_RANGE.MAX) {
      throw new Error(
        `blur is out of range: ${BLUR_RADIUS_RANGE.MIN}-${BLUR_RADIUS_RANGE.MAX}`
      );
    }
    this.blurRadius = blur;
  }

  /**
   * ブラー背景処理を初期化する
   * ブラウザの対応状況を検出し、適切な実装を初期化する
   * @throws {Error} 既に初期化されている場合
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('BlurBackground is already initialized');
    }

    // ファクトリーを使用して適切なプロセッサーを作成
    this.processor = createBlurProcessor({
      blurRadius: this.blurRadius,
    });

    if (!this.processor) {
      throw new Error('BlurBackground is not supported in this environment');
    }

    await this.processor.initialize();

    this.isInitialized = true;
  }

  /**
   * ブラー背景が適用された処理済みストリームを作成する
   * カメラからの映像を取得し、ブラー背景処理を適用したストリームを返す
   * @param options - ストリームのオプション設定
   * @param options.stopTrackWhenDisabled - 無効化時にトラックを停止するかどうか
   * @param options.onUpdateTrack - トラック更新時のコールバック
   * @param options.onStopTrack - トラック停止時のコールバック
   * @param options.constraints - メディアトラックの制約条件
   * @returns 処理済みストリーム
   * @throws {Error} 初期化されていない場合
   */
  async createProcessedStream({
    stopTrackWhenDisabled = false,
    onUpdateTrack,
    onStopTrack,
    constraints = {},
  }: ProcessedStreamOptions): Promise<ProcessedStream> {
    if (!this.isInitialized) {
      throw new Error('BlurBackground is not initialized');
    }

    if (!this.processor) {
      throw new Error('BlurBackground is not supported in this environment');
    }

    return this.processor.createProcessedStream({
      stopTrackWhenDisabled,
      onUpdateTrack,
      onStopTrack,
      constraints,
    });
  }

  /**
   * リソースを解放する
   * セグメンテーション処理やレンダラーを破棄し、メモリを解放する
   * @throws {Error} 初期化されていない場合
   */
  async dispose(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('BlurBackground is not initialized');
    }

    if (this.processor) {
      await this.processor.dispose();
      this.processor = null;
    }

    this.isInitialized = false;
  }
}
