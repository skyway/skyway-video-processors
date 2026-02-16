/**
 * サポートされているビデオフレーム処理方式（内部用）
 */
type SupportedVideoFrameProcessingMethod =
  | 'mediaStreamTrackProcessor'
  | 'requestVideoFrameCallback'
  | 'none';

/**
 * MediaStreamTrackProcessor が利用可能かどうかをチェックする
 */
export function supportsMediaStreamTrackProcessor(): boolean {
  return (
    'MediaStreamTrackProcessor' in globalThis &&
    'MediaStreamTrackGenerator' in globalThis
  );
}

/**
 * requestVideoFrameCallback が利用可能かどうかをチェックする
 */
export function supportsRequestVideoFrameCallback(): boolean {
  return 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
}

/**
 * ブラウザのビデオフレーム処理サポートを優先度順で取得する
 */
export function getSupportedVideoFrameProcessingMethod(): SupportedVideoFrameProcessingMethod {
  if (supportsMediaStreamTrackProcessor()) {
    return 'mediaStreamTrackProcessor';
  }
  if (supportsRequestVideoFrameCallback()) {
    return 'requestVideoFrameCallback';
  }
  return 'none';
}
