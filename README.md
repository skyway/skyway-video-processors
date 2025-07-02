# skyway-video-processors

JavaScript/TypeScript を用いてブラウザ上でカメラから取得した映像の背景を加工するライブラリです。
カメラから取得した映像の背景を任意の画像に差し替えたり(以下では背景差し替え処理と呼びます)、背景へのぼかし処理(以下では背景ぼかし処理と呼びます)を行うことができます。

## 本リポジトリの運用方針について

このリポジトリは公開用のミラーリポジトリであり、こちらで開発は行いません。

### Issue / Pull Request

受け付けておりません。

Enterprise プランをご契約のお客様はテクニカルサポートをご利用ください。
詳しくは[SkyWay サポート](https://support.skyway.ntt.com/hc/ja)をご確認ください。

## 対応ブラウザ

- Chrome
- Edge

`MediaStreamTrackProcessor` という Experimental のブラウザ API を使用しているため、使用する際は以下より対応ブラウザを参照してください。

https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrackProcessor#browser_compatibility

## インストール

以下のコマンドでインストールを行います。

```
npm install skyway-video-processors
```

## 使い方

以下の使い方の詳細は[Sample](./example/simple/src/index.ts)を参照してください。

任意の画像を利用して背景差し替え処理を行う `VirtualBackground` と、任意の強度で背景ぼかし処理を適用する `BlurBackground` の 2 つのクラスが存在します。

### `VirtualBackground` の使い方

`VirtualBackground` のインスタンスを作成します。

```ts
import { VirtualBackground } from 'skyway-video-processors';
virtualBackground = new VirtualBackground({ image: 'green.png' });
```

インスタンスの初期化を行います。

```ts
await virtualBackground.initialize();
```

`createProcessedStream`によって、デバイスからの映像に対して背景差し替え処理を行った映像の `ProcessedStream` を取得できます。
`ProcessedStream` の track を用いて、背景差し替え処理を行った映像の `MediaStream` を作成できます。

```ts
const result = await virtualBackground.createProcessedStream();
const stream = new MediaStream([result.track]);
```

作成した `MediaStream` を `videoElement` の `srcObject` に割り当てることで映像を再生できます。

```ts
videoElement.srcObject = stream;
await videoElement.play();
```

### `BlurBackground` の使い方

`BlurBackground` のインスタンスを作成します。

```ts
import { BlurBackground } from 'skyway-video-processors';
blurBackground = new BlurBackground();
```

インスタンスの初期化を行います。

```ts
await blurBackground.initialize();
```

`createProcessedStream`によって、デバイスからの映像に対して背景ぼかし処理を行った映像の `ProcessedStream` を取得できます。
`ProcessedStream` の `track` を用いて、背景ぼかし処理を行った映像の `MediaStream` を作成できます。

```ts
const result = await blurBackground.createProcessedStream();
const stream = new MediaStream([result.track]);
```

作成した `ProcessedStream` を `videoElement` の `srcObject` に割り当てることで映像を再生できます。

```ts
videoElement.srcObject = stream;
await videoElement.play();
```

## JavaScript SDKとの連携方法

バーチャル背景による加工を行った映像を SkyWay で送信する映像として利用することができます。

`VirtualBackground` 、 もしくは `BlurBackground` の初期化を行い、そのインスタンスを JavaScript SDK に引数として渡します。

```ts
const backgroundProcessor = new BlurBackground();
await backgroundProcessor.initialize();

const video = await SkyWayStreamFactory.createCustomVideoStream(backgroundProcessor, {
    stopTrackWhenDisabled: true,
});

const me = await room.join();
await me.publish(video);
```

## API

以下の API を提供しています。

### class `VirtualBackground`

#### constructor

```ts
new VirtualBackground({image: (string | HTMLImageElement)}): VirtualBackground
```

背景差し替え処理に使用する画像をファイルパス、もしくは `HTMLImageElement` の形式で設定します。

なお、外部のURLを指定する場合は、CORSの制約によって外部から画像を読み込むことができない場合があります。そのため、以下いずれかの対応策を取る必要があります。

- `Access-Control-Allow-Origin` ヘッダーの設定により、画像の読み込み元のオリジンからのアクセスが許可されている画像を使用する。
- 同一のオリジンから使用したい画像を読み込む。

#### Methods

##### `initialize`

`VirtualBackground` のインスタンスの初期化を行います。

```ts
virtualBackground.initialize(): Promise<void>
```

##### `createProcessedStream`

カメラから取得した映像に対して、背景差し替え処理を行った映像である `ProcessedStream` を取得します。

```ts
createProcessedStream(): Promise<ProcessedStream>
```

```ts
createProcessedStream(options: {
    stopTrackWhenDisabled?: boolean,
    onUpdateTrack?: (track: MediaStreamTrack) => Promise<void>,
    constraints?: MediaTrackConstraints
}): Promise<ProcessedStream>
```

options を指定する場合、以下のプロパティを指定します。

-   `stopTrackWhenDisabled?: boolean`
    -   `ProcessedStream.setEnabled(false)` の実行時に track を停止するかを示すオプション
-   `onUpdateTrack?: (track: MediaStreamTrack) => Promise<void>`
    -   `ProcessedStream.setEnabled(true)` の際にデバイスから再取得した `MediaStreamTrack` に行う操作
- `constraints: MediaTrackConstraints`
    - 一例として、以下のような値を指定できます。
        -   `height: number | ConstrainULongRange`
        -   `width: number | ConstrainULongRange`
        -   `deviceId: ConstrainDOMString`
    - 詳細は https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints を参照してください。

以下のようにして options を指定できます。

```ts
const constraints = {
    height: {ideal: 480},
    width: {ideal: 640},
    deviceId: 'default',
};
const result = await virtualBackground.createProcessedStream({
    stopTrackWhenDisabled: true,
    onUpdateTrack: async (track) => {
        const stream = new MediaStream([track]);
        videoElement.srcObject = stream;
    },
    constraints
});
```

##### `dispose`

映像の取得を停止します。

```ts
dispose(): Promise<void>
```

`dispose` 実行後に背景差し替え処理を行うには、インスタンスを再度作成しなおす必要があります。

### class `BlurBackground`

#### constructor

```ts
new BlurBackground(): BlurBackground
```

```ts
new BlurBackground({blur: number}): BlurBackground
```

ぼかしの強度を 1~100 の範囲で指定できます。デフォルトでは 20 と設定されています。

#### Methods

##### `initialize`

`BlurBackground` のインスタンスの初期化を行います。

```ts
blurBackground.initialize(): Promise<void>
```


##### `createProcessedStream`

デバイスのカメラから取得した映像に対して、背景ぼかし処理が行われた映像の`ProcessedStream`を取得します。

```ts
createProcessedStream(): Promise<ProcessedStream>
```

```ts
createProcessedStream(options: {
    stopTrackWhenDisabled?: boolean,
    onUpdateTrack?: (track: MediaStreamTrack) => Promise<void>,
    constraints?: MediaTrackConstraints
}): Promise<ProcessedStream>
```

options を指定する場合、以下のプロパティを指定します。

-   `stopTrackWhenDisabled?: boolean`
    -   `ProcessedStream.setEnabled(false)` の実行時に track を停止するかを示すオプション
-   `onUpdateTrack?: (track: MediaStreamTrack) => Promise<void>`
    -   `ProcessedStream.setEnabled(true)` の際にデバイスから再取得した `MediaStreamTrack` に行う操作
- `constraints: MediaTrackConstraints`
    - 一例として、以下のような値を指定できます。
        -   `height: number | ConstrainULongRange`
        -   `width: number | ConstrainULongRange`
        -   `deviceId: ConstrainDOMString`
    - 詳細は https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints を参照してください。

以下のようにして options を指定できます。

```ts
const constraints = {
    height: {ideal: 480},
    width: {ideal: 640},
    deviceId: 'default',
};
const result = await blurBackground.createProcessedStream({
    stopTrackWhenDisabled: true,
    onUpdateTrack: async (track) => {
        const stream = new MediaStream([track]);
        videoElement.srcObject = stream;
    },
    constraints
});
```

##### `dispose`

映像の取得を停止します。

```ts
dispose(): Promise<void>
```

`dispose` 実行後に背景ぼかし処理を行うには、インスタンスを再度作成しなおす必要があります。

### class `ProcessedStream`

`createProcessedStream`の実行により取得されるクラスです。

#### properties

##### `track`

加工した映像の `MediaStreamTrack` です。

```ts
track: MediaStreamTrack | null;
```

##### `isEnabled`

映像が有効/無効になっているかの状態を示します。

```ts
isEnabled: boolean;
```

#### `methods`

##### `setEnabled`

映像の有効/無効の状態を切り替えます。

```ts
async setEnabled(enabled: boolean): Promise<void>
```

##### `dispose`

映像の取得を中止し、track を破棄します。

```ts
async dispose(): Promise<void>
```
