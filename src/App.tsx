import React, { useState } from 'react'
import type { Vertex, Edge } from './types'

function App() {
  // ここにグラフの状態（頂点と辺）を持たせる予定です
  const [vertices, setVertices] = useState<Record<string, Vertex>>({})
  const [edges, setEdges] = useState<Edge[]>([])
  const [moveVertex, setMoveVertex] = useState<string|null>(null)
  const [sourceVertexId, setSourceVertexId] = useState<string|null>(null)

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    const newId = `v-${Date.now()}`;
    const newVertex: Vertex = {
      id: newId,
      x: x,
      y:y,
    };

    if (sourceVertexId){
      //辺を作るを記述
      const newEdge: Edge = {
        id: `e-${Date.now()}`,
        sourceId: sourceVertexId,
        targetId: newId,
        isDirected: false,
      }
      setVertices(prev => ({ ...prev, [newId]: newVertex }));
      setEdges(prevEdges => [...prevEdges, newEdge])
      setSourceVertexId(null)
    } else{
      setVertices(prevVertex => ({
        ...prevVertex, [newId]: newVertex
    }))};
  };

  const handleVertexMouseDown = (e: React.MouseEvent<SVGCircleElement>, id: string) => {
    e.stopPropagation();
    if (sourceVertexId){
      //辺を作る処理を記述
      const newEdge: Edge = {
        id: `e-${Date.now()}`,
        sourceId: sourceVertexId,
        targetId: id,
        isDirected: false,
      }
      setEdges(prevEdges => [...prevEdges, newEdge])
      setSourceVertexId(null)
    } else if (e.shiftKey) {
      setSourceVertexId(id)
    } else {
      setMoveVertex(id);
    }
  }

  const handleMouseUp = () => {
    setMoveVertex(null)
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!moveVertex) return;

    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    // 3. verticesの状態を更新し、つかんでいる頂点の座標だけを上書きする
    setVertices(state => {
      return{
        ...state,
        [moveVertex]: {
          ...state[moveVertex],
          x: x,
          y: y
        }
      }
    })
  }

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* ツールバーやヘッダーを置く領域 */}
      <div style={{ padding: '10px', backgroundColor: 'white', borderBottom: '1px solid #ccc' }}>
        <h3>Graph to TikZ</h3>
      </div>

      {/* グラフを描画するSVGキャンバス */}
      <svg 
        onClick={handleCanvasClick}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        style={{ width: '100%', height: 'calc(100vh - 60px)', backgroundColor: 'white' }}
      >
        {edges.map((edge) => {
          const sourceVertex = vertices[edge.sourceId];
          const targetVertex = vertices[edge.targetId];

          if (!sourceVertex || !targetVertex) return null;

          return (
            <line 
              key={edge.id} 
              x1={sourceVertex.x} y1={sourceVertex.y} 
              x2={targetVertex.x} y2={targetVertex.y} 
              stroke="black" strokeWidth="2"
            />
          );
        })}
        {Object.values(vertices).map((v) => (
          <circle onClick={(e) => e.stopPropagation()} onMouseDown={(e) => handleVertexMouseDown(e, v.id)} key={v.id} cx={v.x} cy={v.y} r="10" fill="black"/>
        ))}
      </svg>
    </div>
  )
}

export default App