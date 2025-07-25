import { SelfieSegmentation, Results } from '@mediapipe/selfie_segmentation';
import { ProcessedStream } from './processedStream';

type VirtualBackgroundOptions = {
    image: string | HTMLImageElement;
};

export class VirtualBackground {
    private isInitialized: boolean;
    private readonly selfieSegmentation: SelfieSegmentation;
    private processCanvas: OffscreenCanvas;
    private processCanvasCtx: OffscreenCanvasRenderingContext2D;
    private readonly backgroundImage: HTMLImageElement;
    private transformerAbortController: AbortController;

    constructor(options: VirtualBackgroundOptions) {
        this.isInitialized = false;
        this.transformerAbortController = new AbortController();
        this.selfieSegmentation = new SelfieSegmentation({
            locateFile: (path: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${path}`,
        });
        this.selfieSegmentation.setOptions({ modelSelection: 1 });
        this.selfieSegmentation.onResults((results: Results) => {
            this.selfieSegmentationOnResults(results);
        });
        if (typeof options.image === 'string') {
            this.backgroundImage = new Image();
            this.backgroundImage.src = options.image;
            this.backgroundImage.crossOrigin = 'anonymous';
        } else {
            this.backgroundImage = options.image;
        }
    }

    private selfieSegmentationOnResults(results: Results) {
        this.processCanvasCtx.save();
        this.processCanvasCtx.clearRect(0, 0, this.processCanvas.width, this.processCanvas.height);
        this.processCanvasCtx.drawImage(
            results.segmentationMask,
            0,
            0,
            this.processCanvas.width,
            this.processCanvas.height
        );
        this.processCanvasCtx.globalCompositeOperation = 'source-in';
        this.processCanvasCtx.drawImage(results.image, 0, 0, this.processCanvas.width, this.processCanvas.height);
        this.processCanvasCtx.globalCompositeOperation = 'destination-over';
        this.processCanvasCtx.drawImage(
            this.backgroundImage,
            0,
            0,
            this.processCanvas.width,
            this.processCanvas.height
        );
        this.processCanvasCtx.restore();
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            throw new Error('VirtualBackground is already initialized');
        }
        await this.selfieSegmentation.initialize();
        this.isInitialized = true;
    }

    private getProcessedMediaStreamTrack(track: MediaStreamVideoTrack) {
        const { height, width } = track.getSettings();
        if (typeof width !== 'number' || typeof height !== 'number') {
            throw new Error('Failed to get video track settings: width or height is not a number');
        }
        this.processCanvas = new OffscreenCanvas(width, height);
        const ctx = this.processCanvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context for processCanvas');
        }
        this.processCanvasCtx = ctx;
        const rawCanvas = new OffscreenCanvas(width, height);
        const rawCanvasCtx = rawCanvas.getContext('2d');
        if (!rawCanvasCtx) {
            throw new Error('Failed to get 2D context for rawCanvas');
        }
        const processor = new MediaStreamTrackProcessor({ track });
        const generator = new MediaStreamTrackGenerator({ kind: 'video' });
        const transformer = new TransformStream({
            transform: async (videoFrame, controller) => {
                if (!videoFrame) {
                    throw new Error('Video frame is not available');
                }

                let newVideoFrame: VideoFrame | null = null;
                try {
                    rawCanvasCtx.drawImage(videoFrame, 0, 0, width, height);
                    await this.selfieSegmentation.send({ image: rawCanvas as unknown as HTMLCanvasElement });
                    newVideoFrame = new VideoFrame(this.processCanvas, { timestamp: videoFrame.timestamp });
                    controller.enqueue(newVideoFrame);
                } catch (error) {
                    newVideoFrame?.close();
                    throw error;
                } finally {
                    videoFrame.close();
                }
            },
        });

        processor.readable
            .pipeThrough(transformer, { signal: this.transformerAbortController.signal })
            .pipeTo(generator.writable)
            .catch((e: Error) => {
                console.error('VirtualBackground processing error:', e.message);
            });

        return generator;
    }

    async createProcessedStream(
        options: {
            stopTrackWhenDisabled?: boolean;
            onUpdateTrack?: (track: MediaStreamTrack) => Promise<void>;
            constraints?: MediaTrackConstraints;
        } = {}
    ): Promise<ProcessedStream> {
        if (!this.isInitialized) {
            throw new Error('VirtualBackground is not initialized');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: options.constraints ?? {},
        });
        const [track] = stream.getVideoTracks();
        const generator = this.getProcessedMediaStreamTrack(track);

        return new ProcessedStream(generator, 'virtual-background', {
            stopTrackWhenDisabled: options?.stopTrackWhenDisabled ?? false,
            onUpdateTrack: async (track: MediaStreamVideoTrack) => {
                this.transformerAbortController = new AbortController();
                if (options.onUpdateTrack) {
                    const generator = this.getProcessedMediaStreamTrack(track);
                    await options.onUpdateTrack(generator);
                }
            },
            onStopTrack: async () => {
                track.stop();
                this.transformerAbortController.abort();
            },
            constraints: options.constraints ?? {},
        });
    }

    async dispose(): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('VirtualBackground is not initialized');
        }
        this.transformerAbortController.abort();
        await this.selfieSegmentation.close();
        this.isInitialized = false;
    }
}
