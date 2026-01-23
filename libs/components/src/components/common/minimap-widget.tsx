import React, { useEffect, useState, useRef } from 'react';
import Editor from '@components/core/editor';
import { NodeModel } from '@projectstorm/react-diagrams';

export interface MiniMapWidgetProps {
  editor: Editor;
}

const MiniMapWidget: React.FC<MiniMapWidgetProps> = ({ editor }) => {
  const [nodes, setNodes] = useState<NodeModel[]>([]);
  const [viewPort, setViewPort] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 }); // World dimensions
  const [minBounds, setMinBounds] = useState({ x: 0, y: 0 });

  const MINI_MAP_SIZE = 150;

  useEffect(() => {
    const updateMap = () => {
      const model = editor.activeModel;
      const nodesMap = model.getNodes();
      const nodeList = Object.values(nodesMap);
      setNodes(nodeList as any);

      // Calculate world bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      if (nodeList.length === 0) {
        // Default bounds if empty
        minX = 0; minY = 0; maxX = 1000; maxY = 1000;
      } else {
        nodeList.forEach(node => {
          const pos = (node as any).getPosition();
          const width = (node as any).width || 150; // Approximations if not set
          const height = (node as any).height || 100;
          minX = Math.min(minX, pos.x);
          minY = Math.min(minY, pos.y);
          maxX = Math.max(maxX, pos.x + width);
          maxY = Math.max(maxY, pos.y + height);
        });
      }

      // Add some padding to world bounds
      const padding = 500;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      setMinBounds({ x: minX, y: minY });

      const worldWidth = maxX - minX;
      const worldHeight = maxY - minY;

      setDimensions({ width: worldWidth, height: worldHeight });

      // Calculate Viewport relative to World
      const zoom = model.getZoomLevel() / 100;
      const offsetX = model.getOffsetX();
      const offsetY = model.getOffsetY();

      // The canvas window size
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Viewport logic:
      // The diagram offsets are essentially "camera position" but inverted.
      // Screen (0,0) corresponds to World (-offsetX/zoom, -offsetY/zoom).
      const vx = -offsetX / zoom;
      const vy = -offsetY / zoom;
      const vw = windowWidth / zoom;
      const vh = windowHeight / zoom;

      // Normalized Viewport (0..1)
      setViewPort({
        x: (vx - minX) / worldWidth,
        y: (vy - minY) / worldHeight,
        width: vw / worldWidth,
        height: vh / worldHeight
      });
    };

    const unsubscribe = editor.addOnModelChange(updateMap);
    // We also want to update on simple zoom/pan events which might not trigger full model change
    // but often the listener covers it. If not, we might need a tighter loop or specific listener.
    // For MVP, this often suffices as moving nodes triggers it. Pan/Zoom might need explicit repaint listener.

    // Listen to engine repaint for pan/zoom updates
    const paintListener = editor.engine.registerListener({
      repaintCanvas: updateMap
    });

    updateMap();

    return () => {
      unsubscribe();
      paintListener.deregister();
    }
  }, [editor]);

  // Calculate aspect ratio for container
  const safeWidth = dimensions.width || 1000;
  const safeHeight = dimensions.height || 1000;
  const aspectRatio = safeHeight / safeWidth;
  const mapHeight = MINI_MAP_SIZE * aspectRatio;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: MINI_MAP_SIZE,
        height: mapHeight,
        backgroundColor: 'rgba(20, 20, 20, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        zIndex: 1000,
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        pointerEvents: 'none' // Making interactive requires reverse mapping math (click -> setOffset)
      }}
    >
      {/* Render Nodes as small dots */}
      {nodes.map(node => {
        const pos = (node as any).getPosition();
        const nX = (pos.x - minBounds.x) / safeWidth;
        const nY = (pos.y - minBounds.y) / safeHeight;
        // Approximate size in %
        const nW = ((node as any).width || 150) / safeWidth;
        const nH = ((node as any).height || 100) / safeHeight;

        return (
          <div
            key={node.getID()}
            style={{
              position: 'absolute',
              left: `${nX * 100}%`,
              top: `${nY * 100}%`,
              width: `${Math.max(nW * 100, 2)}%`, // Min width visibility
              height: `${Math.max(nH * 100, 2)}%`,
              backgroundColor: '#BB86FC',
              borderRadius: 2,
              opacity: 0.6
            }}
          />
        );
      })}

      {/* Viewport Rect */}
      <div style={{
        position: 'absolute',
        left: `${viewPort.x * 100}%`,
        top: `${viewPort.y * 100}%`,
        width: `${viewPort.width * 100}%`,
        height: `${viewPort.height * 100}%`,
        border: '2px solid #03DAC6',
        backgroundColor: 'rgba(3, 218, 198, 0.15)',
        boxSizing: 'border-box'
      }} />
    </div>
  );
}

export default MiniMapWidget;
