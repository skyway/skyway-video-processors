import { BlurBackground, VirtualBackground } from 'skyway-video-processors';

(async () => {
    const videoElement = <HTMLVideoElement>document.getElementById('local-video');
    const enableButton = <HTMLButtonElement>document.getElementById('enable');
    const disableButton = <HTMLButtonElement>document.getElementById('disable');
    const disposeVideoButton = <HTMLButtonElement>document.getElementById('dispose-video');
    const disposeProcessorButton = <HTMLButtonElement>document.getElementById('dispose-processor');

    // 背景差し替え処理を適用する場合
    const backgroundProcessor = new VirtualBackground({ image: 'images/green.png' });
    // 背景ぼかし処理を適用する場合
    // const backgroundProcessor = new BlurBackground({ blur: 50 });
    await backgroundProcessor.initialize();

    const constraints = {
        height: {ideal: 480},
        width: {ideal: 640},
        deviceId: 'default',
    };
    const result = await backgroundProcessor.createProcessedStream({
        stopTrackWhenDisabled: true,
        onUpdateTrack: async (track) => {
            const stream = new MediaStream([track]);
            videoElement.srcObject = stream;
        },
        constraints
    });

    enableButton.addEventListener('click', () => {
        result.setEnabled(true);
    });
    disableButton.addEventListener('click', () => {
        result.setEnabled(false);
    });
    disposeProcessorButton.addEventListener('click', async () => {
        await backgroundProcessor.dispose();
    });
    disposeVideoButton.addEventListener('click', async () => {
        await result.dispose();
    });
    
    const stream = new MediaStream([result.track]);
    videoElement.srcObject = stream;
    await videoElement.play();
})();
