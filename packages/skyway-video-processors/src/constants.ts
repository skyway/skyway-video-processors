/**
 * SelfieSegmentation のモデル選択オプション
 */
export const SELFIE_SEGMENTATION_MODEL = {
  /** 一般的なセグメンテーション（高速、精度低め） */
  GENERAL: 0,
  /** 風景モード（より高精度、やや低速） */
  LANDSCAPE: 1,
} as const;

/**
 * SelfieSegmentation のデフォルト設定
 */
export const SELFIE_SEGMENTATION_CONFIG = {
  /** 使用するモデル */
  MODEL_SELECTION: SELFIE_SEGMENTATION_MODEL.LANDSCAPE,
  /** CDN URL のベースパス（依存バージョンと揃える） */
  CDN_BASE_URL:
    'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/',
} as const;

/**
 * Canvas キャプチャストリームのフレームレート
 */
export const CAPTURE_STREAM_FPS = 30;

/**
 * デフォルトのブラー半径
 */
export const DEFAULT_BLUR_RADIUS = 20;

/**
 * ブラー半径の有効範囲
 */
export const BLUR_RADIUS_RANGE = {
  MIN: 1,
  MAX: 100,
} as const;
