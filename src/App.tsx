import React, { useState } from 'react'
import type { Vertex, Edge } from './types'

function App() {
  const [isCopied, setIsCopied] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(800);
  const [isResizing, setIsResizing] = useState(false);
  const [vertices, setVertices] = useState<Record<string, Vertex>>({})
  const [edges, setEdges] = useState<Edge[]>([])
  const [moveVertex, setMoveVertex] = useState<string|null>(null)
  const [sourceVertexId, setSourceVertexId] = useState<string|null>(null)
  const [selectVertexIds, setSelectVertexIds] = useState<string[]>([])
  const [isDirectedMode, setIsDirectedMode] = useState(false)

  const handleEdgeContextMenu = (e: React.MouseEvent<SVGLineElement>, edgeId: string) => {
    e.preventDefault();
    e.stopPropagation();

    setEdges(prev => prev.filter(edge => edge.id !== edgeId));
  };

  const handleVertexContextMenu = (e: React.MouseEvent<SVGCircleElement>, vertexid: string) => {
    e.preventDefault();
    e.stopPropagation();

    setVertices(prev => {
      const newVertices = { ...prev };
      delete newVertices[vertexid];
      return newVertices;
    });

    setEdges(prev => prev.filter(edge => edge.sourceId !== vertexid && edge.targetId !== vertexid));

    if (sourceVertexId === vertexid) setSourceVertexId(null);
    if (moveVertex === vertexid) setMoveVertex(null);
  }

  const handleGlobalMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isResizing) return;

    const newWidth = window.innerWidth - e.clientX;
    
    if (newWidth > 200 && newWidth < 800) {
      setSidebarWidth(newWidth);
    }
  };

  const handleGlobalMouseUp = () => {
    if (isResizing) {
      setIsResizing(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    const newId = `v-${Date.now()}`;
    const newVertex: Vertex = { id: newId, x: x, y: y };

    if (sourceVertexId){
      const newEdge: Edge = {
        id: `e-${Date.now()}`, sourceId: sourceVertexId, targetId: newId, isDirected: isDirectedMode,
      }
      setVertices(prev => ({ ...prev, [newId]: newVertex }));
      setEdges(prevEdges => [...prevEdges, newEdge])
      setSourceVertexId(null)
    } else {
      setVertices(prevVertex => ({ ...prevVertex, [newId]: newVertex }));
    }
  };

  const handleVertexMouseDown = (e: React.MouseEvent<SVGCircleElement>, id: string) => {
    e.stopPropagation();
    if (e.altKey) {
      setSelectVertexIds(prev => {
        if (prev.includes(id)) {
          return prev.filter(vId => vId !== id);
        }else {
          return [...prev, id]
        }
      });
      return
    }

    if (sourceVertexId){
      const newEdge: Edge = {
        id: `e-${Date.now()}`, sourceId: sourceVertexId, targetId: id, isDirected: isDirectedMode,
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
    setVertices(state => ({
      ...state, [moveVertex]: { ...state[moveVertex], x: x, y: y }
    }))
  }

  const generateTikzCode = () => {
    let code = "\\begin{tikzpicture}[scale=0.05]\n";
    const nodeIdMap: Record<string, number> = {};
    let counter = 1;

    Object.values(vertices).forEach(v => {
      nodeIdMap[v.id] = counter; 
      code += `  \\node[draw, circle, fill=white, inner sep=2pt] (v${counter}) at (${v.x}, ${-v.y}) {${counter}};\n`;
      counter++;
    });

    edges.forEach(edge => {
      const sourceNum = nodeIdMap[edge.sourceId];
      const targetNum = nodeIdMap[edge.targetId];
      code += edge.isDirected ? `\\draw[->] (v${sourceNum}) -- (v${targetNum});\n`:`  \\draw (v${sourceNum}) -- (v${targetNum});\n`;
    });

    code += "\\end{tikzpicture}";
    return code;
  }

  const handleAlign = (type: 'horizontal' | 'vertical' | 'circle') => {
    // 2つ以上の頂点が選ばれていない場合は何もしない
    if (selectVertexIds.length < 2) return;

    setVertices(prev => {
      // 既存の頂点データをディープコピー（安全に更新するため）
      const newVertices = { ...prev };
      
      // 選ばれている頂点のデータ（オブジェクト）だけを配列として抽出
      const selectedNodes = selectVertexIds.map(id => newVertices[id]);
      
      if (type === 'horizontal') {
        let totalY = 0;
        selectedNodes.forEach(node => {
          totalY += node.y;
        });
        const avgY = totalY / selectedNodes.length;

        selectedNodes.sort((a,b) => a.x - b.x);

        const startX = selectedNodes[0].x;
        const endX = selectedNodes[selectedNodes.length - 1].x;

        const stepX = (endX - startX) / (selectedNodes.length - 1);

        selectedNodes.forEach((node, index) => {
          newVertices[node.id].y = avgY;
          newVertices[node.id].x = startX + (stepX * index);
        });
      } else if (type === 'vertical') {
        let totalX = 0;
        selectedNodes.forEach(node => {
          totalX += node.x;
        });
        const avgX = totalX / selectedNodes.length;

        selectedNodes.sort((a,b) => a.y - b.y);

        const startY = selectedNodes[0].y;
        const endY = selectedNodes[selectedNodes.length - 1].y;

        const stepY = (endY - startY) / (selectedNodes.length - 1);

        selectedNodes.forEach((node,index) => {
          newVertices[node.id].x = avgX;
          newVertices[node.id].y = startY + (stepY * index);
        });
      } else if (type === 'circle') {
        let totalX = 0;
        let totalY = 0;
        selectedNodes.forEach(node => {
          totalX += node.x;
          totalY += node.y;
        })
        const N = selectedNodes.length;
        const centerX = totalX/N;
        const centerY = totalY/N;

        const borderRadius = 100;

        selectedNodes.forEach((node, index) => {
          const angle = (2 * Math.PI * index) / N;
          newVertices[node.id].x = centerX + borderRadius * Math.cos(angle);
          newVertices[node.id].y = centerY + borderRadius * Math.sin(angle);
        })
      }

      // 最後に、選択状態を解除しておくと連続操作が暴発せず親切です
      setSelectVertexIds([]);

      return newVertices;
    });
  };

  return (
    <div 
      onMouseMove={handleGlobalMouseMove} 
      onMouseUp={handleGlobalMouseUp}
      style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column', userSelect: isResizing ? 'none' : 'auto' }}
    >
      
      {/* ツールバーやヘッダーを置く領域 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', backgroundColor: 'white', borderBottom: '1px solid #ccc', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', zIndex: 10 }}>
        <h3 style={{ margin: 0, color: '#333' }}>Graph to TikZ</h3>
        
        {/* 🌟 追加: 整列ボタン群 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setIsDirectedMode(!isDirectedMode)}
            style={{
              padding: '6px 12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc',
              backgroundColor: isDirectedMode ? '#3b82f6' : '#fff',
              color: isDirectedMode ? '#fff': '#333',
              marginRight: '15px'
            }}
          >
            {isDirectedMode? '有向辺' : '無向辺'}
          </button>

          <button 
            onClick={() => handleAlign('horizontal')}
            disabled={selectVertexIds.length < 2}
            style={{ padding: '6px 12px', cursor: selectVertexIds.length < 2 ? 'not-allowed' : 'pointer', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#fff', color: '#333' }}
          >
            横に揃える
          </button>
          <button 
            onClick={() => handleAlign('vertical')}
            disabled={selectVertexIds.length < 2}
            style={{ padding: '6px 12px', cursor: selectVertexIds.length < 2 ? 'not-allowed' : 'pointer', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#fff', color: '#333' }}
          >
            縦に揃える
          </button>
          <button 
            onClick={() => handleAlign('circle')}
            disabled={selectVertexIds.length < 2}
            style={{ padding: '6px 12px', cursor: selectVertexIds.length < 2 ? 'not-allowed' : 'pointer', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#fff', color: '#333' }}
          >
            円状に配置
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* 左側：SVGキャンバス */}
        <div style={{ flex: 1, position: 'relative' }}>
          <svg 
            onClick={handleCanvasClick}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            style={{ width: '100%', height: '100%', backgroundColor: 'white' }}
          >
            <defs>
              <marker id='arrow' viewBox="0 0 10 10" markerWidth="5" markerHeight="5" refX="15" refY="5" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#333"/>
              </marker>
            </defs>
            {edges.map((edge) => {
              const sourceVertex = vertices[edge.sourceId];
              const targetVertex = vertices[edge.targetId];
              if (!sourceVertex || !targetVertex) return null;
              return (
                <line 
                  key={edge.id} 
                  x1={sourceVertex.x} y1={sourceVertex.y} 
                  x2={targetVertex.x} y2={targetVertex.y} 
                  stroke="#333" strokeWidth="4" // 少し太くすると押しやすいです
                  style={{ cursor: 'pointer' }} // カーソルを指マークに
                  onContextMenu={(e) => handleEdgeContextMenu(e, edge.id)} // 右クリックイベント！
                  markerEnd={edge.isDirected? "url(#arrow)": undefined}
                />
              );
            })}
            {Object.values(vertices).map((v) => (
              <g key={v.id}>
                {(sourceVertexId === v.id || selectVertexIds.includes(v.id)) &&(
                  <circle
                  cx={v.x} cy={v.y} r = "18"
                  fill='#3b82f6' opacity="0.3"
                  style={{pointerEvents: 'none'}}
                  />
                )}

                <circle
                  onClick={(e) => e.stopPropagation()} 
                  onMouseDown={(e) => handleVertexMouseDown(e, v.id)} 
                  onContextMenu={(e) => handleVertexContextMenu(e, v.id)} 
                  cx={v.x} cy={v.y} r="12" 
                  fill="white" stroke="#333" strokeWidth="3"
                  style={{ cursor: 'pointer' }}
                />
              </g>
            ))}
          </svg>
        </div>

        <div 
          onMouseDown={() => setIsResizing(true)}
          style={{
            width: '6px',
            backgroundColor: isResizing ? '#3b82f6' : '#252526', // ドラッグ中は青く光る
            cursor: 'col-resize',
            zIndex: 20,
            transition: 'background-color 0.2s'
          }}
        />

        {/* 右側：TikZ出力エリア */}
        <div style={{ width: `${sidebarWidth}px`, backgroundColor: '#1e1e1e', color: '#d4d4d4', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #333', backgroundColor: '#252526' }}>
            <h4 style={{ margin: 0, color: '#fff', fontWeight: 'normal' }}>TikZ Code</h4>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(generateTikzCode());
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
              }}
              style={{ 
                padding: '6px 16px', cursor: 'pointer', borderRadius: '4px', border: 'none', 
                backgroundColor: isCopied ? '#10b981' : '#3b82f6',
                color: 'white', fontWeight: 'bold', transition: 'background-color 0.2s'
              }}
            >
              {isCopied ? 'Copied! ✓' : 'Copy'}
            </button>
          </div>
          
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            <pre style={{ 
              margin: 0, padding: '20px', backgroundColor: '#000', borderRadius: '8px', 
              whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5'
            }}>
              {generateTikzCode()}
            </pre>
          </div>
          
        </div>

      </div>
    </div>
  )
}

export default App