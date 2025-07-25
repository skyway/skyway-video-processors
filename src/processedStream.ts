type ProcessedStreamType = 'virtual-background' | 'blur';

type ProcessedStreamOptions = {
    stopTrackWhenDisabled: boolean;
    constraints: MediaTrackConstraints;
    onUpdateTrack: (track: MediaStreamTrack) => Promise<void>;
    onStopTrack: () => Promise<void>;
};

export class ProcessedStream {
    track: MediaStreamTrack | null;
    readonly type: ProcessedStreamType;
    readonly options: Partial<ProcessedStreamOptions>;

    public isEnabled: boolean = true;

    constructor(track: MediaStreamTrack, type: ProcessedStreamType, options?: Partial<ProcessedStreamOptions>) {
        this.track = track;
        this.type = type;
        this.options = options ?? {};
    }

    async setEnabled(enabled: boolean): Promise<void> {
        if (this.track === null) {
            console.warn('ProcessedStream is already disposed.');
            return;
        }
        if (this.options.stopTrackWhenDisabled) {
            if (this.isEnabled && !enabled) {
                this.track.stop();
                this.isEnabled = enabled;
                if (this.options.onStopTrack) {
                    await this.options.onStopTrack();
                }

                return;
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

        if (this.isEnabled && !enabled) {
            this.track.enabled = false;
            this.isEnabled = enabled;
        } else if (!this.isEnabled && enabled) {
            this.track.enabled = true;
            this.isEnabled = enabled;
        }
    }

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
