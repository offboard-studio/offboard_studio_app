/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import logo from '@assets/logo.png';

// API Base URL - Production endpoint
const API_BASE_URL = 'https://offboard-studio-components-store.vercel.app/api';

interface BlockItem {
  id: string;
  label: string;
  path: string;
  file: string;
}

interface Category {
  id: string;
  label: string;
  items: BlockItem[];
}

interface SidebarLayer {
  id: string;
  title: string;
  content: React.ReactNode;
  width: string;
}

interface BlockDetail {
  label: string;
  json: any;
}

interface BoardSideBarProps {
  editor?: any; // Editor prop'u opsiyonel yaptım
}

const DynamicBoardSidebar: React.FC<BoardSideBarProps> = ({ editor }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeLayers, setActiveLayers] = useState<SidebarLayer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubItem, setSelectedSubItem] = useState<string | null>(null);
  
  // API State
  const [categories, setCategories] = useState<Category[]>([]);
  const [groupBlocks, setGroupBlocks] = useState<{[key: string]: BlockItem[]}>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API Functions
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/blocks/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      setError('Failed to fetch categories');
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupBlocks = async (group: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/blocks/${group}`);
      if (!response.ok) throw new Error(`Failed to fetch ${group} blocks`);
      const data = await response.json();
      setGroupBlocks(prev => ({
        ...prev,
        [group]: data
      }));
    } catch (err) {
      setError(`Failed to fetch ${group} blocks`);
      console.error(`Error fetching ${group} blocks:`, err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockDetail = async (group: string, category: string, blockId: string): Promise<BlockDetail | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/blocks/${group}/${category}/${blockId}`);
      if (!response.ok) throw new Error('Failed to fetch block details');
      const data = await response.json();
      return data;
    } catch (err) {
      setError(`Failed to fetch block details`);
      console.error('Error fetching block details:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Load categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const staticCategories = [
    {
      id: 'basic',
      icon: '🔧',
      label: 'Basic Components',
      items: ['constant', 'code', 'aicode', 'input', 'output', 'information'],
    },
    {
      id: 'control',
      icon: '⚙️',
      label: 'Control Systems',
      items: ['processing'],
    },
    {
      id: 'robotics',
      icon: '🤖',
      label: 'Robotics',
      items: ['drivers'],
    },
    {
      id: 'px4',
      icon: '✈️',
      label: 'PX4 Components',
      items: ['flight-control', 'sensors', 'actuators'],
    },
  ];

  const setBlock = (type: string) => {
    if (editor && editor.addBlock) {
      editor.addBlock(type);
    } else {
      console.log('Block selected:', type);
      alert(`Block selected: ${type}`);
    }
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const category = staticCategories.find((cat) => cat.id === categoryId);

    if (category) {
      const newLayer: SidebarLayer = {
        id: `category-${categoryId}`,
        title: category.label,
        width: isSidebarCollapsed ? '200px' : '250px',
        content: (
          <div className="category-items">
            {category.items.map((item, index) => (
              <div
                key={item}
                className="category-item"
                onClick={() => handleSubItemClick(item)}
              >
                <span style={{ color: 'white' }}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </span>
                <span style={{ color: '#888', fontSize: '16px', float: 'right' }}>
                  ▶
                </span>
              </div>
            ))}
          </div>
        ),
      };

      setActiveLayers([newLayer]);
    }
  };

  const handleSubItemClick = (subItem: string) => {
    setSelectedSubItem(subItem);

    const detailsLayer: SidebarLayer = {
      id: `details-${subItem}`,
      title: `${subItem.charAt(0).toUpperCase() + subItem.slice(1)} Details`,
      width: isSidebarCollapsed ? '220px' : '280px',
      content: renderSubItemDetails(subItem),
    };

    setActiveLayers((prev) => {
      const categoryLayer = prev.find((layer) =>
        layer.id.startsWith('category-')
      );
      return categoryLayer ? [categoryLayer, detailsLayer] : [detailsLayer];
    });
  };

  const renderCategoryBlocks = (categoryData: Category) => {
    return (
      <div style={{ padding: '8px' }}>
        <h3 style={{ color: '#3498db', marginBottom: '12px', fontSize: '1.1em' }}>
          {categoryData.label}
        </h3>
        {categoryData.items.map((block) => (
          <div
            key={block.id}
            onClick={() => setBlock(`${categoryData.id}.${block.path}.${block.id}`)}
            className="block-item api-block"
            style={{
              padding: '12px',
              margin: '8px 0',
              cursor: 'pointer',
              borderRadius: '6px',
              backgroundColor: '#34495e',
              border: '1px solid #4a5568',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ color: 'white', fontWeight: '500', fontSize: '0.9rem' }}>
              {block.label}
            </div>
            <div style={{ color: '#bdc3c7', fontSize: '0.75rem' }}>
              Path: {block.path}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGroupBlocks = (groupName: string) => {
    const blocks = groupBlocks[groupName];
    
    if (!blocks) {
      // Load blocks if not already loaded
      fetchGroupBlocks(groupName);
      return (
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <div className="spinner"></div>
          <div style={{ color: '#ccc', marginTop: '8px', fontSize: '0.8rem' }}>
            Loading {groupName} blocks...
          </div>
        </div>
      );
    }

    // Group blocks by category
    const groupedBlocks = blocks.reduce((acc, block) => {
      if (!acc[block.path]) {
        acc[block.path] = [];
      }
      acc[block.path].push(block);
      return acc;
    }, {} as {[key: string]: BlockItem[]});

    return (
      <div style={{ padding: '8px' }}>
        {Object.entries(groupedBlocks).map(([category, categoryBlocks]) => (
          <div key={category} style={{ marginBottom: '16px' }}>
            <h4 style={{ 
              color: '#3498db', 
              marginBottom: '8px',
              textTransform: 'capitalize',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              {category}
            </h4>
            {categoryBlocks.map((block) => (
              <div
                key={block.id}
                onClick={async () => {
                  // Optionally fetch block details before setting
                  const details = await fetchBlockDetail(groupName, category, block.id);
                  if (details) {
                    console.log('Block details:', details);
                  }
                  setBlock(`${groupName}.${category}.${block.id}`);
                }}
                className="block-item group-block"
                style={{
                  padding: '10px 12px',
                  margin: '4px 0',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  backgroundColor: '#2c3e50',
                  border: '1px solid #34495e',
                  transition: 'all 0.2s',
                  color: 'white',
                  fontSize: '0.85rem'
                }}
              >
                {block.label}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderSubItemDetails = (subItem: string) => {
    switch (subItem) {
      case 'constant':
      case 'code':
      case 'aicode':
      case 'input':
      case 'output':
      case 'information':
        return (
          <div style={{ padding: '16px' }}>
            <div
              onClick={() => setBlock(`basic.${subItem}`)}
              className="block-item basic-block"
              style={{
                padding: '12px',
                cursor: 'pointer',
                borderRadius: '6px',
                backgroundColor: '#34495e',
                border: '1px solid #4a5568',
                transition: 'all 0.2s',
                color: 'white',
                fontSize: '1rem'
              }}
            >
              {subItem.charAt(0).toUpperCase() + subItem.slice(1)} Block
            </div>
          </div>
        );

      case 'processing':
        return renderGroupBlocks('processing');

      case 'drivers':
        return renderGroupBlocks('drivers');

      default:
        return (
          <div style={{ padding: '16px' }}>
            <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
              Details for {subItem}
            </div>
          </div>
        );
    }
  };

  const closeLayer = (layerId: string) => {
    setActiveLayers((prev) => {
      const layerIndex = prev.findIndex((layer) => layer.id === layerId);
      if (layerIndex !== -1) {
        return prev.slice(0, layerIndex);
      }
      return prev;
    });

    if (layerId.startsWith('category-')) {
      setSelectedCategory(null);
      setSelectedSubItem(null);
    } else if (layerId.startsWith('details-')) {
      setSelectedSubItem(null);
    }
  };

  const calculateLayerLeft = (index: number) => {
    const baseWidth = isSidebarCollapsed ? 60 : 80;
    let left = baseWidth;

    for (let i = 0; i < index; i++) {
      const layerWidth = parseInt(activeLayers[i]?.width || '200px');
      left += layerWidth;
    }

    return `${left}px`;
  };

  return (
    <div className="architecture-sidebar-container">
      {/* Error Display */}
      {error && (
        <div className="error-alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="close-btn">×</button>
        </div>
      )}

      {/* Main Sidebar */}
      <div className={`sidebar ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Logo */}
        <div className="logo-container">
          <div className="logo" 
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '24px',
            paddingTop: '8px',
          }}>
             <img
            src={logo}
            alt="Logo"
            style={{ width: '32px', height: '32px' }}
          />
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        )}

        {/* Categories */}
        <div className="categories-list">
          {staticCategories.map((category, index) => (
            <div
              key={category.id}
              className={`category-icon ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => handleCategoryClick(category.id)}
              title={category.label}
            >
              <span style={{ fontSize: '20px' }}>{category.icon}</span>
            </div>
          ))}
        </div>

        {/* API Categories Section */}
        {categories.length > 0 && (
          <div className="api-categories">
            <div className="api-categories-title">API Categories</div>
            {categories.slice(0, 3).map((category) => (
              <div
                key={category.id}
                className="api-category-item"
                onClick={() => {
                  const newLayer: SidebarLayer = {
                    id: `api-category-${category.id}`,
                    title: category.label,
                    width: '280px',
                    content: renderCategoryBlocks(category),
                  };
                  setActiveLayers([newLayer]);
                }}
                title={category.label}
              >
                {category.label.slice(0, 8)}...
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic Layers */}
      {activeLayers.map((layer, index) => (
        <div
          key={layer.id}
          className="sidebar-layer"
          style={{
            width: layer.width,
            left: calculateLayerLeft(index),
            zIndex: 1000 - index,
          }}
        >
          {/* Layer Header */}
          <div className="layer-header">
            <h3 className="layer-title">{layer.title}</h3>
            <button
              className="close-layer-btn"
              onClick={() => closeLayer(layer.id)}
            >
              ×
            </button>
          </div>

          {/* Layer Content */}
          <div className="layer-content">
            {layer.content}
          </div>
        </div>
      ))}

      {/* Overlay for mobile */}
      {activeLayers.length > 0 && isSidebarCollapsed && (
        <div
          className="mobile-overlay"
          onClick={() => setActiveLayers([])}
        />
      )}

      <style >{`
        .architecture-sidebar-container {
          display: flex;
          position: relative;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .error-alert {
          position: fixed;
          top: 10px;
          right: 10px;
          background: linear-gradient(135deg, #e74c3c, #c0392b);
          color: white;
          padding: 12px 16px;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
          z-index: 2000;
          min-width: 300px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          margin-left: 12px;
        }

        .sidebar {
          width: 80px;
          background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
          color: white;
          padding: 8px;
          height: 100vh;
          position: fixed;
          z-index: 1000;
          box-shadow: 2px 0 10px rgba(0,0,0,0.3);
          border-right: 1px solid #34495e;
          transition: width 0.3s ease;
        }

        .sidebar-collapsed {
          width: 60px;
        }

        .logo-container {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 24px;
          padding-top: 8px;
        }

        .logo {
          width: 32px;
          height: 32px;
          // background: linear-gradient(135deg, #3498db, #2980b9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
        }

        .loading-container {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #34495e;
          border-top: 2px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .categories-list {
          padding: 0;
        }

        .category-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          padding: 12px;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .category-icon:hover {
          background-color: #4a5568;
        }

        .category-icon.active {
          background-color: #3498db;
          border-color: #5dade2;
        }

        .api-categories {
          margin-top: 32px;
          border-top: 1px solid #4a5568;
          padding-top: 16px;
        }

        .api-categories-title {
          color: #bdc3c7;
          text-align: center;
          font-size: 0.7rem;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .api-category-item {
          padding: 8px;
          margin-bottom: 8px;
          cursor: pointer;
          border-radius: 4px;
          background-color: #34495e;
          text-align: center;
          font-size: 0.7rem;
          color: white;
          transition: all 0.2s ease;
        }

        .api-category-item:hover {
          background-color: #4a5568;
          transform: translateY(-1px);
        }

        .sidebar-layer {
          background: linear-gradient(180deg, #34495e 0%, #2c3e50 100%);
          color: white;
          height: 100vh;
          position: fixed;
          box-shadow: 2px 0 10px rgba(0,0,0,0.2);
          border-right: 1px solid #4a5568;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .layer-header {
          padding: 16px;
          border-bottom: 2px solid #4a5568;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(90deg, #3498db 0%, #2980b9 100%);
        }

        .layer-title {
          color: white;
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }

        .close-layer-btn {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .close-layer-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .layer-content {
          flex: 1;
          overflow: auto;
        }

        .layer-content::-webkit-scrollbar {
          width: 6px;
        }

        .layer-content::-webkit-scrollbar-track {
          background: #2c3e50;
        }

        .layer-content::-webkit-scrollbar-thumb {
          background: #4a5568;
          border-radius: 3px;
        }

        .layer-content::-webkit-scrollbar-thumb:hover {
          background: #5a6578;
        }

        .category-items {
          padding: 0;
        }

        .category-item {
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid #555;
          transition: background-color 0.2s;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .category-item:hover {
          background-color: #555;
        }

        .block-item {
          transition: all 0.2s ease;
        }

        .block-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .api-block:hover {
          background-color: #4a5568 !important;
          border-color: #3498db !important;
        }

        .group-block:hover {
          background-color: #34495e !important;
          border-color: #3498db !important;
        }

        .basic-block:hover {
          background-color: #4a5568 !important;
          border-color: #3498db !important;
        }

        .mobile-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          z-index: 999;
        }

        @media (max-width: 768px) {
          .sidebar {
            width: 60px;
          }
        }
      `}</style>
    </div>
  );
};

export default DynamicBoardSidebar;