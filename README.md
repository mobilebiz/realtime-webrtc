# チャッピートレーニング (Chappy Training)

OpenAI Realtime API (WebRTC) を使用したリアルタイム音声対話アプリケーションです。
設定の永続化、モデルの切り替え、トークンコストの概算（日本円換算）、およびAIによる自動切断機能などを備えています。

## 機能概要

- **リアルタイム音声対話**: OpenAI Realtime API (WebRTC) を利用した低遅延な音声会話。
- **設定カスタマイズ**:
    - AIのシステムインストラクション（振る舞い）の変更
    - モデル選択 (`gpt-realtime-2025-08-28` 等)
    - 音声 (Voice) の選択
    - 設定のサーバーサイド永続化 (`settings.json`)
- **コスト概算表示**:
    - 通話終了時に、消費されたトークン数と概算費用を表示。
    - **日本円換算**: 最新の為替レートを取得して日本円での概算も表示。
- **AIによる自動切断**:
    - 「さようなら」「通話を終了して」等の発言で、AIが会話を終了し、自動的に通話を切断します。
    - **マイク早期無効化**: 切断プロセス開始時にマイクを無効化し、スムーズな終了を実現。
    - **無音検知 (VAD)**: AIの発話が完全に終わったことを検知してから切断します。

## 必要要件

- Node.js (v18以上推奨)
- OpenAI API Key (Realtime APIへのアクセス権限が必要)
- (オプション) ExchangeRate API Key (日本円換算用)

## セットアップ手順

### 1. リポジトリのクローンと依存関係のインストール

```bash
git clone <repository-url>
cd realtime-webrtc
npm install
```

### 2. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、必要なAPIキーを設定します。
`.env.sample` をコピーして使用できます。

```bash
cp .env.sample .env
```

`.env` ファイルを編集します:

```env
# [必須] OpenAI API Key
# https://platform.openai.com/api-keys から取得してください。
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx

# [オプション] Exchange Rate API Key (日本円換算用)
# https://exchangerate.host/ (または coinlayer 等、使用しているAPIの公式サイト) から取得。
# 無料プラン等のAccess Keyを入力してください。
# 設定しない場合、1ドル=150円の固定レートで計算されます。
EXCHANGE_RATE_API_KEY=your-exchange-rate-api-key
```

#### Exchange Rate API Key の取得方法
1. [exchangerate.host](https://exchangerate.host/) (または `api.exchangerate.host` を提供しているプロバイダ) にアクセスします。
2. アカウントを作成（Sign Up）します。
3. Dashboard から API Access Key を取得します。

### 3. アプリケーションの起動

```bash
npm start
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスします。

## 使い方

1. **設定**: 画面右上の歯車アイコンをクリックして設定モーダルを開きます。
    - **システムインストラクション**: AIのキャラクターや振る舞いを設定します。
    - **モデル**: 使用するOpenAIモデルを選択します。
    - **音声**: AIのプリセット音声を選択します。
    - **保存**: 設定を保存します（次回起動時にも引き継がれます）。
2. **通話開始**: 画面下部の大きな通話ボタンをクリックして会話を開始します。
3. **会話**: マイクに向かって話しかけてください。AIが応答します。
4. **通話終了**:
    - 通話ボタンを再度クリックして手動で終了。
    - または、AIに「さようなら」と話しかけて自動で終了。

## 外部公開とテスト (ngrok)

スマートフォンや他のデバイスからローカル環境のアプリをテストするには、`ngrok` を使用するのが便利です。

1. **ngrok のインストール**:
   [ngrok公式サイト](https://ngrok.com/) からサインアップし、インストール手順に従ってください。

2. **ローカルサーバーの公開**:
   新しいターミナルを開き、以下のコマンドを実行します。

   ```bash
   ngrok http 3000
   ```

3. **アクセスの確認**:
   ngrok が生成した `Forwarding` URL (例: `https://xxxx-xxxx.ngrok-free.app`) をスマートフォンなどのブラウザで開きます。

   > **注意**: 初回アクセス時にngrokの警告画面が表示される場合があります。"Visit Site" をクリックして進んでください。また、マイクの使用許可を求められた場合は許可してください。

## ライセンス

MIT License
