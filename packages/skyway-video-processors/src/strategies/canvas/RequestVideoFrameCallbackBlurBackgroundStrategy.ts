import type { Results } from '@mediapipe/selfie_segmentation';
import { CAPTURE_STREAM_FPS } from '../../constants';
import { ProcessedStream } from '../../processedStream';
import { StackBlurBackgroundRenderer } from '../../rendering';
import { SelfieSegmentationManager } from '../../segmentation';
import type { ProcessedStreamOptions } from '../../types';
import type {
  BlurProcessorOptions,
  VideoProcessorBackgroundStrategy,
} from '../../types/processor';

/**
 * requestVideoFrameCallback ベースのブラー背景処理
 * video 要素と Canvas を使ってフレーム処理し、captureStream で出力する
 */
export class RequestVideoFrameCallbackBlurBackgroundStrategy
  implements VideoProcessorBackgroundStrategy
{
  /** 初期化済みかどうか */
  private isInitialized = false;
  /** セグメンテーション処理マネージャー */
  private segmentationManager: SelfieSegmentationManager | null = null;
  /** requestVideoFrameCallback 実装向けブラー背景レンダラー */
  private renderer: StackBlurBackgroundRenderer | null = null;
  /** ブラーの強度 */
  private readonly blurRadius: number;
  /** ビデオ要素（カメラ映像の再生用） */
  private videoElement: HTMLVideoElement | null = null;
  /** 出力用 Canvas */
  private canvas: HTMLCanvasElement | null = null;
  /** 出力用 Canvas のコンテキスト */
  private canvasCtx: CanvasRenderingContext2D | null = null;
  /** 入力フレーム描画用 Canvas */
  private rawCanvas: HTMLCanvasElement | null = null;
  /** 入力フレーム描画用 Canvas のコンテキスト */
  private rawCanvasCtx: CanvasRenderingContext2D | null = null;
  /** ブラー処理用 Canvas */
  private blurCanvas: HTMLCanvasElement | null = null;
  /** ブラー処理用 Canvas のコンテキスト */
  private blurCtx: CanvasRenderingContext2D | null = null;
  /** requestVideoFrameCallback のコールバックID */
  private callbackId: number | null = null;
  /** 最新のセグメンテーション結果 */
  private latestResults: Results | null = null;

  /**
   * RequestVideoFrameCallbackBlurBackgroundStrategy のコンストラクタ
   * @param options - ブラープロセッサーのオプション
   */
  constructor(options: BlurProcessorOptions) {
    this.blurRadius = options.blurRadius;
  }

  /**
   * プロセッサーを初期化する
   * @throws {Error} 既に初期化されている場合
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error(
        'RequestVideoFrameCallbackBlurBackgroundStrategy is already initialized'
      );
    }

    // セグメンテーションマネージャーの初期化
    this.segmentationManager = new SelfieSegmentationManager();
    // セグメンテーション結果を保存するコールバックを設定
    this.segmentationManager.setResultCallback((results: Results) => {
      this.latestResults = results;
    });
    await this.segmentationManager.initialize();

    this.isInitialized = true;
  }

  /**
   * 1フレームを処理する
   * ビデオ要素から画像を取得し、セグメンテーション→レンダリングを実行する
   */
  private async processFrame(): Promise<void> {
    // 必要なリソースが揃っていない場合は処理をスキップ
    if (
      !this.videoElement ||
      !this.rawCanvasCtx ||
      !this.segmentationManager ||
      !this.canvas ||
      !this.rawCanvas ||
      !this.renderer
    ) {
      return;
    }

    try {
      this.syncProcessingSize();

      const { width, height } = this.canvas;

      // 1. videoElement から rawCanvas に描画
      this.rawCanvasCtx.drawImage(this.videoElement, 0, 0, width, height);

      // 2. セグメンテーション実行
      await this.segmentationManager.send(this.rawCanvas);

      // 3. 合成処理（ブラー背景 + 前景）
      if (this.latestResults) {
        this.renderer.render(this.latestResults);
      }
    } catch (error) {
      console.error(
        'RequestVideoFrameCallbackBlurBackgroundStrategy processing error:',
        error
      );
    } finally {
      // 4. 次のフレームをスケジュール
      this.scheduleNextFrame();
    }
  }

  /**
   * videoElement の実寸（videoWidth/videoHeight）に合わせて処理サイズを同期する
   * 画面回転などで映像のデコードサイズが変わった場合に Canvas/captureStream を追従させる
   */
  private syncProcessingSize(): void {
    if (
      !this.videoElement ||
      !this.canvas ||
      !this.rawCanvas ||
      !this.blurCanvas
    ) {
      return;
    }

    const width = this.videoElement.videoWidth;
    const height = this.videoElement.videoHeight;
    if (width === 0 || height === 0) {
      return;
    }

    if (this.canvas.width === width && this.canvas.height === height) {
      return;
    }

    // Canvas のサイズ変更で context の状態がリセットされるため、再取得する
    this.canvas.width = width;
    this.canvas.height = height;
    this.rawCanvas.width = width;
    this.rawCanvas.height = height;
    this.blurCanvas.width = width;
    this.blurCanvas.height = height;

    const canvasCtx = this.canvas.getContext('2d', {
      willReadFrequently: true,
    });
    const rawCanvasCtx = this.rawCanvas.getContext('2d', {
      willReadFrequently: true,
    });
    const blurCtx = this.blurCanvas.getContext('2d', {
      willReadFrequently: true,
    });

    if (!canvasCtx || !rawCanvasCtx || !blurCtx) {
      throw new Error('Failed to get 2D context for canvases');
    }

    this.canvasCtx = canvasCtx;
    this.rawCanvasCtx = rawCanvasCtx;
    this.blurCtx = blurCtx;

    // 旧サイズのセグメンテーション結果を誤って描画しない
    this.latestResults = null;

    this.renderer = new StackBlurBackgroundRenderer(
      this.canvas,
      canvasCtx,
      width,
      height,
      this.blurRadius,
      this.blurCanvas,
      blurCtx
    );
  }

  /**
   * 次のフレーム処理をスケジュールする
   * requestVideoFrameCallback を使用して、次のビデオフレームが利用可能になったときに処理を実行する
   */
  private scheduleNextFrame(): void {
    if (this.videoElement) {
      this.callbackId = this.videoElement.requestVideoFrameCallback(() =>
        this.processFrame()
      );
    }
  }

  /**
   * ブラー背景が適用された処理済みストリームを作成する
   * @param options - ストリームのオプション設定
   * @returns 処理済みストリーム
   * @throws {Error} 初期化されていない場合
   */
  async createProcessedStream({
    stopTrackWhenDisabled = false,
    onStopTrack,
    onUpdateTrack,
    constraints = {},
  }: ProcessedStreamOptions): Promise<ProcessedStream> {
    if (!this.isInitialized) {
      throw new Error(
        'RequestVideoFrameCallbackBlurBackgroundStrategy is not initialized'
      );
    }

    // カメラからビデオストリームを取得
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: constraints,
    });
    const [track] = stream.getVideoTracks();

    return this.setupProcessing(track, {
      onUpdateTrack,
      constraints,
      onStopTrack,
      stopTrackWhenDisabled,
    });
  }

  /**
   * ビデオトラックに対してブラー背景処理をセットアップする
   * @param track - 処理する元のビデオトラック
   * @param options - ストリームのオプション設定
   * @returns 処理済みストリーム
   * @throws {TypeError} ビデオの幅または高さが取得できない場合
   * @throws {Error} Canvas コンテキストの取得に失敗した場合
   */
  private async setupProcessing(
    track: MediaStreamVideoTrack,
    {
      stopTrackWhenDisabled = false,
      onUpdateTrack,
      onStopTrack,
      constraints = {},
    }: ProcessedStreamOptions
  ): Promise<ProcessedStream> {
    // ビデオ要素の作成と設定（カメラ映像を再生するため）
    this.videoElement = document.createElement('video');
    this.videoElement.srcObject = new MediaStream([track]);
    this.videoElement.muted = true;
    this.videoElement.playsInline = true;
    await this.videoElement.play();

    // videoElement から実際のサイズを取得
    // track.getSettings() は iOS Safari で ideal 値を返す場合があるため、
    // 実際にデコードされた映像のサイズを使用する
    const width = this.videoElement.videoWidth;
    const height = this.videoElement.videoHeight;
    if (width === 0 || height === 0) {
      throw new TypeError(
        'Failed to get video dimensions: width or height is 0'
      );
    }

    // 出力用 Canvas の初期化
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvasCtx = this.canvas.getContext('2d', { willReadFrequently: true });

    // 入力フレーム描画用 Canvas の初期化
    this.rawCanvas = document.createElement('canvas');
    this.rawCanvas.width = width;
    this.rawCanvas.height = height;
    this.rawCanvasCtx = this.rawCanvas.getContext('2d', {
      willReadFrequently: true,
    });

    // ブラー処理用 Canvas の初期化
    this.blurCanvas = document.createElement('canvas');
    this.blurCanvas.width = width;
    this.blurCanvas.height = height;
    this.blurCtx = this.blurCanvas.getContext('2d', {
      willReadFrequently: true,
    });

    if (!this.canvasCtx || !this.rawCanvasCtx || !this.blurCtx) {
      throw new Error('Failed to get 2D context for canvases');
    }

    // requestVideoFrameCallback 実装向けブラー背景レンダラーの初期化
    this.renderer = new StackBlurBackgroundRenderer(
      this.canvas,
      this.canvasCtx,
      width,
      height,
      this.blurRadius,
      this.blurCanvas,
      this.blurCtx
    );

    // フレーム処理を開始
    this.scheduleNextFrame();

    // Canvas から出力ストリームを作成
    const outputStream = this.canvas.captureStream(CAPTURE_STREAM_FPS);
    const [outputTrack] = outputStream.getVideoTracks();

    return new ProcessedStream(outputTrack, 'blur', {
      stopTrackWhenDisabled,
      // トラック更新時: 処理を停止し、新しいトラックで再セットアップ
      onUpdateTrack: async (newTrack: MediaStreamVideoTrack) => {
        this.stopProcessing();
        const newStream = await this.setupProcessing(newTrack, {
          stopTrackWhenDisabled,
          onUpdateTrack,
          onStopTrack,
          constraints,
        });
        if (newStream.track && onUpdateTrack) {
          await onUpdateTrack(newStream.track);
        }
      },
      // トラック停止時: 処理を停止し、元のトラックも停止
      onStopTrack: async () => {
        this.stopProcessing();
        track.stop();
        await onStopTrack?.();
      },
      constraints,
    });
  }

  /**
   * フレーム処理を停止し、関連リソースを解放する
   */
  private stopProcessing(): void {
    // requestVideoFrameCallback をキャンセル
    if (this.callbackId !== null && this.videoElement) {
      this.videoElement.cancelVideoFrameCallback(this.callbackId);
      this.callbackId = null;
    }
    // ビデオ要素のクリーンアップ
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement.load();
      this.videoElement = null;
    }
    // Canvas とレンダラーのクリーンアップ
    this.canvas = null;
    this.canvasCtx = null;
    this.rawCanvas = null;
    this.rawCanvasCtx = null;
    this.blurCanvas = null;
    this.blurCtx = null;
    this.latestResults = null;
    this.renderer = null;
  }

  /**
   * リソースを解放する
   * @throws {Error} 初期化されていない場合
   */
  async dispose(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(
        'RequestVideoFrameCallbackBlurBackgroundStrategy is not initialized'
      );
    }

    this.stopProcessing();

    if (this.segmentationManager) {
      await this.segmentationManager.dispose();
      this.segmentationManager = null;
    }

    this.isInitialized = false;
  }
}
