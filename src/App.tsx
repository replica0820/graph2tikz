import React, { useState } from 'react'
import type { Vertex, Edge } from './types'

function App() {
  const [isCopied, setIsCopied] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [vertices, setVertices] = useState<Record<string, Vertex>>({})
  const [edges, setEdges] = useState<Edge[]>([])
  const [moveVertex, setMoveVertex] = useState<string|null>(null)
  const [sourceVertexId, setSourceVertexId] = useState<string|null>(null)

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
        id: `e-${Date.now()}`, sourceId: sourceVertexId, targetId: newId, isDirected: false,
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
    if (sourceVertexId){
      const newEdge: Edge = {
        id: `e-${Date.now()}`, sourceId: sourceVertexId, targetId: id, isDirected: false,
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
      code += `  \\draw (v${sourceNum}) -- (v${targetNum});\n`;
    });

    code += "\\end{tikzpicture}";
    return code;
  }

  return (
    <div 
      onMouseMove={handleGlobalMouseMove} 
      onMouseUp={handleGlobalMouseUp}
      style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column', userSelect: isResizing ? 'none' : 'auto' }}
    >
      
      <div style={{ padding: '15px 20px', backgroundColor: 'white', borderBottom: '1px solid #ccc', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', zIndex: 10 }}>
        <h3 style={{ margin: 0, color: '#333' }}>Graph to TikZ</h3>
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
            {edges.map((edge) => {
              const sourceVertex = vertices[edge.sourceId];
              const targetVertex = vertices[edge.targetId];
              if (!sourceVertex || !targetVertex) return null;
              return (
                <line 
                  key={edge.id} 
                  x1={sourceVertex.x} y1={sourceVertex.y} 
                  x2={targetVertex.x} y2={targetVertex.y} 
                  stroke="#333" strokeWidth="2"
                />
              );
            })}
            {Object.values(vertices).map((v) => (
              <circle 
                onClick={(e) => e.stopPropagation()} 
                onMouseDown={(e) => handleVertexMouseDown(e, v.id)} 
                key={v.id} cx={v.x} cy={v.y} r="12" 
                fill="white" stroke="#333" strokeWidth="3"
                style={{ cursor: 'pointer' }}
              />
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