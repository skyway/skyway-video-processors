# SkyWayを用いた通話アプリのサンプル

このサンプルでは、SkyWay JavaScript SDK を用いた通話アプリにおいて仮想背景を適用します。

SkyWay JavaScript SDK に関しては以下を参照してください。

https://skyway.ntt.com/ja/docs/user-guide/javascript-sdk/overview/

**こちらのサンプルでは、JavaScript SDKの `CustomVideoStream` クラスを利用するため、JavaScript SDK v1.6.0以上での動作を前提にしております。**

[こちら](https://console.skyway.ntt.com/login/)からアプリケーション ID とシークレットキーを取得し、`index.ts` の14, 15行目に貼り付けます。

```ts
const appId = "<ここにアプリケーション ID を入力>";
const secret = "<ここにシークレットキーを入力>";
```

このサンプルにおいては p2p Room の作成を行います。sfu Roomを利用したい場合は、`SkyWayRoom.FindOrCreate` 実行時におけるコードを以下を参考に置き換えてください。

#### p2pの場合

```ts
const room = await SkyWayRoom.FindOrCreate(context, {
    type: 'p2p',
    name: roomNameInput.value,
});
```

#### sfuの場合

```ts
const room = await SkyWayRoom.FindOrCreate(context, {
    type: 'sfu',
    name: roomNameInput.value,
});
```

## サンプルアプリの設定

背景差し替え処理/背景ぼかし処理のどちらを適用するかによって、インスタンスの作成を行うコードを以下を参考に置き換えてください。
このサンプルアプリにおいては、背景差し替え処理を適用する `VirtualBackground` を動かしています。

### 仮想背景を適用する場合
```ts
const backgroundProcessor = new VirtualBackground({ image: 'green.png' });
```

### ぼかし背景を適用する場合

```ts
const backgroundProcessor = new BlurBackground({ blur: 50 });
```

## サンプルアプリの使い方

以下のコマンドでビルドを行います。

```
npm run build
```

以下のコマンドでローカルサーバーを起動し、ブラウザで [http://localhost:8080](http://localhost:8080) にアクセスしてアプリを確認します。

```
npm run serve
```
