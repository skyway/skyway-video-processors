/**
 * ブラー背景のオプション設定
 */
export type BlurBackgroundOptions = {
  /** ブラーの強度（1〜100の範囲） */
  blur: number;
};

/**
 * 仮想背景のオプション設定
 */
export type VirtualBackgroundOptions = {
  /** 背景画像（URL文字列またはHTMLImageElement） */
  image: string | HTMLImageElement;
};

/**
 * 処理済みストリームのオプション設定
 */
export type ProcessedStreamOptions = {
  /** 無効化時にトラックを停止するかどうか */
  stopTrackWhenDisabled?: boolean;
  /** メディアトラックの制約条件 */
  constraints?: MediaTrackConstraints;
  /** トラック更新時のコールバック */
  onUpdateTrack?: (track: MediaStreamTrack) => Promise<void>;
  /** トラック停止時のコールバック */
  onStopTrack?: () => Promise<void>;
};
