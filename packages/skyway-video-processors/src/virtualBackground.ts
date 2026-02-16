import { createVirtualBackgroundProcessor } from './factory';
import type { ProcessedStream } from './processedStream';
import type { ProcessedStreamOptions, VirtualBackgroundOptions } from './types';
import type { VideoProcessorBackgroundStrategy } from './types/processor';

/**
 * 仮想背景処理を行うメインクラス
 * カメラ映像の背景を指定した画像に置き換える
 * ブラウザの対応状況に応じて、Chrome 用または Safari 用の実装を自動的に選択する
 */
export class VirtualBackground {
  /** 初期化済みかどうか */
  private isInitialized = false;
  /** 背景画像 */
  private readonly backgroundImage: HTMLImageElement;
  /** ビデオプロセッサー処理ロジック */
  private processor: VideoProcessorBackgroundStrategy | null = null;

  /**
   * VirtualBackground のコンストラクタ
   * @param options - 仮想背景のオプション設定
   */
  constructor(options: VirtualBackgroundOptions) {
    // 背景画像の設定（URL文字列の場合はImageElementを作成）
    if (typeof options.image === 'string') {
      this.backgroundImage = new Image();
      this.backgroundImage.src = options.image;
      this.backgroundImage.crossOrigin = 'anonymous';
    } else {
      this.backgroundImage = options.image;
    }
  }

  /**
   * 仮想背景処理を初期化する
   * ブラウザの対応状況を検出し、適切な実装を初期化する
   * @throws {Error} 既に初期化されている場合
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('VirtualBackground is already initialized');
    }

    // ファクトリーを使用して適切なプロセッサーを作成
    this.processor = createVirtualBackgroundProcessor({
      backgroundImage: this.backgroundImage,
    });

    if (!this.processor) {
      throw new Error('VirtualBackground is not supported in this environment');
    }

    await this.processor.initialize();

    this.isInitialized = true;
  }

  /**
   * 仮想背景が適用された処理済みストリームを作成する
   * カメラからの映像を取得し、仮想背景処理を適用したストリームを返す
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
      throw new Error('VirtualBackground is not initialized');
    }

    if (!this.processor) {
      throw new Error('VirtualBackground is not supported in this environment');
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
      throw new Error('VirtualBackground is not initialized');
    }

    if (this.processor) {
      await this.processor.dispose();
      this.processor = null;
    }

    this.isInitialized = false;
  }
}
