# RIONIX 紙芝居動画メーカー v0.2

画像3枚＋音声1本から、15〜30秒・16:9のMP4を端末内で録画する実験版。
**v0.1はユーザーのAndroid実機で15秒の生成・保存後再生、30秒の高画質出力の成功報告あり。v0.2の演出付き出力は実機確認待ちです。**

公開URL: https://everhal7-rgb.github.io/rionix-slideshow-maker/

ソース: https://github.com/everhal7-rgb/rionix-slideshow-maker

## v0.2 の演出

- 切り替え: 0.8秒フェード / 0.4秒フェード / カット。
- 各画像の動き: ゆっくり寄る / ゆっくり引く / 動かさない（最大1.08倍）。
- 初期設定は0.8秒フェード・各画像はゆっくり寄る。
- フェードは前の画像の最後に次の画像を重ねる。5秒×3枚なら合計15秒のまま。1秒の短い画像はフェードを最大0.5秒に抑える。
- ズームは画像の中央が基準。元の黒余白を維持し、画像の端を少しクロップする。
- プレビューとMP4は同じ描画関数を使う。フェード用Canvasは1枚のみ再利用し、処理後に解放する。
- 元の動きに戻す場合は「カット」＋各画像「動かさない」。旧版ソースは `stable-v0.1` ブランチに保存。
- `tools/render.py` はv0.1のカット専用代替。v0.2のフェード・ズームは未対応。

## スマホで使う

1. HTTPSで公開した `index.html` をAndroid Chromeで開く。
2. JPEG / PNGを3枚まとめて選び、MP3を1本選ぶ。
3. 「前へ」「後へ」で並べ替え、各画像の秒数を設定する（合計15〜30秒）。
4. 音付きプレビューで確認する。
5. 720pから試し「MP4を生成する」。動画の長さと同じくらい待つ。
6. 出力動画を再生し、音ズレ・画像の順序・最後まで再生できることを確認する。
7. 「MP4を保存」から保存。Chromeのダウンロードで開く。端末によっては「共有して保存」も利用できる。

音声は先頭から。長い音声は動画末尾で切り、短い音声は残りを無音にする。画像は全体表示・黒余白。生成中の音声はスピーカーには流さない。設定・素材は再読み込みで消える。

## 無料でGitHub Pagesへ公開

新規の公開リポジトリ名案: `rionix-slideshow-maker`。既存リポジトリは変更しない。

- このフォルダーの内容を新規リポジトリのmainブランチへ追加する。
- Settings → Pages → Deploy from a branch → main → /(root) → Save。
- GitHubが表示した公開URLを開く（この資料に未確認URLは記載しない）。
- 実行にビルドサーバー、外部API、CDN、有料契約、カメラ・マイク権限は不要。
- 公開するのはプログラムだけ。ユーザーが選んだ素材はGitHubにも送らない。
- GitHub Freeでは公開リポジトリのPagesを使う。非公開リポジトリの料金条件は別途確認する。

`index.html` は生成済みの単体ファイル。ソースを変更したら `npm run build` で再生成。

```sh
npm run build
npm test
python3 -m http.server 8000
```

PCではlocalhostで検証可能。AndroidからPCのHTTP LANアドレスへ開くだけではsecure contextにならず、MP4生成を拒否する。スマホはGitHub PagesのHTTPSを使う。

## 構成と採用技術

| 技術 | 判断 |
| --- | --- |
| Canvas | 画像の全体表示・黒余白・切り替えを描画。単独でMP4を作る機能ではない |
| Web Audio + MediaRecorder | 採用。音声の再生とCanvas映像をH.264＋AAC指定でMP4録画。ネイティブ対応を利用 |
| WebCodecs | フレーム単位の時刻指定に適するが、AAC対応は端末依存。別途MP4 muxerが必要。v0.2候補 |
| ffmpeg.wasm | v0.1は不採用。WASMエンジンと仮想FS、入力・出力などに追加メモリが必要。スマホ実測は未実施 |

MediaRecorder.isTypeSupportedでH.264/AAC対応を判定し、実際のエンコーダー開始失敗も捕捉。生成データの先頭1MBでMP4 ftyp / avc1 / mp4aを確認する簡易検査あり。これは完全なコンテナ検証・全フレームの再生保証ではない。対応申告だけで成功保証をしない。非対応時はWebMをMP4に改名せず生成を無効化する。

SharedArrayBuffer / cross-origin isolation / COOP / COEPはこの構成では不要。したがって通常のGitHub Pages静的配信で実装できる。ffmpeg.wasmのマルチスレッド版はSharedArrayBufferと分離設定が必要。GitHub Pagesで任意レスポンスヘッダーを設定する構成を前提にしない。単一スレッド版は別候補だが、負荷問題は残る。

公式ffmpeg.wasmベンチマーク（PC・旧バージョン）ではネイティブ5.2秒に対して単一スレッド128.8秒、マルチスレッド60.4秒。これは本アプリやAndroidの測定値ではない。端末でのピークメモリや処理時間を推定値で断定しない。

## 負荷・同期・制限

- 720p標準、1080p選択可。30fps目標・実時間録画であり厳密なフレーム数は保証しない。
- 画像は1枚15MB、読込後に長辺1920pxまで縮小して原本ビットマップを解放。順次デコード。巨大画像のデコード時ピークは残る。
- 音声40MB以下。全曲をPCMとして一括デコードせず、Audio要素から再生する。
- 出力80MB超で中止。素材変更時に古いオブジェクトURLと出力を解放。
- 画面ロック・バックグラウンド化を検出すると中止。Wake Lockは利用できる場合のみ。
- 音声クロックを基準に画像を描画。音声との乖離250ms超、描画間隔350ms超では成功扱いせず中止。
- 音声再生開始に250ms超かかった場合も失敗扱い。リアルタイム録画の開始・末尾には端末依存の小さな誤差が残る。
- エンコード時の黙示的なフレーム落ち・発熱・ファイル管理アプリ互換性は実機テストが必要。
- MediaRecorder出力はfragmented MP4になり得る。外部プレーヤーで長さやシークに問題がある場合はFFmpegで再多重化する: `ffmpeg -i input.mp4 -c copy -movflags +faststart output.mp4`
- 中止後も素材と設定は保持。ページを閉じると失われる。

## ソース分離

- `src/assets.js`: 素材の読込・縮小・解放
- `src/timeline.js`: 秒数・順序・カット選択・描画
- `src/renderer.js`: 音声クロック・録画・中止・リソース解放
- `src/app.js`: 日本語UI状態・イベント
- `tools/template.html`, `src/style.css`: UI
- `tools/build.mjs`: 外部依存なしの単体HTML生成
- `tools/render.py`: ネイティブFFmpegでの無料代替

## 無料の代替手段

ブラウザー側のH.264/AACエンコーダーが使えない場合は無理にWASMへ自動切り替えしない。

追加契約なしで最も安定した候補は、手元のPCのPython 3 + FFmpegで付属スクリプトを実行する方式。スマホだけで完結する条件は満たさないが、追加サーバー費用・API費用は0円。

```sh
python3 tools/render.py --images 1.jpg 2.png 3.jpg --seconds 5 5 5 --audio music.mp3 --height 720 --output movie.mp4
```

スマホ操作を維持したい場合、次段階で手元PCのローカルレンダリングサーバーを作る方法がある（PCを起動する必要あり・今回は未実装）。外部の無料クラウド実行環境は利用枠・登録・素材送信が発生するので、利用前に確認する。常時無料の外部サーバーを保証しない。

## 次の優先事項

1. Android実機で720p/15秒成功 → 30秒 → 1080pの順に検証。
2. 生成MP4の開始時刻・長さ・カット時刻・音声同期をffprobe等で記録。
3. 必要ならWebCodecs＋MP4 muxerによる時刻指定出力へ移行。
4. プロジェクトの保存復元、その後字幕・フェードを追加。

## 技術資料（2026-10-25確認）

- Chromium muxerの対応形式: https://chromium.googlesource.com/chromium/src/media/+/HEAD/muxers/README.md
- WebCodecs: https://developer.chrome.com/docs/web-platform/best-practices/webcodecs
- ffmpeg.wasm性能: https://ffmpegwasm.netlify.app/docs/performance/
- ffmpeg.wasm FAQ: https://ffmpegwasm.netlify.app/docs/faq/
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
