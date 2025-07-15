# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 開発コマンド

このプロジェクトは多機能AI対応Chrome拡張機能のため、従来のnpmビルドコマンドはありません。

### テスト実行コマンド
```bash
npm test              # 通常のユニットテスト実行（112テストケース）
npm run test:watch    # ウォッチモードでテスト実行
npm run test:coverage # カバレッジ付きテスト実行
```

### ビルドコマンド
```bash
npm run build              # テスト実行後にChrome拡張機能をビルド
npm run build:extension    # Chrome拡張機能のZIPパッケージを作成
```

### 拡張機能のテスト方法
1. Chromeで `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」でプロジェクトフォルダを選択
4. 変更後は「更新」ボタンをクリック

### ファイル監視とリロード
- 開発中は、ファイル変更後にChrome拡張機能ページで「更新」が必要
- DevToolsでサイドパネルのデバッグが可能
- Content Scriptの変更時は対象ページの再読み込みも必要
- 外部ライブラリ（marked.min.js、dompurify.min.js）はscriptsフォルダに配置済み

## アーキテクチャ

### ファイル構成
```
gemini-plugin/
├── manifest.json             # Chrome拡張機能の設定ファイル（Manifest V3）
├── background.js             # サービスワーカー（サイドパネル制御）
├── sidepanel.html            # サイドパネルのメインHTML（タブ式設定+チャット画面）
├── styles/
│   └── sidepanel.css         # マルチAI設定画面とモダンチャットUIのスタイル
├── scripts/
│   ├── content.js            # Content Script（ページ内容読み取り）
│   ├── crypto-utils.js       # JWT生成とOAuth認証（Vertex AI用）
│   ├── marked.min.js         # Markdownパーサー（marked.js v16.0.0）
│   ├── dompurify.min.js      # HTMLサニタイザー（DOMPurify）
│   ├── openai-compatible.js  # OpenAI Compatible API統合（7プロバイダー対応）
│   ├── chatgpt-api.js        # ChatGPT API統合
│   ├── aws-bedrock.js        # AWS Bedrock API統合（AWS Signature V4認証）
│   ├── azure-openai.js       # Azure OpenAI API統合
│   ├── i18n.js               # 国際化システム（日本語・英語）
│   ├── security-manager.js   # AES-GCM暗号化による機密情報保護
│   ├── build.js              # Chrome拡張機能ビルドスクリプト
│   └── sidepanel.js          # マルチAI統合とUI制御（AIAssistantクラス）
├── tests/
│   ├── setup.js              # テスト環境設定
│   └── unit/                 # ユニットテストファイル
│       ├── ai-assistant.test.js      # AIAssistantクラステスト
│       ├── api-integrations.test.js  # API統合テスト
│       ├── i18n.test.js              # 国際化テスト
│       ├── integration.test.js       # 統合テスト
│       ├── source-code-validation.test.js  # ソースコード検証テスト
│       └── utility-functions.test.js       # ユーティリティ関数テスト
└── icons/                    # 拡張機能用アイコン（16/32/48/128px）
```

### 主要コンポーネント

#### 1. Manifest V3設定 (manifest.json)
- マルチAI対応権限: sidePanel, storage, activeTab, tabs, scripting
- 複数API用host_permissions: googleapis.com, openai.com, openai.azure.com, amazonaws.com
- Content Script自動注入設定

#### 2. マルチAIサイドパネル機能
- **HTML (sidepanel.html)**: 
  - タブ式API設定画面（Vertex AI, OpenAI Compatible, ChatGPT, AWS Bedrock, 全体設定）
  - モダンチャット画面（吹き出し風メッセージ、アニメーション）
  - ページ内容統合チェックボックス
  - 国際化対応（日本語・英語）
- **CSS (styles/sidepanel.css)**: タブナビゲーション、チャットUI、アニメーション
- **JavaScript (scripts/sidepanel.js)**: AIAssistantクラスによるマルチAI統合管理

#### 3. AI API統合モジュール
- **Vertex AI (scripts/sidepanel.js内GeminiAPIクラス)**: JWT認証、複数モデル対応
- **OpenAI Compatible (scripts/openai-compatible.js)**: 7プロバイダー対応統合API
- **ChatGPT (scripts/chatgpt-api.js)**: OpenAI API、Organization対応
- **AWS Bedrock (scripts/aws-bedrock.js)**: AWS Signature V4認証、13モデル対応
- **国際化システム (scripts/i18n.js)**: 日本語・英語対応の多言語システム
- **セキュリティ管理 (scripts/security-manager.js)**: AES-GCM暗号化による機密情報保護

#### 4. ページ内容読み取り機能
- **Content Script (scripts/content.js)**: ページテキスト抽出、選択テキスト取得
- **動的注入**: 必要時にContent Scriptを自動注入
- **統合チェックボックス**: メッセージ送信時に自動でページ情報を追加

#### 5. バックグラウンドスクリプト (background.js)
- 拡張機能アイコンクリック時のサイドパネル表示制御
- サイドパネルの初期化処理

### 設計パターン

#### AIAssistantクラス（scripts/sidepanel.js）
- **マルチAI管理**: 4つのAI API（Vertex AI, OpenAI Compatible, ChatGPT, AWS Bedrock）の統合管理
- **設定管理**: Chrome Storage APIによる複数API設定とUI設定の永続化
- **タブ制御**: 5つのタブ（Vertex AI, OpenAI Compatible, ChatGPT, AWS Bedrock, 全体設定）の切り替え
- **プロバイダー切り替え**: デフォルトAIプロバイダーの選択と動的切り替え
- **UI管理**: モダンチャットUI、ローディング状態、エラーハンドリング、国際化対応
- **ページ統合**: チェックボックスによるページ内容自動追加機能

#### マルチAI API統合
**Vertex AI統合**:
- **認証**: Service Account JWT → OAuth 2.0 アクセストークン
- **エンドポイント**: `{location}-aiplatform.googleapis.com`
- **対応モデル**: gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash-002等
- **設定項目**: Service Account JSON, Location, モデル選択

**OpenAI Compatible統合**:
- **プリセット対応**: OpenAI, Azure OpenAI, Anthropic, Groq, DeepSeek, Ollama, Custom
- **統一インターフェース**: 全プロバイダー共通のAPI統合
- **動的UI**: プリセット選択による自動設定とUI変更
- **設定項目**: プリセット選択, エンドポイント, APIキー, モデル選択, Azure用設定

**ChatGPT API統合**:
- **認証**: Bearer Token認証
- **エンドポイント**: api.openai.com
- **対応モデル**: GPT-4o, GPT-4o mini, GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **設定項目**: APIキー, モデル選択, Organization ID（オプション）

**AWS Bedrock統合**:
- **認証**: AWS Signature Version 4認証
- **エンドポイント**: `bedrock-runtime.{region}.amazonaws.com`
- **対応モデル**: Claude 3.5 Sonnet, Claude 3 Haiku/Sonnet/Opus, Titan, Command R, Llama 3.2等
- **設定項目**: Access Key ID, Secret Access Key, Session Token, Region, モデル選択

#### ページ内容統合機能
- **Content Script**: 全URLに自動注入、ページテキストと選択テキストを抽出
- **動的注入**: Content Script未注入時の自動注入とリトライ機能
- **統合方式**: チェックボックス選択によるメッセージ後ろへの自動追加
- **データ形式**: タイトル、URL、見出し、メインテキスト（最大8000文字）、選択テキスト

#### モダンチャットUI
- **吹き出しデザイン**: ユーザーメッセージ（右、青）、AIメッセージ（左、白）
- **アニメーション**: メッセージ表示時のスライドインエフェクト
- **Markdownサポート**: marked.js v16.0.0を使用、GFM（GitHub Flavored Markdown）完全対応
- **リサイズ機能**: ドラッグによる入力エリア高さ調整
- **タイムスタンプ**: 各メッセージに時刻表示
- **AI識別表示**: 応答したAI名を時刻部分にアイコン付きで表示
- **国際化対応**: 日本語・英語の完全対応、言語切り替え機能
- **スクロール機能**: 長い会話の滑らかなスクロール対応、カスタムスクロールバー
- **フォントサイズ調整**: 8pt-24ptまで選択可能、デフォルト12pt
- **統一フォント**: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif

#### カスタムインストラクション機能
- **システムプロンプト統一**: 全てのAI APIに適用される共通の指示
- **API別最適化**: 各APIの形式に応じた適切な適用方法
  - OpenAI Compatible & ChatGPT: systemメッセージとして適用
  - AWS Bedrock: systemメッセージとして適用
  - Vertex AI: メッセージ前にプロンプトを追加
- **設定保存**: カスタムインストラクションの永続化
- **柔軟な設定**: 空欄時はデフォルト動作、設定時は全APIに適用

#### セキュリティ管理システム (scripts/security-manager.js)
- **AES-GCM暗号化**: 全てのAPI認証情報を暗号化して保存
- **Web Crypto API**: ブラウザ標準の暗号化API使用
- **入力検証**: API認証情報の入力値検証と整合性チェック
- **セキュアマイグレーション**: 平文から暗号化への自動移行機能
- **アクセス制御**: Chrome拡張機能の適切な権限管理

#### 国際化システム (scripts/i18n.js)
- **多言語対応**: 日本語・英語の完全対応
- **動的言語切り替え**: 設定画面での言語切り替え
- **自動言語検出**: ブラウザ言語設定の自動検出
- **テキスト置換**: data-i18n属性による自動テキスト置換
- **プレースホルダー対応**: 入力フィールドのプレースホルダー国際化

### 開発時の注意点

#### Chrome拡張機能特有の制約
- Content Security Policy (CSP) の制限
- サイドパネルAPIはChrome 114以降で利用可能
- インラインスクリプトは禁止（外部ファイル必須）

#### デバッグ方法
- サイドパネル: 右クリック → 「検証」でDevTools起動
- バックグラウンド: chrome://extensions/ → 「service worker」リンク
- エラーログ: chrome://extensions/ でエラー確認

### マルチAPI設定について

#### Vertex AI API設定手順
1. Google Cloud Consoleでプロジェクトを作成
2. Vertex AI APIを有効化
3. Service Accountを作成し、Vertex AI Userロールを付与
4. Service AccountのJSONキーをダウンロード
5. 拡張機能のVertex AIタブでJSONファイル、Location、モデルを設定

#### OpenAI Compatible API設定手順
**OpenAI**:
1. OpenAI Platform (platform.openai.com) でAPIキーを取得
2. プリセットで「OpenAI」を選択（エンドポイント自動設定）
3. APIキーとモデルを設定

**Azure OpenAI**:
1. Azure OpenAI Serviceリソースを作成
2. APIキーとエンドポイントを取得
3. モデルをデプロイ（例：gpt-4）
4. プリセットで「Azure OpenAI」を選択
5. エンドポイント、APIキー、APIバージョン、デプロイメント名を設定

**その他プロバイダー**:
- **Anthropic**: Claude APIキーを使用
- **Groq**: Groq APIキーを使用
- **DeepSeek**: DeepSeek APIキーを使用
- **Ollama**: ローカルサーバー（localhost:11434）を使用
- **Custom**: 任意のOpenAI Compatible APIを使用

#### ChatGPT API設定手順
1. OpenAI Platform (platform.openai.com) でAPIキーを取得
2. 拡張機能のChatGPTタブでAPIキー、モデルを設定
3. Organization利用時はOrganization IDも設定

#### AWS Bedrock API設定手順
1. AWS Bedrock Serviceを有効化
2. IAMユーザーまたはロールを作成し、Bedrock権限を付与
3. Access Key IDとSecret Access Keyを取得
4. 拡張機能のAWS Bedrockタブで認証情報、Region、モデルを設定
5. Session Token使用時（STS）は該当フィールドに入力

#### 全体設定
- **デフォルトプロバイダー**: チャット時に使用するAIを選択
- **カスタムインストラクション**: 全てのAI APIに適用される共通システムプロンプト
- **言語設定**: 日本語・英語の選択
- **UI設定**: フォントサイズ、キーボード操作、ページ統合オプション

#### セキュリティ注意事項
- 各API認証情報はSecurityManagerによりAES-GCM暗号化で保存される
- Service Accountには必要最小限の権限のみ付与を推奨
- AWS IAMユーザーにはBedrock使用に必要な最小権限のみ付与
- APIキーは定期的にローテーションを検討
- API使用量とコストを定期的に確認
- 平文保存データからの自動暗号化マイグレーション対応

### 開発時のベストプラクティス

#### セキュリティ
- Service Account秘密鍵は機密情報として扱い、コミットしない
- APIキーやトークンを含むファイルは .gitignore に追加
- 最小権限の原則に従い、Service Accountの権限を制限

#### ファイル変更後の確認事項
1. Chrome拡張機能ページで「更新」ボタンをクリック
2. DevToolsのConsoleでエラーの確認
3. サイドパネルの動作確認
4. 設定の保存・読み込み確認

#### トラブルシューティング
- **サイドパネルが表示されない**: Chrome 114以降のバージョン確認
- **API呼び出しエラー**: DevToolsのNetworkタブでリクエスト確認
- **認証エラー**: Service Account権限とJSON形式の確認
- **CSPエラー**: manifest.jsonの権限設定とインラインスクリプト除去

### 機能一覧

#### 実装済み機能
1. **マルチAI統合**: Vertex AI、OpenAI Compatible、ChatGPT、AWS Bedrock APIの完全統合
2. **タブ式設定画面**: 5つのタブによる整理された設定インターフェース
3. **OpenAI Compatible統合**: 7つのプロバイダーを統一インターフェースで管理
4. **モデル選択**: 各APIで複数モデルから選択可能
5. **モダンチャットUI**: 吹き出し風デザイン、アニメーション、Markdownサポート
6. **国際化対応**: 日本語・英語の完全対応、動的言語切り替え
7. **ページ内容統合**: チェックボックスによる自動ページ情報追加
8. **Content Script**: 動的注入によるページテキスト抽出
9. **設定永続化**: Chrome StorageによるAPI設定とUI設定の保存
10. **リサイズ機能**: ドラッグによる入力エリア高さ調整
11. **エラーハンドリング**: 各APIの適切なエラー処理とユーザーフィードバック
12. **AWS Signature V4認証**: Bedrock API用の完全な認証実装
13. **カスタムインストラクション**: 全AI APIに適用される共通システムプロンプト機能
14. **AI識別表示**: チャットメッセージに応答したAI名を表示
15. **セキュリティ管理**: AES-GCM暗号化によるAPI認証情報の安全な保存
16. **スクロール機能**: 長い会話の滑らかなスクロール対応
17. **フォントサイズ調整**: 8pt-24ptまで選択可能、デフォルト12pt
18. **CI/CDパイプライン**: GitHub Actionsによる自動テスト・ビルド・デプロイ

#### 対応モデル
**Vertex AI**: gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash-002等
**OpenAI Compatible**: 
- OpenAI: GPT-4o, GPT-4, GPT-3.5-turbo
- Azure OpenAI: カスタムデプロイメント対応
- Anthropic: Claude 3.5 Sonnet, Claude 3 Haiku/Sonnet/Opus
- Groq: Llama 3.1, Mixtral, Gemma
- DeepSeek: DeepSeek Chat, DeepSeek Coder
- Ollama: ローカルLLM対応
- Custom: 任意のOpenAI Compatible API
**ChatGPT**: GPT-4o, GPT-4o mini, GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
**AWS Bedrock**: Claude 3.5 Sonnet v2/v1, Claude 3 Haiku/Sonnet/Opus, Titan Text, Command R+/R, Llama 3.2シリーズ

## テストシステム

### 実装済みテスト体系
1. **包括的ユニットテスト**: 112個のテストケース（100%パス率）
2. **API統合テスト**: 全AI プロバイダーの統合テスト
3. **国際化テスト**: 日本語・英語対応の完全テスト
4. **ソースコード検証テスト**: セキュリティ・品質検証
5. **統合テスト**: エンドツーエンドのワークフローテスト
6. **ユーティリティ関数テスト**: 各種ヘルパー関数のテスト
7. **セキュリティテスト**: 暗号化機能とSecurityManagerのテスト

### テスト実行環境
- **フレームワーク**: Jest (jsdom環境)
- **モック**: jest-chrome, Chrome API完全モック
- **カバレッジ**: 全主要機能をカバー
- **CI/CD対応**: npm scriptsによる自動テスト実行

### テストファイル構成
```
tests/
├── setup.js                 # テスト環境共通設定
└── unit/
    ├── ai-assistant.test.js         # AIAssistantクラス機能テスト
    ├── api-integrations.test.js     # 各AI API統合テスト
    ├── i18n.test.js                 # 国際化システムテスト
    ├── integration.test.js          # エンドツーエンド統合テスト
    ├── source-code-validation.test.js  # コード品質・セキュリティ検証
    └── utility-functions.test.js        # ユーティリティ関数テスト
```

### 品質保証体制
- **全機能カバレッジ**: 主要機能の動作保証
- **エラーハンドリング**: 例外処理の包括的テスト
- **セキュリティ検証**: 機密情報漏洩防止チェック
- **パフォーマンステスト**: メモリ管理・API制限対応
- **ブラウザ互換性**: Chrome拡張機能特有制約への対応

### CI/CDパイプライン実装済み
1. **GitHub Actions**: 自動テスト・ビルド・デプロイ
2. **品質ゲート**: 全テストパス必須
3. **セキュリティスキャン**: APIキー漏洩検知
4. **アーティファクト管理**: 90日間保存
5. **リリース自動化**: Chrome拡張機能パッケージ作成

### 今後の開発タスク
1. **UIの改善**:
   - ダークモード対応
   - レスポンシブデザインの改善

2. **機能拡張**:
   - メッセージ履歴の永続化
   - チャット履歴のエクスポート機能（JSON、Markdown）
   - ファイルアップロード機能（画像、文書）
   - ストリーミングレスポンス対応
   - 追加言語対応（中国語、韓国語など）

3. **パフォーマンス最適化**:
   - Content Scriptの軽量化
   - キャッシュ機能の実装
   - バックグラウンド処理の最適化

4. **OpenAI Compatible拡張**:
   - 追加プロバイダーの対応
   - カスタムヘッダー設定
   - 高度な認証方式サポート

5. **テスト体系の拡張**:
   - E2Eテストの実装
   - パフォーマンステストの追加
   - セキュリティテストの強化
