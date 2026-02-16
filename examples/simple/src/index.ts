// 背景差し替え処理を適用する場合
// import { VirtualBackground } from 'skyway-video-processors';

// 背景ぼかし処理を適用する場合
import { BlurBackground } from 'skyway-video-processors';

(async () => {
  const videoElement = document.getElementById(
    'local-video'
  ) as HTMLVideoElement;
  const enableButton = document.getElementById('enable') as HTMLButtonElement;
  const disableButton = document.getElementById('disable') as HTMLButtonElement;
  const disposeVideoButton = document.getElementById(
    'dispose-video'
  ) as HTMLButtonElement;
  const disposeProcessorButton = document.getElementById(
    'dispose-processor'
  ) as HTMLButtonElement;

  // 背景差し替え処理を適用する場合
  // const backgroundProcessor = new VirtualBackground({
  //   image: 'images/green.png',
  // });

  // 背景ぼかし処理を適用する場合
  const backgroundProcessor = new BlurBackground({ blur: 50 });

  await backgroundProcessor.initialize();

  const constraints = {
    height: { ideal: 480 },
    width: { ideal: 640 },
    deviceId: 'default',
  };
  const result = await backgroundProcessor.createProcessedStream({
    stopTrackWhenDisabled: true,
    onUpdateTrack: async (track) => {
      videoElement.srcObject = new MediaStream([track]);
      await videoElement.play();
    },
    constraints,
  });

  enableButton.addEventListener('click', async () => {
    try {
      await result.setEnabled(true);
    } catch (error) {
      console.error('enable failed', error);
    }
  });
  disableButton.addEventListener('click', async () => {
    try {
      await result.setEnabled(false);
    } catch (error) {
      console.error('disable failed', error);
    }
  });
  disposeProcessorButton.addEventListener('click', async () => {
    try {
      await backgroundProcessor.dispose();
    } catch (error) {
      console.error('dispose processor failed', error);
    }
  });
  disposeVideoButton.addEventListener('click', async () => {
    try {
      await result.dispose();
    } catch (error) {
      console.error('dispose video failed', error);
    }
  });

  if (!result.track) {
    throw new Error('Failed to create processed stream: track is null');
  }

  videoElement.srcObject = new MediaStream([result.track]);
  await videoElement.play();
})();
