# カメラから取得した映像に仮想背景を適用するサンプル

このサンプルでは、デバイスのカメラから映像を取得し、それに仮想背景を適用したものを画面に表示します。

## サンプルアプリの設定

背景差し替え処理/背景ぼかし処理のどちらを適用するかによって、インスタンスの作成を行うコードを以下を参考に置き換えてください。
このサンプルアプリにおいては、背景差し替え処理を適用する `VirtualBackground` を動かしています。

### 背景差し替え処理を適用する場合
```ts
const backgroundTransformer = new VirtualBackground({ image: 'green.png' });
```

### 背景ぼかし処理を適用する場合

```ts
const backgroundTransformer = new BlurBackground({ blur: 50 });
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
