// import React, { useEffect, useRef, useState, useCallback } from 'react';
// import { DiagramEngine } from '@projectstorm/react-diagrams';

// // Ensure DOM types are available
// declare global {
//   namespace JSX {
//     interface IntrinsicElements {
//       canvas: React.DetailedHTMLProps<React.CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement>;
//     }
//   }
// }

// // Minimap Component
// interface MinimapProps {
//   engine: DiagramEngine;
//   width?: number;
//   height?: number;
//   className?: string;
//   backgroundColor?: string;
//   viewportColor?: string;
//   borderColor?: string;
// }

// const Minimap = ({
//   engine,
//   width = 200,
//   height = 150,
//   className = '',
//   backgroundColor = '#f8f9fa',
//   viewportColor = 'rgba(59, 130, 246, 0.3)',
//   borderColor = '#e5e7eb'
// }: MinimapProps) => {
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const [bounds, setBounds] = useState({ width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 });

//   // Calculate diagram bounds
//   const calculateBounds = useCallback(() => {
//     if (!engine) return;

//     const model = engine.getModel();
//     const nodes = Object.values(model.getNodes());

//     if (nodes.length === 0) {
//       setBounds({ width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 });
//       return;
//     }

//     let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

//     nodes.forEach(node => {
//       const pos = node.getPosition();
//       // Use default size if getSize is not available
//       const size = (node as any).getSize?.() || { width: 100, height: 40 };

//       minX = Math.min(minX, pos.x);
//       minY = Math.min(minY, pos.y);
//       maxX = Math.max(maxX, pos.x + size.width);
//       maxY = Math.max(maxY, pos.y + size.height);
//     });

//     // Add some padding
//     const padding = 100;
//     minX -= padding;
//     minY -= padding;
//     maxX += padding;
//     maxY += padding;

//     setBounds({
//       minX,
//       minY,
//       maxX,
//       maxY,
//       width: maxX - minX,
//       height: maxY - minY
//     });
//   }, [engine]);

//   // Render minimap
//   const renderMinimap = useCallback(() => {
//     const canvas = canvasRef.current;
//     if (!canvas || !engine || bounds.width === 0) return;

//     const ctx = canvas.getContext('2d');
//     if (!ctx) return;
//     const model = engine.getModel();

//     // Clear canvas
//     ctx.clearRect(0, 0, width, height);

//     // Fill background
//     ctx.fillStyle = backgroundColor;
//     ctx.fillRect(0, 0, width, height);

//     // Calculate scale
//     const scaleX = width / bounds.width;
//     const scaleY = height / bounds.height;
//     const scale = Math.min(scaleX, scaleY);

//     // Calculate offset to center the diagram
//     const offsetX = (width - bounds.width * scale) / 2 - bounds.minX * scale;
//     const offsetY = (height - bounds.height * scale) / 2 - bounds.minY * scale;

//     // Draw nodes
//     const nodes = Object.values(model.getNodes());
//     nodes.forEach(node => {
//       const pos = node.getPosition();
//       const size = (node as any).getSize?.() || { width: 100, height: 40 };

//       const x = pos.x * scale + offsetX;
//       const y = pos.y * scale + offsetY;
//       const w = size.width * scale;
//       const h = size.height * scale;

//       // Draw node
//       ctx.fillStyle = (node.getOptions() as any).color || '#6366f1';
//       ctx.fillRect(x, y, w, h);

//       // Draw node border
//       ctx.strokeStyle = '#374151';
//       ctx.lineWidth = 1;
//       ctx.strokeRect(x, y, w, h);
//     });

//     // Draw links
//     const links = Object.values(model.getLinks());
//     links.forEach(link => {
//       const points = link.getPoints();
//       if (points.length < 2) return;

//       ctx.strokeStyle = (link.getOptions() as any).color || '#9ca3af';
//       ctx.lineWidth = 2;
//       ctx.beginPath();

//       points.forEach((point, index) => {
//         const x = point.getPosition().x * scale + offsetX;
//         const y = point.getPosition().y * scale + offsetY;

//         if (index === 0) {
//           ctx.moveTo(x, y);
//         } else {
//           ctx.lineTo(x, y);
//         }
//       });

//       ctx.stroke();
//     });

//     // Draw viewport
//     const zoom = model.getZoomLevel() / 100;
//     const offset = model.getOffsetX();
//     const offsetYModel = model.getOffsetY();

//     const viewportWidth = width / zoom;
//     const viewportHeight = height / zoom;

//     const viewportX = (-offset / zoom) * scale + offsetX;
//     const viewportY = (-offsetYModel / zoom) * scale + offsetY;
//     const viewportW = viewportWidth * scale;
//     const viewportH = viewportHeight * scale;

//     // Draw viewport rectangle
//     ctx.strokeStyle = viewportColor.replace('0.3', '1');
//     ctx.fillStyle = viewportColor;
//     ctx.lineWidth = 2;
//     ctx.fillRect(viewportX, viewportY, viewportW, viewportH);
//     ctx.strokeRect(viewportX, viewportY, viewportW, viewportH);

//     // Draw minimap border
//     ctx.strokeStyle = borderColor;
//     ctx.lineWidth = 1;
//     ctx.strokeRect(0, 0, width, height);
//   }, [engine, bounds, width, height, backgroundColor, viewportColor, borderColor]);

//   // Handle mouse events
//   const handleMouseDown = useCallback((e: React.MouseEvent) => {
//     setIsDragging(true);
//     handleMouseMove(e);
//   }, []);

//   const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
//     if (!engine || bounds.width === 0) return;

//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const rect = canvas.getBoundingClientRect();
//     const x = e.clientX - rect.left;
//     const y = e.clientY - rect.top;

//     // Calculate scale
//     const scaleX = width / bounds.width;
//     const scaleY = height / bounds.height;
//     const scale = Math.min(scaleX, scaleY);

//     // Calculate offset
//     const offsetX = (width - bounds.width * scale) / 2 - bounds.minX * scale;
//     const offsetY = (height - bounds.height * scale) / 2 - bounds.minY * scale;

//     // Convert minimap coordinates to diagram coordinates
//     const diagramX = (x - offsetX) / scale;
//     const diagramY = (y - offsetY) / scale;

//     // Update diagram offset
//     const model = engine.getModel();
//     const zoom = model.getZoomLevel() / 100;

//     // Calculate new offsets for X and Y
//     const newOffsetX = -diagramX * zoom + width / (2 * zoom);
//     const newOffsetY = -diagramY * zoom + height / (2 * zoom);

//     // Ensure offsets are numbers
//     model.setOffsetX(Number(newOffsetX));
//     model.setOffsetY(Number(newOffsetY));
//     engine.repaintCanvas();
//   }, [engine, bounds, width, height]);

//   const handleMouseUp = useCallback(() => {
//     setIsDragging(false);
//   }, []);

//   // Setup event listeners
//   useEffect(() => {
//     if (isDragging) {
//       document.addEventListener('mousemove', handleMouseMove);
//       document.addEventListener('mouseup', handleMouseUp);

//       return () => {
//         document.removeEventListener('mousemove', handleMouseMove);
//         document.removeEventListener('mouseup', handleMouseUp);
//       }
//     }
//   }, [isDragging, handleMouseMove, handleMouseUp]);

//   // Listen to engine changes
//   useEffect(() => {
//     if (!engine) return;

//     const handleModelChange = () => {
//       calculateBounds();
//       setTimeout(renderMinimap, 10);
//     };

//     // Listen to various events
//     const model = engine.getModel();
//     model.registerListener({
//       nodesUpdated: handleModelChange,
//       linksUpdated: handleModelChange,
//       offsetUpdated: renderMinimap,
//       zoomUpdated: renderMinimap
//     });

//     // Initial render
//     calculateBounds();
//     setTimeout(renderMinimap, 10);

//     // Cleanup
//     return () => {
//       // Note: react-diagrams doesn't have a clean way to remove listeners
//       // You might need to keep track of listeners manually
//     };
//   }, [engine, calculateBounds, renderMinimap]);

//   return (
//     <div
//     //   className={`minimap ${className}`}
//     //   style={{
//     //     width: width,
//     //     height: height,
//     //     cursor: isDragging ? 'grabbing' : 'grab',
//     //     border: `1px solid ${borderColor}`,
//     //     borderRadius: '4px',
//     //     backgroundColor: backgroundColor,
//     //     overflow: 'hidden'
//     //   }}
//     //   onMouseDown={handleMouseDown}
//     // >
//     //   <canvas
//     //     ref={canvasRef}
//     //     width={width}
//     //     height={height}
//     //     style={{
//     //       display: 'block',
//     //       width: '100%',
//     //       height: '100%'
//     //     }}
//     //   />
//     </div>
//   );

// };

// // Example usage component
// const DiagramWithMinimap = () => {
//   const [engine, setEngine] = useState<DiagramEngine | null>(null);

//   useEffect(() => {
//     // Initialize your diagram engine here
//     const diagramEngine = new DiagramEngine();
//     // ... setup your engine, register factories, etc.
//     setEngine(diagramEngine);
//   }, []);

//   return (
//     <div style= {{ position: 'relative', width: '100%', height: '100vh' }
// }>
//   {/* Main diagram canvas */ }
//   < div style = {{ width: '100%', height: '100%' }}>
//     {/* Your DiagramWidget goes here */ }
//     </div>

// {/* Minimap */ }
// <div 
//         style={
//   {
//     position: 'absolute',
//       top: '20px',
//         right: '20px',
//           zIndex: 1000,
//             backgroundColor: 'white',
//               borderRadius: '8px',
//                 padding: '8px',
//                   boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
//   }
// }
//       >
//   { engine && (
//     <Minimap 
//             engine={ engine }
// width = { 200}
// height = { 150}
// backgroundColor = "#f8f9fa"
// viewportColor = "rgba(59, 130, 246, 0.3)"
// borderColor = "#e5e7eb"
//   />
//         )}
// </div>
//   </div>
//   );
// };

// // Enhanced version with toggle functionality
// interface MinimapWithToggleProps extends MinimapProps {
//   engine: DiagramEngine;
// }

// const MinimapWithToggle = ({ engine, ...props }: MinimapWithToggleProps) => {
//   const [isVisible, setIsVisible] = useState(true);

//   return (
//     <div className= {`minimap-container ${!isVisible ? 'hidden' : ''}`
// }>
//   <div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } }>
//     <span style={ { fontSize: '12px', fontWeight: '500', color: '#6b7280' } }>
//       Minimap
//       </span>
//       < button
// onClick = {() => setIsVisible(!isVisible)}
// style = {{
//   background: 'none',
//     border: 'none',
//       cursor: 'pointer',
//         fontSize: '14px',
//           color: '#6b7280',
//             padding: '2px'
// }}
//         >
//   { isVisible? '−': '+' }
//   </button>
//   </div>
// { isVisible && engine && <Minimap engine={ engine } {...props } /> }
// </div>
//   );
// };

// // CSS Styles (add to your CSS file)
// const minimapStyles = `
// .minimap {
//   transition: box-shadow 0.2s ease;
// }

// .minimap:hover {
//   box-shadow: 0 8px 25px -8px rgba(0, 0, 0, 0.2);
// }

// .minimap-container {
//   position: absolute;
//   top: 20px;
//   right: 20px;
//   z-index: 1000;
//   background: white;
//   border-radius: 8px;
//   padding: 8px;
//   box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
//   transition: opacity 0.2s ease;
// }

// .minimap-container.hidden {
//   opacity: 0;
//   pointer-events: none;
// }

// @media (max-width: 768px) {
//   .minimap-container {
//     top: 10px;
//     right: 10px;
//     transform: scale(0.8);
//     transform-origin: top right;
//   }
// }
// `;
// export { Minimap, DiagramWithMinimap, MinimapWithToggle, minimapStyles };
