import type { ProcessedStreamOptions } from './types';

/**
 * 処理済みストリームの種類
 * - 'virtual-background': 仮想背景
 * - 'blur': ブラー背景
 */
type ProcessedStreamType = 'virtual-background' | 'blur';

/**
 * 処理済みのビデオストリームを管理するクラス
 * ブラー背景や仮想背景の処理が適用されたストリームの有効/無効切り替えや破棄を行う
 */
export class ProcessedStream {
  /** 現在のメディアストリームトラック（破棄後はnull） */
  track: MediaStreamTrack | null;
  /** ストリームの処理種類 */
  readonly type: ProcessedStreamType;
  /** オプション設定 */
  readonly options: ProcessedStreamOptions;

  /** ストリームが有効かどうか */
  public isEnabled: boolean = true;

  /**
   * ProcessedStream のコンストラクタ
   * @param track - メディアストリームトラック
   * @param type - 処理種類（'virtual-background' または 'blur'）
   * @param options - オプション設定
   */
  constructor(
    track: MediaStreamTrack,
    type: ProcessedStreamType,
    options?: ProcessedStreamOptions
  ) {
    this.track = track;
    this.type = type;
    this.options = options ?? {};
  }

  /**
   * ストリームの有効/無効を切り替える
   * stopTrackWhenDisabled が true の場合、無効化時にトラックを停止し、
   * 有効化時に新しいトラックを取得する
   * @param enabled - 有効にする場合は true、無効にする場合は false
   */
  async setEnabled(enabled: boolean): Promise<void> {
    if (this.track === null) {
      console.warn('ProcessedStream is already disposed.');
      return;
    }

    // stopTrackWhenDisabled が有効な場合の処理
    if (this.options.stopTrackWhenDisabled) {
      // 有効 → 無効: トラックを停止
      if (this.isEnabled && !enabled) {
        this.track.stop();
        this.isEnabled = enabled;
        if (this.options.onStopTrack) {
          await this.options.onStopTrack();
        }

        return;
        // 無効 → 有効: 新しいトラックを取得
      } else if (!this.isEnabled && enabled) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: this.options.constraints,
        });
        const [track] = stream.getVideoTracks();
        this.track = track;
        this.isEnabled = enabled;
        if (this.options.onUpdateTrack) {
          await this.options.onUpdateTrack(track);
        }

        return;
      }
    }

    // stopTrackWhenDisabled が無効な場合は、トラックの enabled プロパティを切り替え
    if (this.isEnabled && !enabled) {
      this.track.enabled = false;
      this.isEnabled = enabled;
    } else if (!this.isEnabled && enabled) {
      this.track.enabled = true;
      this.isEnabled = enabled;
    }
  }

  /**
   * ストリームを破棄する
   * トラックを停止し、リソースを解放する
   */
  async dispose(): Promise<void> {
    if (this.track) {
      this.track.stop();
    }
    if (this.options.onStopTrack) {
      await this.options.onStopTrack();
    }
    this.track = null;
  }
}
