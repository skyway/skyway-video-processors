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
        this.processCanvas = new OffscreenCanvas(width, height);
        this.processCanvasCtx = this.processCanvas.getContext('2d');
        const rawCanvas = new OffscreenCanvas(width, height);
        const rawCanvasCtx = rawCanvas.getContext('2d');
        const processor = new MediaStreamTrackProcessor({ track });
        const generator = new MediaStreamTrackGenerator({ kind: 'video' });
        const transformer = new TransformStream({
            transform: async (videoFrame, controller) => {
                rawCanvasCtx.drawImage(videoFrame, 0, 0, width, height);
                await this.selfieSegmentation.send({ image: rawCanvas as unknown as HTMLCanvasElement });
                const newVideoFrame = new VideoFrame(this.processCanvas, { timestamp: videoFrame.timestamp });
                videoFrame.close();

                controller.enqueue(newVideoFrame);
            },
        });

        processor.readable
            .pipeThrough(transformer, { signal: this.transformerAbortController.signal })
            .pipeTo(generator.writable)
            .catch((e: Error) => console.error(e.message));

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
                const generator = this.getProcessedMediaStreamTrack(track);
                options.onUpdateTrack(generator);
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
