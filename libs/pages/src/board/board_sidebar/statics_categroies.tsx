

import FactoryIcon from '@mui/icons-material/Factory';

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
    id: 'computer-vision',
    icon: '📷',
    label: 'Computer Vision',
    items: ['cv', 'yolo', 'tensorrt'],
  },
  {
    id: 'robotics',
    icon: '🤖',
    label: 'Robotics',
    items: ['drivers', 'ros', 'ros2'],
  },
  {
    id: 'uav',
    icon: '✈️',
    label: 'UAV Components',
    items: ['flight-control', 'sensors', 'actuators'],
  },
  {
    id: 'industrial',
    icon: <FactoryIcon />,
    label: 'Industrial Components',
    items: ['modbus', 'snap7', 'canbus'],
  },
];


export default staticCategories;