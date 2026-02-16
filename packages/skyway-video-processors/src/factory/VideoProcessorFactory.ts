import {
  RequestVideoFrameCallbackBlurBackgroundStrategy,
  RequestVideoFrameCallbackVirtualBackgroundStrategy,
  StreamBlurBackgroundStrategy,
  StreamVirtualBackgroundStrategy,
} from '../strategies';
import type {
  BlurProcessorOptions,
  VideoProcessorBackgroundStrategy,
  VirtualBackgroundProcessorOptions,
} from '../types/processor';
import { getSupportedVideoFrameProcessingMethod } from '../utils/browserDetection';

/**
 * ブラー背景プロセッサーを作成する
 * ブラウザの対応状況に応じて Stream 用または Canvas 用の実装を返す
 * @param options - ブラープロセッサーのオプション
 * @returns ブラー背景プロセッサー（サポートされていない場合は null）
 */
export function createBlurProcessor(
  options: BlurProcessorOptions
): VideoProcessorBackgroundStrategy | null {
  const method = getSupportedVideoFrameProcessingMethod();

  switch (method) {
    case 'mediaStreamTrackProcessor':
      return new StreamBlurBackgroundStrategy(options);
    case 'requestVideoFrameCallback':
      return new RequestVideoFrameCallbackBlurBackgroundStrategy(options);
    case 'none':
      return null;
  }
}

/**
 * 仮想背景プロセッサーを作成する
 * ブラウザの対応状況に応じて Stream 用または Canvas 用の実装を返す
 * @param options - 仮想背景プロセッサーのオプション
 * @returns 仮想背景プロセッサー（サポートされていない場合は null）
 */
export function createVirtualBackgroundProcessor(
  options: VirtualBackgroundProcessorOptions
): VideoProcessorBackgroundStrategy | null {
  const method = getSupportedVideoFrameProcessingMethod();

  switch (method) {
    case 'mediaStreamTrackProcessor':
      return new StreamVirtualBackgroundStrategy(options);
    case 'requestVideoFrameCallback':
      return new RequestVideoFrameCallbackVirtualBackgroundStrategy(options);
    case 'none':
      return null;
  }
}
