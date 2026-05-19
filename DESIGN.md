# SwipeWords 詳細設計書

## 1. システム概要

| 項目 | 内容 |
|------|------|
| アプリ名 | SwipeWords |
| 種別 | PWA (Progressive Web App) |
| 構成 | 単一HTMLファイル (`SwipeWords.html`) |
| フレームワーク | React 18 + Babel Standalone (CDN) |
| 永続化 | IndexedDB |
| オフライン対応 | Service Worker キャッシュ |

---

## 2. ファイル構成

```
SwipeWords.html     メインアプリ（HTML/CSS/JS 一体）
sw.js               Service Worker（キャッシュ制御・更新通知）
manifest.json       PWA マニフェスト
icon.svg            アプリアイコン
vocab_sample.csv    サンプル単語帳
words/              単語帳CSVフォルダ
sound/              効果音フォルダ
```

---

## 3. アプリモード遷移

```
[title]
  ↓ onStart(count)
[playing]
  ↓ onSessionEnd
    ├─ wrongs = 0  →  [result]
    └─ wrongs > 0  →  [memory] → [confirm] → ...
                                   ├─ 全バッチ完了 → [result]
                                   └─ 次バッチ     → [memory]
[result]
  ├─ もう一度     → [playing]（同じ単語帳・問題数）
  └─ タイトルへ  → [title]
```

---

## 4. Reactコンポーネント構成

### 4.1 `App`（ルート）
**役割：** モード管理、単語帳管理、設定、SW更新通知

| state | 型 | 説明 |
|-------|----|------|
| `appMode` | string | `title` / `playing` / `memory` / `confirm` / `result` |
| `sessionStats` | object\|null | セッション終了時の集計結果 |
| `batches` | array[][] | 誤答バッチ一覧（10問単位） |
| `batchIdx` | number | 現在のバッチ番号 |
| `vocabData` | array | ロード済みCSVデータ |
| `csvFileName` | string\|null | 現在の単語帳ファイル名 |
| `timer` | boolean | タイマーON/OFF |
| `numQ` | number | 出題数（デフォルト50） |
| `variantId` | string | UIスタイル選択 |
| `tweaksOpen` | boolean | 設定パネル開閉 |
| `swUpdate` | boolean | SW更新通知フラグ |

**主要コールバック：**
- `handleTitleStart(count)` → playing モードへ
- `handleSessionEnd({wrongs, total, correct, wrong, skip, bestCombo, elapsedSec, sessionStartMs})` → memory or result へ
- `handleMemoryDone()` → confirm モードへ
- `handleConfirmPass()` → 次バッチ or result へ
- `handleConfirmFail(q)` → 現バッチ末尾にqを追加し再memory
- `handleRetry()` → 同一設定で playing 再スタート
- `handleRestart()` → title へ
- `checkSwUpdate()` → `registration.update()` 呼び出し

---

### 4.2 `TitleMode`
**役割：** タイトル画面。単語帳表示・切り替え・出題開始

**props：** `vocabData, csvFileName, onStart, onCsvSwitch, variant`

| state | 説明 |
|-------|------|
| `csvList` | サーバー上の単語帳ファイル一覧 |
| `loadingCsv` | CSV読み込み中フラグ |
| `wordStats` | DBから集計した問数・正解数・誤答数 |
| `swVersion` | sw.jsから取得したキャッシュバージョン文字列 |
| `previewIdx` | プレビューカードのアニメーション用インデックス |

**表示要素：**
- アプリバッジ「英単語学習アプリ」
- ロゴ「SwipeWords」
- タグライン：`○○問収録 · スワイプで4択 · コンボを稼げ`
- プレビューカード（1.4秒ごとにランダム単語を循環表示）
- 出題数ボタン一覧（`START_OPTIONS` 定数より）
- 単語帳パネル（ファイル名・問数・正解数・誤答数）

---

### 4.3 `VocabApp`
**役割：** メイン学習画面。問題表示・スワイプ入力・タイマー・コンボ管理

**config props：**

| prop | 説明 |
|------|------|
| `timer` | タイマー有無 |
| `totalQuestions` | 出題数 |
| `vocabData` | 単語帳データ |
| `csvFileName` | 単語帳ファイル名（DB記録用） |
| `onResult` | 1問回答後のコールバック |
| `onSessionEnd` | セッション終了コールバック |

**state/ref 一覧：**

| 名前 | 種別 | 説明 |
|------|------|------|
| `difficulty` | state | `easy` / `normal` / `hard` |
| `questions` | state | 出題問題リスト |
| `idx` | state | 現在の問題インデックス |
| `correct` / `wrong` | state | 表示用カウント |
| `combo` / `bestCombo` | state | コンボ数 |
| `feedback` | state | 回答フィードバック情報 |
| `retry` | state | リトライモード（`{rightDir}`） |
| `ended` | state | セッション完了フラグ |
| `timeLeft` | state | 残り時間（秒） |
| `sessionStartRef` | ref | セッション開始タイムスタンプ(ms) |
| `wrongQsRef` | ref | 誤答した問題の蓄積リスト |
| `correctCntRef` / `wrongCntRef` / `skipCntRef` | ref | 正解・誤答・タイムアウト数 |
| `bestComboRef` | ref | 最大コンボ数 |
| `historyRef` | ref | DBから取得した履歴スナップショット |
| `wordStatsRef` | ref | セッション内の問題別正誤カウント |

**タイマー設定：**

| difficulty | timerMax |
|------------|----------|
| easy | 0（無制限） |
| normal | 10秒 |
| hard | 6秒 |

**セッション終了条件：** `idx >= questions.length`

**DB書き込みタイミング：** 1問回答ごと（`handleAnswer` 内で `dbAdd`）

---

### 4.4 `SwipeCard`
**役割：** 問題カード表示・スワイプ/クリック/キーボード入力処理

**props：**

| prop | 説明 |
|------|------|
| `question` | `{word, correct, choices[4]}` |
| `onAnswer(answer, dir)` | 回答コールバック |
| `variant` | UIスタイル |
| `disabled` | 入力無効フラグ |
| `feedback` | `{correct, rightDir}` |
| `retryMode` | リトライカード表示フラグ |
| `rightDir` | リトライ時の正解方向 |
| `retryScore` | `{correct, wrong}` リトライスコア表示用 |
| `onPlaySound` / `onPlayWrong` | 効果音コールバック |

**入力方式：**
- ポインタースワイプ（閾値: 90px）
- 選択肢ボタンクリック
- キーボード矢印キー

**方向→選択肢インデックスのマッピング：**

| 方向 | インデックス |
|------|-------------|
| ↑ up | 0 |
| → right | 1 |
| ↓ down | 2 |
| ← left | 3 |

**left/right の表示：** 縦書き（`writing-mode: vertical-rl`）。全角括弧`（）`は半角`()`に変換して表示。

**動的フォントサイズ（単語文字数別）：**

| 文字数 | fontSize |
|--------|----------|
| ～6 | `clamp(24px, 6.5vw, 40px)`（CSS基本値） |
| 7～9 | `clamp(23px, 5.8vw, 32px)` |
| 10～12 | `clamp(21px, 5.2vw, 28px)` |
| 13～15 | `clamp(21px, 4.4vw, 24px)` |
| 16～ | `clamp(19px, 3.8vw, 20px)` |

---

### 4.5 `MemoryMode`
**役割：** 誤答記憶画面。誤答リストをカード形式でスクロール確認

**props：** `batch, batchNum, totalBatches, onDone, variant`

---

### 4.6 `ConfirmMode`
**役割：** 誤答確認テスト。バッチ内の問題を再出題し全問正解まで継続

**props：** `batch, batchNum, totalBatches, fallbackPool, onPass, onFail, variant`

- 正解 → `onPass()`
- 誤答 → リトライカード表示（正解方向の選択肢のみ受け付ける）
- 全問正解 → `onPass()`
- 誤答確定（リトライ失敗）→ `onFail(直前の正解語)` で、当該問題を次バッチへ送る

---

### 4.7 `ResultMode`
**役割：** セッション終了画面。結果表示・セッション記録のDB保存・累積統計表示

**props：** `sessionStats, missedWords, vocabData, csvFileName, vocabName, onRetry, onRestart, onExport, variant`

**表示項目（セッション）：**
- 正解率（%）・絵文字ラベル
- 正解数 / 誤答数 / スキップ数
- 学習時間（ResultMode マウント時に `Date.now() - sessionStartMs` で計測）
- 最大コンボ数

**表示項目（累積）：**

| ラベル | 内容 |
|--------|------|
| 総収録問数 | vocabData の `(word, correct)` ユニーク数 |
| 正解問数 | DBで最後の回答が ○ の問数 |
| 誤答問数 | DBで最後の回答が × の問数 |
| 未出題問数 | DB記録なしの問数 |
| 総学習時間 | sessions ストアの `elapsedSec` 合計 |

**DB保存処理（マウント1回のみ）：**
1. `Date.now() - sessionStartMs` で学習時間を計測
2. `dbAddSession(sessionRow)` でセッション記録を保存
3. `dbGetAllSessions()` + `dbGetAll()` で累積統計を再計算
4. `setGlobalStats(...)` で表示更新

---

### 4.8 `StatsBar`
**役割：** 学習中の進捗バー表示（問題番号・正解率・コンボ・タイマー）

---

### 4.9 `ComboBurst`
**役割：** コンボ達成時の演出表示（大きな数字アニメーション）

**コンボレベル：**

| コンボ数 | クラス | ラベル |
|----------|--------|--------|
| 1～4 | `start` | Good! |
| 5～9 | `warm` | Nice! |
| 10～19 | `hot` | Fire! |
| 20～ | `mega` | Unstoppable! |

---

## 5. データモデル

### 5.1 CSV単語帳フォーマット
```
word,correct,wrong1,wrong2,wrong3
accurate,正確な,不正確な,大まかな,曖昧な
```
- 1行目はヘッダー（自動スキップ）またはデータ行（自動判定）
- `wrongs` は0～3個（不足分は他の単語の `correct` から自動補完）

### 5.2 vocabData エントリ
```js
{
  word: string,     // 英単語
  correct: string,  // 正解の和訳
  wrongs: string[]  // 誤答候補（0～3個）
}
```

### 5.3 question オブジェクト
```js
{
  word: string,       // 英単語
  correct: string,    // 正解
  choices: string[4]  // [up, right, down, left] の選択肢（シャッフル済み）
}
```

---

## 6. IndexedDB スキーマ

**DB名：** `swipewords-db`  **バージョン：** 2

### ストア: `results`（回答記録）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| date | string | `YYYYMMDD` |
| time | string | `HH:MM:SS` |
| csvFileName | string | 単語帳ファイル名 |
| word | string | 出題単語 |
| correct | string | 正解の和訳 |
| userAnswer | string | ユーザーの解答（タイムアウト時は `(タイムアウト)`） |
| pass | string | `○` or `×` |
| elapsed | number | 回答時間（秒） |

### ストア: `sessions`（セッション記録）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| date | string | `YYYYMMDD` |
| time | string | `HH:MM:SS` |
| csvFileName | string | 単語帳ファイル名 |
| total | number | 出題数 |
| correct | number | 正解数 |
| wrong | number | 誤答数 |
| bestCombo | number | 最大コンボ数 |
| elapsedSec | number | 学習時間（秒）※開始〜終了画面表示まで |
| appVersion | string | SW キャッシュバージョン文字列 |

---

## 7. 問題生成ロジック

### 7.1 histKey
```
histKey(word, correct) → "word\x00correct"
```
同一英単語で訳が異なる場合を別エントリとして扱うキー。

### 7.2 buildHistory(rows)
`results` ストアの回答記録から、`histKey` をキーとする Map を生成。

エントリ構造：
```js
{
  lastPass: '○' | '×',
  lastTime: string,         // 最終回答時刻
  lastWrongTime: string,    // 最終誤答時刻
  correctCount: number,
  wrongCount: number,
  streak: number,           // 連続正解/誤答数
  wrongAnswers: Set<string> // 過去の誤答選択肢
}
```

### 7.3 buildWeightedQuestions(data, n, history)
出題比率：**未出題60% : 直近誤答30% : 直近正解10%**

1. 各エントリを `unseen / recentlyWrong / recentlyCorrect` に分類
2. `recentlyWrong` → 最終誤答が古い順
3. `recentlyCorrect` → 正解数-誤答数が少ない順
4. 6:3:1のインターリーブパターンで配列化
5. 不足分は未使用プールから補充

### 7.4 buildChoices(word, correct, csvWrongs, history, correctPool, sameWordCorrects)
誤答選択肢の優先順位：
1. CSV記載の誤答候補
2. DBの過去誤答（同一問題の履歴）
3. 他の単語の `correct`（ただし同一英単語の別義は除外）

### 7.5 buildConfirmQuestions(batch, fallbackPool)
確認テストの選択肢：
1. バッチ内の他の問題の `correct`（同一英単語の別義を除外）
2. 不足時は `fallbackPool` から補充

---

## 8. 効果音システム

### 8.1 コンボ効果音
| コンボ数 | ファイル |
|----------|---------|
| 1～2 | `good1.wav` / `good2.wav` |
| 3～4 | `nice1.wav` / `nice2.wav` |
| 5～9 | `fire1.wav` / `fire2.mp3` |
| 10～ | `unstoppable1～9.wav` |

各コンボ数に複数音源があり、ランダムに選択。

### 8.2 その他効果音
| 場面 | ファイル |
|------|---------|
| 誤答 | `boo01.mp3` |
| 確認テスト正解 | `ok1.mp3` |

### 8.3 サウンド設定
- `localStorage` に `swipewords-sound` キーで保存（`'0'` = OFF）
- 起動時に復元

---

## 9. UIスタイル（Variant）

| ID | 名称 | 特徴 |
|----|------|------|
| `bubble` | Bubble | パステルグラデーション・ぼかし背景 |
| `pop` | Pop | 黄色背景・ドット柄・太枠影 |
| `neo` | Neo | 黒背景・ネオングロー |
| `cool` | Cool | 紺背景・シアン発光 |
| `modern` | Modern | グリッド背景・ミニマル |
| `zen` | Zen | 和紙調・テラコッタ |
| `three_d` | 3D | 立体シャドウ |
| `ghibli` | Ghibli | 空色グラデーション |
| `art` | Art | ボーダー・赤シャドウ |
| `wafu` | 和風 | 和紙・縦ライン |

---

## 10. Service Worker

**ファイル：** `sw.js`  **現バージョン：** `swipewords-v91`

### キャッシュ戦略
- インストール時：全 ASSETS を `no-cache` で取得しキャッシュ
- フェッチ時：キャッシュ優先（`cache first`）
- 旧バージョンのキャッシュはアクティベート時に自動削除

### 更新通知フロー
```
SW登録 → reg.waiting あり → __swUpdateCallback()
         updatefound → installing.statechange=installed
           → navigator.serviceWorker.controller あり
             → __swUpdateCallback()
                → App: setSwUpdate(true)
                   → sw-update-bar 表示
                      → 「再読み込み」ボタン → location.reload()
```

### 手動更新チェック
設定パネル「🔄 更新チェック」ボタン → `registration.update()`

---

## 11. CSV読み込み

### 読み込み元の優先順位
1. ユーザーがドロップ/選択したローカルファイル
2. `words/` フォルダ内のサーバー配置CSVファイル
3. 組み込みサンプル（`VOCAB_DATA` 定数）

### サーバーCSVの一覧取得
`words/` 以下のURLをフェッチして各ファイルの存在を確認。ファイル一覧は `sw.js` の `ASSETS` 配列から推定。

### フォーマットバリデーション
- 空の `word` または `correct` フィールドはスキップ
- エラー行は `csvError` state に記録し画面表示

---

## 12. 統計カウントの仕様

### カウント単位
`(word, correct)` ペア（`histKey`）をキーとして1問とカウント。
同一英単語で訳が異なるエントリは別問としてカウント。

### 最終状態の定義
DBの `results` ストアで、同一 `histKey` の最後の回答の `pass` 値を「最終状態」とする。

| 最終状態 | カテゴリ |
|---------|---------|
| `○` | 正解問数 |
| `×` | 誤答問数 |
| 記録なし | 未出題問数 |

### 総学習時間
`sessions` ストアの当該 `csvFileName` の全 `elapsedSec` の合計（秒）。

---

## 13. データエクスポート

設定パネル「↓ CSV出力」ボタンで `results` ストアの全回答記録をCSV出力。

**出力フォーマット：**
```
日付,時刻,問題CSV,単語,正答,ユーザの解答,成否,回答時間(秒)
20260427,13:36:57,ターゲット１４００_精査後.csv,accurate,正確な,正確な,○,2.8
```

BOM付きUTF-8 (`﻿`) で出力（Excel対応）。
