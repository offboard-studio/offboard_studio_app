/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import './styles.scss';
import {
  Box,
  Button,
  Icon,
  List,
  Typography,
  Slide,
  Fade,
} from '@mui/material';
import SidebarItemCollapse from './SidebarItemCollapse';
import Editor from '@components/core/editor';

import logo from '@assets/logo.png';

import ControlPointIcon from '@mui/icons-material/ControlPoint';
import HandymanIcon from '@mui/icons-material/Handyman';
import CloseIcon from '@mui/icons-material/Close';
import HardwareIcon from '@mui/icons-material/Hardware';
import EngineeringIcon from '@mui/icons-material/Engineering';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

interface BoardSideBarProps {
  editor: Editor;
}

interface SidebarLayer {
  id: string;
  title: string;
  content: React.ReactNode;
  width: string;
}

const BoardSidebar: React.FC<BoardSideBarProps> = (
  props: BoardSideBarProps
) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeLayers, setActiveLayers] = useState<SidebarLayer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubItem, setSelectedSubItem] = useState<string | null>(null);
  

  const categories = [
    {
      id: 'basic',
      icon: <HardwareIcon />,
      label: 'Basic Components',
      items: ['constant', 'code', 'aicode', 'input', 'output', 'information'],
    },
    {
      id: 'control',
      icon: <EngineeringIcon />,
      label: 'Control Systems',
      items: ['processing'],
    },
    {
      id: 'robotics',
      icon: <HandymanIcon />,
      label: 'Robotics',
      items: ['drivers'],
    },
    {
      id: 'px4',
      icon: (
        <img
          src="https://px4.io/wp-content/uploads/2020/03/group-3-1.png"
          style={{ width: '20px', height: '20px' }}
          alt="PX4"
        />
      ),
      label: 'PX4 Components',
      items: ['flight-control', 'sensors', 'actuators'],
    },
  ];

  const setBlock = (type: string) => {
    props.editor.addBlock(type);
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
    const category = categories.find((cat) => cat.id === categoryId);

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
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #555',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#555';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Typography variant="body1" style={{ color: 'white' }}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Typography>
                <ChevronRightIcon
                  style={{ color: '#888', fontSize: '16px', float: 'right' }}
                />
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
              className="block-item"
            >
              <Typography
                variant="body1"
                style={{ color: 'white', fontSize: '1.1em' }}
              >
                {subItem.charAt(0).toUpperCase() + subItem.slice(1)} Block
              </Typography>
            </div>
          </div>
        );

      case 'processing':
        return (
          <div style={{ padding: '8px' }}>
            <SidebarItemCollapse
              blocks={collectionBlocks.processing}
              keyPrefix="processing"
              blocks_label="Processing"
              setBlock={setBlock}
            />
          </div>
        );

      case 'drivers':
        return (
          <div style={{ padding: '8px' }}>
            <SidebarItemCollapse
              blocks={collectionBlocks.drivers}
              keyPrefix="drivers"
              blocks_label="Drivers"
              setBlock={setBlock}
            />
          </div>
        );

      default:
        return (
          <div style={{ padding: '16px' }}>
            <Typography variant="body2" style={{ color: '#ccc' }}>
              Details for {subItem}
            </Typography>
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

    // Reset selections if closing category layer
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
    <div
      className="architecture-sidebar-container"
      style={{ display: 'flex', position: 'relative' }}
    >
      {/* Main Sidebar */}
      <div
        className={`sidebar ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
        style={{
          width: isSidebarCollapsed ? '60px' : '80px',
          background: 'linear-gradient(180deg, #2c3e50 0%, #34495e 100%)',
          color: 'white',
          padding: '8px',
          height: '100vh',
          position: 'fixed',
          zIndex: 1000,
          boxShadow: '2px 0 10px rgba(0,0,0,0.3)',
          borderRight: '1px solid #34495e',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '24px',
            paddingTop: '8px',
          }}
        >
          <img
            src={logo}
            alt="Logo"
            style={{ width: '32px', height: '32px' }}
          />
        </div>

        {/* Categories */}
        <List disablePadding>
          {categories.map((category, index) => (
            <div
              key={category.id}
              className="category-icon"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                padding: '12px',
                cursor: 'pointer',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                backgroundColor:
                  selectedCategory === category.id ? '#3498db' : 'transparent',
                border:
                  selectedCategory === category.id
                    ? '2px solid #5dade2'
                    : '2px solid transparent',
              }}
              onClick={() => handleCategoryClick(category.id)}
              onMouseEnter={(e) => {
                if (selectedCategory !== category.id) {
                  e.currentTarget.style.backgroundColor = '#4a5568';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== category.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title={category.label}
            >
              {category.icon}
            </div>
          ))}
        </List>
      </div>

      {/* Dynamic Layers */}
      {activeLayers.map((layer, index) => (
        <Slide
          key={layer.id}
          direction="right"
          in={true}
          timeout={300}
          style={{ transitionDelay: `${index * 100}ms` }}
        >
          <div
            className="sidebar-layer"
            style={{
              width: layer.width,
              background: 'linear-gradient(180deg, #34495e 0%, #2c3e50 100%)',
              color: 'white',
              height: '100vh',
              position: 'fixed',
              left: calculateLayerLeft(index),
              zIndex: 1000 - index,
              boxShadow: '2px 0 10px rgba(0,0,0,0.2)',
              borderRight: '1px solid #4a5568',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Layer Header */}
            <div
              style={{
                padding: '16px',
                borderBottom: '2px solid #4a5568',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(90deg, #3498db 0%, #2980b9 100%)',
              }}
            >
              <Typography
                variant="h6"
                style={{
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                {layer.title}
              </Typography>
              <CloseIcon
                style={{
                  cursor: 'pointer',
                  fontSize: '20px',
                  opacity: 0.8,
                  transition: 'opacity 0.2s',
                }}
                onClick={() => closeLayer(layer.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
              />
            </div>

            {/* Layer Content */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
              }}
            >
              <Fade in={true} timeout={400}>
                <div>{layer.content}</div>
              </Fade>
            </div>
          </div>
        </Slide>
      ))}

      {/* Overlay for mobile */}
      {activeLayers.length > 0 && isSidebarCollapsed && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999,
          }}
          onClick={() => setActiveLayers([])}
        />
      )}

      <style>{`
        .category-item:hover {
          background-color: #4a5568 !important;
        }

        .block-item {
          padding: 12px;
          cursor: pointer;
          border-radius: 6px;
          margin: 4px 0;
          transition: background-color 0.2s;
        }

        .block-item:hover {
          background-color: #4a5568;
        }

        .sidebar-layer::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-layer::-webkit-scrollbar-track {
          background: #2c3e50;
        }

        .sidebar-layer::-webkit-scrollbar-thumb {
          background: #4a5568;
          border-radius: 3px;
        }

        .sidebar-layer::-webkit-scrollbar-thumb:hover {
          background: #5a6578;
        }
      `}</style>
    </div>
  );
};

export default BoardSidebar;