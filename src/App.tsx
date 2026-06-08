import React, { useState, useRef } from 'react'
import type { Vertex, Edge } from './types'
import { AlignHorizontalSpaceAround, AlignVerticalSpaceAround, CircleDashed, LayoutTemplate } from 'lucide-react';

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
  const [selectedEdgeId, setSelectEdgeId] = useState<string|null>(null)
  const [isSnapMode, setIsSnapMode] = useState(false)
  const Gridsize = 40
  const hasDragged = useRef(false)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{x: number, y:  number, type: 'vertex'| 'edge', id: string}|null>(null)

  const handleEdgeContextMenu = (e: React.MouseEvent<SVGPathElement>, edgeId: string) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: 'edge',
      id: edgeId
    })


  };

  const snapToGrid = (value: number) => {
    return Math.floor(value / Gridsize) * Gridsize;
  }

  const handleVertexContextMenu = (e: React.MouseEvent<SVGCircleElement>, vertexid: string) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: 'vertex',
      id: vertexid
    })
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
    if (contextMenu) setContextMenu(null)

    if (hasDragged.current){
      hasDragged.current = false;
      return;
    }


    const x = isSnapMode? snapToGrid(e.nativeEvent.offsetX) : e.nativeEvent.offsetX;
    const y = isSnapMode? snapToGrid(e.nativeEvent.offsetY) : e.nativeEvent.offsetY;
    const newId = `v-${Date.now()}`;
    const newVertex: Vertex = { id: newId, x: x, y: y };
    setSelectEdgeId(null);

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

  const handleEdgeMouseDown = (e: React.MouseEvent<SVGPathElement>, id: string) => {
    e.stopPropagation();

    setSelectEdgeId(prev => prev === id? null: id);
  }

  const handleMouseUp = () => {
    setMoveVertex(null)
    setTimeout(() => {
      hasDragged.current = false
    },50);
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!moveVertex) return;
    hasDragged.current = true;
    const x = isSnapMode? snapToGrid(e.nativeEvent.offsetX) : e.nativeEvent.offsetX;
    const y = isSnapMode? snapToGrid(e.nativeEvent.offsetY) : e.nativeEvent.offsetY;
    setVertices(state => ({
      ...state, [moveVertex]: { ...state[moveVertex], x: x, y: y }
    }))
  }

  const generateTikzCode = () => {
    let code = "\\begin{figure}[H]\n\\begin{tikzpicture}\n";
    const nodeIdMap: Record<string, number> = {};
    let counter = 1;

    const scaleFactor = 100; 
    const formatCoord = (val: number) => (val / scaleFactor).toFixed(1);

    const sortedVertices = Object.values(vertices).sort((a, b) => {
      if (Math.abs(a.x - b.x) > 10) {
        return a.x - b.x;
      }
      return a.y - b.y;
    });

    sortedVertices.forEach(v => {
      nodeIdMap[v.id] = counter; 
      code += `  \\node[draw, circle, fill=white, inner sep=2pt] (v${counter}) at (${formatCoord(v.x)}, ${formatCoord(-v.y)}) {};\n`;
      counter++;
    });


    edges.forEach(edge => {
      const sourceVertex = vertices[edge.sourceId];
      const targetVertex = vertices[edge.targetId];
      const sourceNum = nodeIdMap[edge.sourceId];
      const targetNum = nodeIdMap[edge.targetId];
      
      const curve = edge.curveStrength ?? 0;
      
      const arrowNode = edge.isDirected 
        ? `node[pos=0.5, sloped, allow upside down, scale=0.7] {$\\blacktriangleright$}` 
        : "";

      if (Math.abs(curve) > 0.01) {
        const dx = targetVertex.x - sourceVertex.x;
        const dy = sourceVertex.y - targetVertex.y; 
        const baseAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        const bendAngle = curve * -90;
        
        const outAngle = Math.round((baseAngle + bendAngle + 360) % 360);
        const inAngle = Math.round((baseAngle + 180 - bendAngle + 360) % 360);
        
        code += `  \\draw (v${sourceNum}) to[out=${outAngle}, in=${inAngle}] ${arrowNode} (v${targetNum});\n`;
      } else {
        code += `  \\draw (v${sourceNum}) -- ${arrowNode} (v${targetNum});\n`;
      }
    });

    code += "\\end{tikzpicture}\n\\end{figure}";
    return code;
  }

  const handleAlign = (type: 'horizontal' | 'vertical' | 'circle') => {
    if (selectVertexIds.length < 2) return;

    setVertices(prev => {
      const newVertices = { ...prev };
      
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
      

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', backgroundColor: 'white', borderBottom: '1px solid #ccc', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', zIndex: 10 }}>
        <h3 style={{ margin: 0, color: '#333' }}>Graph to TikZ</h3>
        

        <div style={{ display: 'flex', gap: '10px' }}>
          {selectedEdgeId && <input 
            type="range"
            min="-0.5"
            max="0.5"
            step="0.05"
            value={edges.find(e => e.id === selectedEdgeId)?.curveStrength ?? 0}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value);
              setEdges(prev => prev.map(edge =>
                edge.id === selectedEdgeId
                ? {...edge, curveStrength: newValue}
                :edge
              ));
            }}
          />}

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '15px', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: isDirectedMode ? '#999' : '#333', fontWeight: isDirectedMode ? 'normal' : 'bold' }}>無向</span>
            
            <div style={{
              position: 'relative', width: '44px', height: '24px', 
              backgroundColor: isDirectedMode ? '#3b82f6' : '#ccc', 
              borderRadius: '24px', transition: 'background-color 0.2s'
            }}>
            
              <div style={{
                position: 'absolute', top: '2px', 
                left: isDirectedMode ? '22px' : '2px', // ON/OFFで位置がスライドする
                width: '20px', height: '20px', backgroundColor: 'white', 
                borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }} />
            </div>

            <span style={{ fontSize: '14px', color: isDirectedMode ? '#333' : '#999', fontWeight: isDirectedMode ? 'bold' : 'normal' }}>有向</span>
            
            <input 
              type="checkbox" 
              checked={isDirectedMode} 
              onChange={() => setIsDirectedMode(!isDirectedMode)}
              style={{ display: 'none' }} 
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '15px', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: isSnapMode ? '#999' : '#333', fontWeight: isSnapMode ? 'normal' : 'bold', width: '80px', textAlign: 'right' }}>グリッドOFF</span>
            
            <div style={{
              position: 'relative', width: '44px', height: '24px', 
              backgroundColor: isSnapMode ? '#3b82f6' : '#ccc', 
              borderRadius: '24px', transition: 'background-color 0.2s'
            }}>
            
              <div style={{
                position: 'absolute', top: '2px', 
                left: isSnapMode ? '22px' : '2px', // ON/OFFで位置がスライドする
                width: '20px', height: '20px', backgroundColor: 'white', 
                borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }} />
            </div>

            <span style={{ fontSize: '14px', color: isSnapMode ? '#333' : '#999', fontWeight: isSnapMode ? 'bold' : 'normal', width: '80px', textAlign: 'left' }}>グリッドON</span>
            
            <input 
              type="checkbox" 
              checked={isSnapMode} 
              onChange={() => setIsSnapMode(!isSnapMode)}
              style={{ display: 'none' }} 
            />
          </label>

          <div style={{ position: 'relative' }}>
            
            {/* 親ボタン（常に表示） */}
            <button 
              title="整列メニュー"
              onClick={() => setActiveMenu(activeMenu === 'align' ? null : 'align')}
              style={{ padding: '6px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', display: 'flex', alignItems: 'center' }}
            >
              <LayoutTemplate size={20} color="#333" />
            </button>

            {/* 3. メニューが開いている時だけ中身を表示する条件付きレンダリング */}
            {activeMenu === 'align' && (
              <div style={{ 
                position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                display: 'flex', flexDirection: 'column', gap: '4px',
                backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px', padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <button title="横に揃える" onClick={() => handleAlign('horizontal')} disabled={selectVertexIds.length < 2} style={{ padding: '4px', cursor: 'pointer', backgroundColor: 'transparent', border: 'none' }}>
                  <AlignHorizontalSpaceAround size={20} color={selectVertexIds.length < 2 ? '#ccc' : '#333'} />
                </button>
                <button title="縦に揃える" onClick={() => handleAlign('vertical')} disabled={selectVertexIds.length < 2} style={{ padding: '4px', cursor: 'pointer', backgroundColor: 'transparent', border: 'none' }}>
                  <AlignVerticalSpaceAround size={20} color={selectVertexIds.length < 2 ? '#ccc' : '#333'} />
                </button>
                <button title="円状に配置" onClick={() => handleAlign('circle')} disabled={selectVertexIds.length < 2} style={{ padding: '4px', cursor: 'pointer', backgroundColor: 'transparent', border: 'none' }}>
                  <CircleDashed size={20} color={selectVertexIds.length < 2 ? '#ccc' : '#333'} />
                </button>
              </div>
            )}
          </div>
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
              <pattern id = "grid-pattern" width={Gridsize} height={Gridsize} patternUnits='userSpaceOnUse'>
                <path d={`M ${Gridsize} 0 L 0 0 0 ${Gridsize}`} fill = "none" stroke="#e5e7eb" strokeWidth="1"/>
              </pattern>
            </defs>

            {isSnapMode && (
              <rect 
                width="100%" 
                height="100%" 
                fill="url(#grid-pattern)" 
                style={{ pointerEvents: 'none' }}
              />
            )}

            {edges.map((edge) => {
              const sourceVertex = vertices[edge.sourceId];
              const targetVertex = vertices[edge.targetId];
              if (!sourceVertex || !targetVertex) return null;

              const x1 = sourceVertex.x;
              const y1 = sourceVertex.y;
              const x2 = targetVertex.x;
              const y2 = targetVertex.y;

              const curveStrength = edge.curveStrength ?? 0;
              const cx = (x1 + x2) / 2 - (y2 - y1) * curveStrength;
              const cy = (y1 + y2) / 2 + (x2 - x1) * curveStrength;

              return (
                <g key = {edge.id}>
                  {selectedEdgeId === edge.id && (
                    <path
                      d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="10"
                      opacity="0.3"
                      style={{pointerEvents:'none'}}
                    />
                  )}

                  <path 
                    d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                    fill="none"

                    stroke="#333"
                    strokeWidth="4"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => handleEdgeMouseDown(e, edge.id)}
                    onContextMenu={(e) => handleEdgeContextMenu(e, edge.id)}
                    markerEnd={edge.isDirected ? "url(#arrow)" : undefined}
                  />
                </g>
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
      {contextMenu && (
        <div style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          zIndex: 100, // 他の要素より上に重ねる
          backgroundColor: 'white',
          boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
          borderRadius: '8px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minWidth: '150px'
        }}>
          <div style={{ fontSize: '12px', color: '#666', padding: '4px 8px', borderBottom: '1px solid #eee', marginBottom: '4px' }}>
            {contextMenu.type === 'vertex' ? '頂点' : '辺'}の設定
          </div>
          
          <button style={{ textAlign: 'left', padding: '6px 8px', cursor: 'pointer', border: 'none', backgroundColor: 'transparent' }}>
            🎨 色の変更 (未実装)
          </button>
          
          <button 
            onClick={() => {
              // ここに元の削除処理を書く
              if (contextMenu.type === 'vertex') {
                 setVertices(prev => {
                  const newVertices = { ...prev };
                  delete newVertices[contextMenu.id];
                  return newVertices;
                });
                setEdges(prev => prev.filter(edge => edge.sourceId !== contextMenu.id && edge.targetId !== contextMenu.id));
                if (sourceVertexId === contextMenu.id) setSourceVertexId(null);
                if (moveVertex === contextMenu.id) setMoveVertex(null);
              } else {
                 setEdges(prev => prev.filter(edge => edge.id !== contextMenu.id));
              }
              // 処理が終わったらメニューを閉じる
              setContextMenu(null);
            }}
            style={{ textAlign: 'left', padding: '6px 8px', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', color: '#ef4444' }}
          >
            🗑️ 削除
          </button>
        </div>
      )}
    </div>
  )
}

export default App