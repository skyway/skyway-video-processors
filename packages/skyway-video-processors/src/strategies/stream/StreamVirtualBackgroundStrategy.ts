import type { Results } from '@mediapipe/selfie_segmentation';
import { ProcessedStream } from '../../processedStream';
import { VirtualBackgroundRenderer } from '../../rendering';
import { SelfieSegmentationManager } from '../../segmentation';
import type { ProcessedStreamOptions } from '../../types';
import type {
  VideoProcessorBackgroundStrategy,
  VirtualBackgroundProcessorOptions,
} from '../../types/processor';

/**
 * Stream用仮想背景処理
 * MediaStreamTrackProcessor/Generator API を使用してビデオフレームを変換する
 */
export class StreamVirtualBackgroundStrategy
  implements VideoProcessorBackgroundStrategy
{
  /** 初期化済みかどうか */
  private isInitialized = false;
  /** セグメンテーション処理マネージャー */
  private segmentationManager: SelfieSegmentationManager | null = null;
  /** 仮想背景レンダラー */
  private renderer: VirtualBackgroundRenderer | null = null;
  /** 処理用のオフスクリーンCanvas */
  private processCanvas: OffscreenCanvas | null = null;
  /** 背景画像 */
  private readonly backgroundImage: HTMLImageElement;
  /** ストリーム処理の中断用コントローラー */
  private transformerAbortController: AbortController = new AbortController();

  /**
   * StreamVirtualBackgroundStrategy のコンストラクタ
   * @param options - 仮想背景プロセッサーのオプション
   */
  constructor(options: VirtualBackgroundProcessorOptions) {
    this.backgroundImage = options.backgroundImage;
  }

  /**
   * プロセッサーを初期化する
   * @throws {Error} 既に初期化されている場合
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('StreamVirtualBackgroundStrategy is already initialized');
    }

    this.segmentationManager = new SelfieSegmentationManager();
    await this.segmentationManager.initialize();
    this.isInitialized = true;
  }

  /**
   * MediaStreamTrack を処理して仮想背景を適用した新しいトラックを生成する
   * @param track - 処理する元のビデオトラック
   * @returns 仮想背景が適用された MediaStreamTrackGenerator
   * @throws {TypeError} トラックの幅または高さが取得できない場合
   * @throws {Error} Canvas コンテキストの取得に失敗した場合
   */
  private getProcessedMediaStreamTrack(
    track: MediaStreamVideoTrack
  ): MediaStreamTrackGenerator<VideoFrame> {
    const { height, width } = track.getSettings();
    if (typeof width !== 'number' || typeof height !== 'number') {
      throw new TypeError(
        'Failed to get video track settings: width or height is not a number'
      );
    }

    // 処理結果出力用 Canvas の初期化
    this.processCanvas = new OffscreenCanvas(width, height);
    const ctx = this.processCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context for processCanvas');
    }

    // 入力フレーム描画用 Canvas の初期化
    const rawCanvas = new OffscreenCanvas(width, height);
    const rawCanvasCtx = rawCanvas.getContext('2d');
    if (!rawCanvasCtx) {
      throw new Error('Failed to get 2D context for rawCanvas');
    }

    if (!this.segmentationManager) {
      throw new Error('SelfieSegmentationManager is not initialized');
    }

    // 仮想背景レンダラーの初期化
    this.renderer = new VirtualBackgroundRenderer(
      this.processCanvas,
      ctx,
      width,
      height,
      this.backgroundImage
    );

    // セグメンテーション結果を受け取ってレンダリングするコールバックを設定
    this.segmentationManager.setResultCallback((results: Results) => {
      if (this.renderer) {
        this.renderer.render(results);
      }
    });

    // MediaStreamTrackProcessor でビデオフレームを読み取り
    const processor = new MediaStreamTrackProcessor({ track });
    // MediaStreamTrackGenerator で処理済みフレームを出力
    const generator = new MediaStreamTrackGenerator({ kind: 'video' });
    const processCanvas = this.processCanvas;
    const segmentationManager = this.segmentationManager;

    // フレーム変換処理を行う TransformStream
    const transformer = new TransformStream({
      transform: async (videoFrame, controller) => {
        if (!videoFrame) {
          throw new Error('Video frame is not available');
        }

        let newVideoFrame: VideoFrame | null = null;
        try {
          // 入力フレームを Canvas に描画
          rawCanvasCtx.drawImage(videoFrame, 0, 0, width, height);
          // セグメンテーション処理を実行（コールバックでレンダリングされる）
          await segmentationManager.send(rawCanvas);
          // 処理済み Canvas から新しい VideoFrame を生成
          newVideoFrame = new VideoFrame(processCanvas, {
            timestamp: videoFrame.timestamp,
          });
          controller.enqueue(newVideoFrame);
        } catch (error) {
          newVideoFrame?.close();
          throw error;
        } finally {
          // 元のフレームを解放
          videoFrame.close();
        }
      },
    });

    // パイプラインを接続してストリーム処理を開始
    processor.readable
      .pipeThrough(transformer, {
        signal: this.transformerAbortController.signal,
      })
      .pipeTo(generator.writable)
      .catch((e: Error) => {
        console.error(
          'StreamVirtualBackgroundStrategy processing error:',
          e.message
        );
      });

    return generator;
  }

  /**
   * 仮想背景が適用された処理済みストリームを作成する
   * @param options - ストリームのオプション設定
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
      throw new Error('StreamVirtualBackgroundStrategy is not initialized');
    }

    // カメラからビデオストリームを取得
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: constraints,
    });
    const [track] = stream.getVideoTracks();

    // MediaStreamTrackProcessor を使用して仮想背景処理を適用
    const generator = this.getProcessedMediaStreamTrack(track);

    return new ProcessedStream(generator, 'virtual-background', {
      stopTrackWhenDisabled,
      // トラック更新時: 新しいトラックに対して仮想背景処理を再設定
      onUpdateTrack: async (updatedTrack: MediaStreamVideoTrack) => {
        this.transformerAbortController = new AbortController();
        if (onUpdateTrack) {
          const updatedGenerator =
            this.getProcessedMediaStreamTrack(updatedTrack);
          await onUpdateTrack(updatedGenerator);
        }
      },
      // トラック停止時: 元のトラックを停止し、処理パイプラインを中断
      onStopTrack: async () => {
        track.stop();
        this.transformerAbortController.abort();
        await onStopTrack?.();
      },
      constraints,
    });
  }

  /**
   * リソースを解放する
   * @throws {Error} 初期化されていない場合
   */
  async dispose(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('StreamVirtualBackgroundStrategy is not initialized');
    }

    this.transformerAbortController.abort();
    if (this.segmentationManager) {
      await this.segmentationManager.dispose();
      this.segmentationManager = null;
    }

    this.renderer = null;
    this.isInitialized = false;
  }
}
