# graph2tikz

GUIでグラフを作成し、TikZコードへ変換するツール。

## Goal

グラフ理論の学習・研究補助を目的とする。

以下の機能を提供する。

- GUI上で頂点・辺を配置
- TikZコードの生成
- TikZコードからグラフの描画
- 透過画像の出力

## Tech Stack

### Frontend
- React
- TypeScript

### Backend
- FastAPI

## MVP

- [ ] 頂点追加
- [ ] 辺追加
- [ ] 頂点移動
- [ ] TikZ出力
- [ ] TikZ入力
- [ ] PNG出力

## Memo

- TikZは graphdrawing を使うか検討
- SVG経由でPNG化する可能性あり