import {
  type LocalCustomVideoStream,
  type LocalStream,
  nowInSec,
  type RoomPublication,
  SkyWayAuthToken,
  SkyWayContext,
  SkyWayRoom,
  SkyWayStreamFactory,
  uuidV4,
} from '@skyway-sdk/room';

// 背景差し替え処理を適用する場合
// import { VirtualBackground } from 'skyway-video-processors';

// 背景ぼかし処理を適用する場合
import { BlurBackground } from 'skyway-video-processors';

const appId = '<ここにアプリケーション ID を入力>';
const secret = '<ここにシークレットキーを入力>';

const token = new SkyWayAuthToken({
  jti: uuidV4(),
  iat: nowInSec(),
  exp: nowInSec() + 60 * 60 * 24,
  version: 3,
  scope: {
    appId,
    rooms: [
      {
        id: '*',
        methods: ['create', 'close', 'updateMetadata'],
        member: {
          id: '*',
          methods: ['publish', 'subscribe', 'updateMetadata'],
        },
        sfu: {
          enabled: true,
        },
      },
    ],
    turn: {
      enabled: true,
    },
    analytics: {
      enabled: true,
    },
  },
}).encode(secret);

(async () => {
  const localVideo = <HTMLVideoElement>document.getElementById('local-video');
  const buttonArea = <HTMLDivElement>document.getElementById('button-area');
  const remoteMediaArea = <HTMLDivElement>(
    document.getElementById('remote-media-area')
  );
  const roomNameInput = <HTMLInputElement>document.getElementById('room-name');

  const disableButton = <HTMLButtonElement>document.getElementById('disable');
  const enableButton = <HTMLButtonElement>document.getElementById('enable');
  const disposeVideoButton = <HTMLButtonElement>(
    document.getElementById('dispose-video')
  );
  const disposeProcessorButton = <HTMLButtonElement>(
    document.getElementById('dispose-processor')
  );

  const myId = document.getElementById('my-id');
  const joinButton = document.getElementById('join');
  // 背景差し替え処理を適用する場合
  // const backgroundProcessor = new VirtualBackground({
  //   image: 'images/green.png',
  // });

  // 背景ぼかし処理を適用する場合
  const backgroundProcessor = new BlurBackground({
    blur: 50,
  });

  await backgroundProcessor.initialize();

  const video: LocalCustomVideoStream =
    await SkyWayStreamFactory.createCustomVideoStream(backgroundProcessor, {
      stopTrackWhenDisabled: true,
    });
  video.attach(localVideo);
  try {
    await localVideo.play();
  } catch (error) {
    console.error('localVideo.play failed', error);
  }

  let publication: RoomPublication;

  disableButton.addEventListener('click', async () => {
    await publication.disable();
  });
  enableButton.addEventListener('click', async () => {
    await publication.enable();
    await localVideo.play();
  });
  disposeProcessorButton.addEventListener('click', async () => {
    await backgroundProcessor.dispose();
  });
  disposeVideoButton.addEventListener('click', async () => {
    video.release();
  });

  joinButton.onclick = async () => {
    if (roomNameInput.value === '') {
      return;
    }

    const context = await SkyWayContext.Create(token, {
      log: {
        level: 'debug',
      },
    });
    const room = await SkyWayRoom.FindOrCreate(context, {
      type: 'p2p',
      // type: 'sfu',
      name: roomNameInput.value,
    });
    const me = await room.join();

    myId.textContent = me.id;

    publication = await me.publish(video);

    const subscribeAndAttach = (publication: RoomPublication<LocalStream>) => {
      if (publication.publisher.id === me.id) {
        return;
      }

      const subscribeButton = document.createElement('button');
      subscribeButton.textContent = `${publication.publisher.id}: ${publication.contentType}`;
      buttonArea.appendChild(subscribeButton);

      subscribeButton.onclick = async () => {
        const { stream } = await me.subscribe(publication.id);

        if (stream.contentType === 'data') {
          return;
        }

        let newMedia: HTMLVideoElement | HTMLAudioElement;
        switch (stream.track.kind) {
          case 'video':
            newMedia = document.createElement('video');
            (newMedia as HTMLVideoElement).playsInline = true;
            newMedia.autoplay = true;
            break;
          case 'audio':
            newMedia = document.createElement('audio');
            newMedia.controls = true;
            newMedia.autoplay = true;
            break;
          default:
            return;
        }
        stream.attach(newMedia);
        remoteMediaArea.appendChild(newMedia);
        publication.onDisabled.add(() => newMedia.load());
      };
    };

    room.publications.forEach(subscribeAndAttach);
    room.onStreamPublished.add((e) => subscribeAndAttach(e.publication));
  };
})();
