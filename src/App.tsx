import React, { useState } from 'react'
import type { Vertex, Edge } from './types'

function App() {
  // ここにグラフの状態（頂点と辺）を持たせる予定です
  const [vertices, setVertices] = useState<Record<string, Vertex>>({})
  const [edges, setEdges] = useState<Edge[]>([])

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    const newId = `v-${Date.now()}`;

    const newVertex: Vertex = {
      id: newId,
      x: x,
      y:y,
    };

    setVertices(prevVertex => ({
      ...prevVertex, [newId]: newVertex
    }));
  };

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* ツールバーやヘッダーを置く領域 */}
      <div style={{ padding: '10px', backgroundColor: 'white', borderBottom: '1px solid #ccc' }}>
        <h3>Graph to TikZ</h3>
      </div>

      {/* グラフを描画するSVGキャンバス */}
      <svg 
        onClick={handleCanvasClick}
        style={{ width: '100%', height: 'calc(100vh - 60px)', backgroundColor: 'white' }}
      >
        {Object.values(vertices).map((v) => (
          <circle key={v.id} cx={v.x} cy={v.y} r="15" fill="black"/>
        ))}
      </svg>
    </div>
  )
}

export default App