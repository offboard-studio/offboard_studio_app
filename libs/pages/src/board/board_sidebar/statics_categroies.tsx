

import FactoryIcon from '@mui/icons-material/Factory';
import SmartToyIcon from '@mui/icons-material/SmartToy';

const staticCategories = [
  {
    id: 'basic',
    icon: '🔧',
    label: 'Basic Components',
    items: ['constant', 'code', 'aicode', 'input', 'output', 'information'],
  },
  {
    id: 'ai',
    icon: <SmartToyIcon />,
    label: 'AI Components',
    items: [
      'prompt', 'systemPrompt', 'chatLLM', 'structuredOutput', 'classifier', 'translator',
      'embedding', 'vectorSearch', 'ragRetriever', 'memoryStore',
      'aiVision', 'imageCaption', 'aiObjectDetector', 'sceneDescriber',
      'whisper', 'textToSpeech',
      'robotIntentParser', 'voiceCommand', 'agent', 'askUser',
    ],
  },
  {
    id: 'control',
    icon: '⚙️',
    label: 'Control Systems',
    items: ['processing'],
  },
  {
    id: 'vision',
    icon: '📷',
    label: 'Computer Vision',
    items: ['cv', 'yolo', 'tensorrt'],
  },
  {
    id: 'robotics',
    icon: '🤖',
    label: 'Robotics',
    items: ['drivers', 'ros2'],
  },
  {
    id: 'uav',
    icon: '✈️',
    label: 'UAV Components',
    items: ['sensors', 'actuators'],
  },
  {
    id: 'industrial',
    icon: <FactoryIcon />,
    label: 'Industrial Components',
    items: ['modbus', 'snap7', 'canbus'],
  },
  {
    id: 'toolbox',
    icon: '🧰',
    label: 'Toolbox',
    items: ['toolbox'],
  },
  {
    id: 'analytics',
    icon: '📊',
    label: 'Analytics',
    items: ['analytics'],
  },
  {
    id: 'iot',
    icon: '📡',
    label: 'IoT',
    items: ['iot'],
  },
  {
    id: 'media',
    icon: '🎵',
    label: 'Media',
    items: ['media'],
  },
];


export default staticCategories;