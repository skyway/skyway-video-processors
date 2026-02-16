import type { ProcessedStream } from '../processedStream';
import type { ProcessedStreamOptions } from '../types';

/**
 * ビデオプロセッサーの共通インターフェース
 * MediaStreamTrackProcessor/requestVideoFrameCallback の各実装がこの型に従う
 */
export type VideoProcessorBackgroundStrategy = {
  /**
   * プロセッサーを初期化する
   */
  initialize(): Promise<void>;

  /**
   * 処理済みストリームを作成する
   * @param options - ストリームのオプション設定
   * @returns 処理済みストリーム
   */
  createProcessedStream(
    options: ProcessedStreamOptions
  ): Promise<ProcessedStream>;

  /**
   * リソースを解放する
   */
  dispose(): Promise<void>;
};

/**
 * ブラー背景プロセッサーのオプション
 */
export type BlurProcessorOptions = {
  /** ブラーの強度（1〜100の範囲） */
  blurRadius: number;
};

/**
 * 仮想背景プロセッサーのオプション
 */
export type VirtualBackgroundProcessorOptions = {
  /** 背景画像 */
  backgroundImage: HTMLImageElement;
};
