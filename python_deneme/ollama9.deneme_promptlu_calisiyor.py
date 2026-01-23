import json
import uuid
import time
import logging
import base64
import hashlib
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from openai import OpenAI

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ComponentInfo:
    name: str
    type: str
    description: str
    inputs: List[str]
    outputs: List[str]
    code: Optional[str] = None
    parameters: List[str] = None

class ArchitectureGenerator:
    def __init__(self, ollama_base_url: str = "http://localhost:11434"):
        """Initialize with Ollama client using OpenAI library"""
        self.client = OpenAI(
            base_url=f"https://openrouter.ai/api/v1",
            api_key="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"
        )
        
        # Initialize component library with basic components
        self.component_library = self._initialize_component_library()
    
    def _initialize_component_library(self) -> Dict[str, ComponentInfo]:
        """Initialize library of predefined components"""
        return {
            "camera_input": ComponentInfo(
                name="Camera Input",
                type="basic.code",
                description="Captures video from camera",
                inputs=["Enable"],
                outputs=["Image"],
                code="""import cv2

def main(inputs, outputs, parameters, synchronise):
    cap = cv2.VideoCapture(0)
    auto_enable = False
    try:
        enable = inputs.read_number('Enable')
    except Exception:
        auto_enable = True
    
    try:
        while cap.isOpened() and (auto_enable or inputs.read_number('Enable')):
            ret, frame = cap.read()
            if not ret:
                continue
            outputs.share_image("Image", frame)
            synchronise()
    except Exception as e:
        print('Camera Error:', e)
    finally:
        cap.release()"""
            ),
            "image_blur": ComponentInfo(
                name="Image Blur",
                type="basic.code",
                description="Apply blur effect to image",
                inputs=["Image", "Enable"],
                outputs=["ProcessedImage"],
                parameters=["BlurAmount"],
                code="""import cv2

def main(inputs, outputs, parameters, synchronise):
    blur_amount = int(parameters.read_string("BlurAmount"))
    auto_enable = False
    try:
        enable = inputs.read_number("Enable")
    except Exception:
        auto_enable = True

    while(auto_enable or inputs.read_number('Enable')):
        frame = inputs.read_image("Image")
        if frame is None:
            continue
        
        blurred = cv2.GaussianBlur(frame, (blur_amount, blur_amount), 0)
        outputs.share_image('ProcessedImage', blurred)
        synchronise()"""
            ),
            "edge_detection": ComponentInfo(
                name="Edge Detection",
                type="basic.code",
                description="Detect edges in image",
                inputs=["Image", "Enable"],
                outputs=["ProcessedImage"],
                parameters=["LowThreshold", "HighThreshold"],
                code="""import cv2

def main(inputs, outputs, parameters, synchronise):
    low_thresh = int(parameters.read_string("LowThreshold"))
    high_thresh = int(parameters.read_string("HighThreshold"))
    auto_enable = False
    try:
        enable = inputs.read_number("Enable")
    except Exception:
        auto_enable = True

    while(auto_enable or inputs.read_number('Enable')):
        frame = inputs.read_image("Image")
        if frame is None:
            continue
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, low_thresh, high_thresh)
        edges_bgr = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
        outputs.share_image('ProcessedImage', edges_bgr)
        synchronise()"""
            ),
            "display_output": ComponentInfo(
                name="Display Output",
                type="basic.code",
                description="Display processed image",
                inputs=["ProcessedImage", "Enable"],
                outputs=[],
                code="""import cv2

def main(inputs, outputs, parameters, synchronise):
    auto_enable = False
    try:
        enable = inputs.read_number('Enable')
    except Exception:
        auto_enable = True
    
    while (auto_enable or inputs.read_number('Enable')):
        img = inputs.read_image("ProcessedImage")
        if img is None:
            continue
        cv2.imshow("Output", img)
        cv2.waitKey(10)
        synchronise()"""
            )
        }

    def generate_components_from_prompt(self, user_prompt: str) -> List[ComponentInfo]:
        """Generate custom components based on user prompt using AI"""
        
        component_generation_prompt = f"""You are an expert in visual programming component generation for robotics and computer vision applications.

    User Request: "{user_prompt}"

    Generate ONLY a JSON array of components that follow these STRICT CODING STANDARDS:

    ### MANDATORY CODE STRUCTURE:
    ```python
    def main(inputs, outputs, parameters, synchronise):
        # 1. ALWAYS include auto_enable mechanism
        auto_enable = False
        try:
            enable = inputs.read_number('Enable')
        except Exception:
            auto_enable = True
        
        # 2. Initialize resources BEFORE main loop
        # (ROS nodes, CV captures, models, etc.)
        
        # 3. Main processing loop
        while(auto_enable or inputs.read_number('Enable')):
            # Read inputs with None checks
            data = inputs.read_image("InputName")
            if data is None:
                continue
                
            # Process data
            result = process_function(data)
            
            # Share outputs
            outputs.share_image("OutputName", result)
            
            # ALWAYS call synchronise
            synchronise()
        
        # 4. Cleanup resources (if needed)
    ```

    ### SUPPORTED DATA TYPES:
    - Images: `inputs.read_image("Name")` / `outputs.share_image("Name", data)`
    - Numbers: `inputs.read_number("Name")`  
    - Arrays: `inputs.read_array("Name")`
    - Parameters: `parameters.read_string("Name")`

    ### INTEGRATION PATTERNS:

    **ROS/ROS2 Components:**
    ```python
    import rospy
    from geometry_msgs.msg import Twist

    def main(inputs, outputs, parameters, synchronise):
        rospy.init_node("node_name", anonymous=True)
        topic_name = parameters.read_string("ROSTopic")
        publisher = rospy.Publisher(topic_name, Twist, queue_size=10)
        
        auto_enable = False
        try:
            enable = inputs.read_number('Enable')
        except Exception:
            auto_enable = True
        
        data = Twist()
        while(auto_enable or inputs.read_number('Enable') and not rospy.is_shutdown()):
            msg = inputs.read_array("VelocityCommands")
            if msg is None:
                continue
            data.linear.x = float(msg[0])
            data.angular.z = float(msg[1])
            publisher.publish(data)
            synchronise()
    ```

    **Computer Vision Components:**
    ```python
    import cv2
    import numpy as np

    def main(inputs, outputs, parameters, synchronise):
        auto_enable = False
        try:
            enable = inputs.read_number('Enable')
        except Exception:
            auto_enable = True
        
        # Initialize CV resources
        while(auto_enable or inputs.read_number('Enable')):
            frame = inputs.read_image("Image")
            if frame is None:
                continue
            # Process frame
            processed = cv2.GaussianBlur(frame, (15, 15), 0)
            outputs.share_image("ProcessedImage", processed)
            synchronise()
    ```

    **Camera Input Components:**
    ```python
    import cv2

    def main(inputs, outputs, parameters, synchronise):
        cap = cv2.VideoCapture(0)
        auto_enable = False
        try:
            enable = inputs.read_number('Enable')
        except Exception:
            auto_enable = True
        
        try:
            while cap.isOpened() and (auto_enable or inputs.read_number('Enable')):
                ret, frame = cap.read()
                if not ret:
                    continue
                outputs.share_image("Image", frame)
                synchronise()
        except Exception as e:
            print('Camera Error:', e)
        finally:
            cap.release()
    ```

    **Deep Learning Components:**
    ```python
    import cv2
    import numpy as np

    def main(inputs, outputs, parameters, synchronise):
        auto_enable = False
        try:
            enable = inputs.read_number('Enable')
        except Exception:
            auto_enable = True
        
        # Load model ONCE before loop
        whT = 320
        modelConfiguration = parameters.read_string("ConfigPath")
        modelWeights = parameters.read_string("WeightsPath")
        net = cv2.dnn.readNetFromDarknet(modelConfiguration, modelWeights)
        net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
        net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
        
        while(auto_enable or inputs.read_number('Enable')):
            frame = inputs.read_image("Image")
            if frame is None:
                continue
            
            # Convert to blob and process
            blob = cv2.dnn.blobFromImage(frame, 1/255, (whT, whT), [0,0,0], 1, crop=False)
            net.setInput(blob)
            layerNames = net.getLayerNames()
            outputNames = [layerNames[i[0] - 1] for i in net.getUnconnectedOutLayers()]
            results = net.forward(outputNames)
            
            # Process results (add detection logic)
            outputs.share_image("DetectionResult", frame)
            synchronise()
    ```

    **Display Components:**
    ```python
    import cv2

    def main(inputs, outputs, parameters, synchronise):
        auto_enable = False
        try:
            enable = inputs.read_number('Enable')
        except Exception:
            auto_enable = True
        
        while (auto_enable or inputs.read_number('Enable')):
            img = inputs.read_image("ProcessedImage")
            if img is None:
                continue
            cv2.imshow("Output", img)
            cv2.waitKey(10)
            synchronise()
    ```

    ### COMPONENT CATEGORIES:

    1. **Input Components** (type: "basic.input"):
    - Camera capture, file readers, sensor data
    - Always include resource initialization and cleanup

    2. **Processing Components** (type: "basic.code"):  
    - Image processing, AI inference, data transformation
    - Include proper error handling and parameter validation

    3. **Output Components** (type: "basic.output"):
    - Display, file writers, ROS publishers, actuator control
    - Include proper resource management

    4. **Control Components** (type: "basic.code"):
    - Logic gates, data routers, condition checkers

    ### PARAMETER EXAMPLES:
    - "ROSTopic" for ROS publishers/subscribers
    - "ConfigPath", "WeightsPath" for AI models
    - "BlurAmount", "KernelSize" for image processing
    - "Threshold", "MinArea" for detection algorithms
    - "VelocityLimit", "AccelerationLimit" for motor control

    ### PIPELINE EXAMPLES:

    **Computer Vision Pipeline:**
    1. Camera Input → Image processing → Display Output
    2. File Reader → Object Detection → Result Display
    3. Video Input → Feature Detection → Tracking Output

    **Robotics Pipeline:**  
    1. Sensor Input → Control Logic → Motor Driver
    2. Vision Input → Object Detection → Navigation Control
    3. Manual Input → Path Planning → Actuator Control

    Generate 2-5 components that form a complete, working pipeline following these patterns EXACTLY.

    Required JSON format:
    [
    {{
        "name": "Component Name",
        "type": "basic.code|basic.input|basic.output",
        "description": "Brief description",
        "inputs": ["Input1", "Input2"],
        "outputs": ["Output1"], 
        "parameters": ["Param1", "Param2"],
        "code": "# Complete working Python code following the standards above"
    }}
    ]

    CRITICAL REQUIREMENTS:
    - Use the EXACT main() function signature
    - Include auto_enable mechanism in ALL components  
    - Add proper None checks for all inputs
    - Call synchronise() in every loop iteration
    - Use real library functions (cv2, rospy, numpy)
    - Handle resource initialization and cleanup
    - Include realistic parameter defaults
    - Make code production-ready, not pseudocode
    - Follow the exact patterns shown in examples above

    Respond with ONLY the JSON array, no explanation."""

        try:
            logger.info("Generating custom components with AI...")
            
            response = self.client.chat.completions.create(
                model="deepseek/deepseek-chat-v3-0324:free",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a computer vision and robotics expert. Generate only valid JSON arrays for visual programming components. Follow the exact coding standards and patterns provided."
                    },
                    {"role": "user", "content": component_generation_prompt}
                ],
                temperature=0.4,
                max_tokens=4096
            )
            
            # Clean and parse JSON
            json_text = response.choices[0].message.content.strip()
            
            if json_text.startswith("```json"):
                json_text = json_text[7:-3]
            elif json_text.startswith("```"):
                json_text = json_text[3:-3]
            
            components_data = json.loads(json_text)
            
            # Convert to ComponentInfo objects
            components = []
            for comp_data in components_data:
                component = ComponentInfo(
                    name=comp_data.get("name", "Unknown"),
                    type=comp_data.get("type", "basic.code"),
                    description=comp_data.get("description", ""),
                    inputs=comp_data.get("inputs", []),
                    outputs=comp_data.get("outputs", []),
                    code=comp_data.get("code"),
                    parameters=comp_data.get("parameters", [])
                )
                components.append(component)
            
            logger.info(f"Generated {len(components)} custom components")
            for comp in components:
                logger.info(f"  - {comp.name}: {comp.type}")
            
            return components
            
        except Exception as e:
            logger.error(f"Failed to generate components: {e}")
            # Fallback to predefined components
            return self.get_fallback_components(user_prompt)

    def get_fallback_components(self, prompt: str) -> List[ComponentInfo]:
        """Fallback components if AI generation fails"""
        logger.info("Using fallback components")
        
        prompt_lower = prompt.lower()
        components = []
        
        # Determine component type based on prompt keywords
        if any(word in prompt_lower for word in ["robot", "arm", "joint", "kinematics"]):
            # Robotics pipeline
            components = [
                ComponentInfo(
                    name="Joint State Publisher",
                    type="basic.code",
                    description="Publishes joint states for robot arm",
                    inputs=["Enable"],
                    outputs=["JointStates"],
                    parameters=["JointNames", "DefaultPositions"],
                    code="""import numpy as np
import time

def main(inputs, outputs, parameters, synchronise):
    joint_names = parameters.read_string("JointNames").split(',')
    default_pos = [float(x) for x in parameters.read_string("DefaultPositions").split(',')]
    
    auto_enable = False
    try:
        enable = inputs.read_number('Enable')
    except Exception:
        auto_enable = True
    
    t = 0
    while auto_enable or inputs.read_number('Enable'):
        # Simple sinusoidal movement
        positions = [pos + 0.5 * np.sin(t + i) for i, pos in enumerate(default_pos)]
        
        joint_state = {
            'names': joint_names,
            'positions': positions,
            'velocities': [0.0] * len(joint_names),
            'efforts': [0.0] * len(joint_names)
        }
        
        outputs.share_data('JointStates', joint_state)
        t += 0.1
        time.sleep(0.1)
        synchronise()"""
                ),
                ComponentInfo(
                    name="Forward Kinematics",
                    type="basic.code",
                    description="Calculate forward kinematics for RRR arm",
                    inputs=["JointStates"],
                    outputs=["EndEffectorPose"],
                    parameters=["LinkLengths"],
                    code="""import numpy as np

def main(inputs, outputs, parameters, synchronise):
    link_lengths = [float(x) for x in parameters.read_string("LinkLengths").split(',')]
    
    while True:
        joint_state = inputs.read_data("JointStates")
        if joint_state is None:
            continue
            
        positions = joint_state['positions']
        if len(positions) < 3:
            continue
            
        # Forward kinematics for RRR arm
        q1, q2, q3 = positions[:3]
        L1, L2, L3 = link_lengths[:3]
        
        # Calculate end effector position
        x = L1*np.cos(q1) + L2*np.cos(q1+q2) + L3*np.cos(q1+q2+q3)
        y = L1*np.sin(q1) + L2*np.sin(q1+q2) + L3*np.sin(q1+q2+q3)
        theta = q1 + q2 + q3
        
        pose = {'x': x, 'y': y, 'theta': theta}
        outputs.share_data('EndEffectorPose', pose)
        synchronise()"""
                ),
                ComponentInfo(
                    name="Pose Visualizer",
                    type="basic.code",
                    description="Visualize robot arm pose",
                    inputs=["EndEffectorPose"],
                    outputs=[],
                    code="""import matplotlib.pyplot as plt
import numpy as np

def main(inputs, outputs, parameters, synchronise):
    plt.ion()
    fig, ax = plt.subplots()
    
    while True:
        pose = inputs.read_data("EndEffectorPose")
        if pose is None:
            continue
            
        ax.clear()
        ax.set_xlim(-3, 3)
        ax.set_ylim(-3, 3)
        ax.grid(True)
        
        # Plot end effector position
        ax.plot(pose['x'], pose['y'], 'ro', markersize=10, label='End Effector')
        ax.arrow(pose['x'], pose['y'], 0.2*np.cos(pose['theta']), 
                0.2*np.sin(pose['theta']), head_width=0.05, head_length=0.05, fc='r', ec='r')
        
        ax.legend()
        ax.set_title('Robot Arm End Effector Position')
        plt.pause(0.01)
        synchronise()"""
                )
            ]
        else:
            # Computer vision pipeline (default)
            components = [
                self.component_library["camera_input"]
            ]
            
            # Add processing based on prompt
            if any(word in prompt_lower for word in ["blur", "smooth"]):
                components.append(self.component_library["image_blur"])
            elif any(word in prompt_lower for word in ["edge", "detect"]):
                components.append(self.component_library["edge_detection"])
            else:
                components.append(self.component_library["image_blur"])  # Default processing
            
            components.append(self.component_library["display_output"])
        
        return components

    def enhance_architecture(self, base_architecture: Dict[str, Any], prompt: str) -> Dict[str, Any]:
        """Enhance the architecture with proper structure and IDs"""
        
        # Generate custom components based on prompt
        components_needed = self.generate_components_from_prompt(prompt)
        
        # Create base structure
        enhanced = {
            "editor": {
                "id": self.create_unique_id(),
                "offsetX": 163,
                "offsetY": 97,
                "zoom": 100,
                "gridSize": 0,
                "layers": []
            },
            "version": "3.0",
            "package": {
                "name": "",
                "version": "",
                "description": "",
                "author": "",
                "image": ""
            },
            "design": {
                "board": "Python3-Noetic",
                "graph": {
                    "blocks": [],
                    "wires": []
                }
            },
            "dependencies": {}
        }
        
        # Create layers
        links_layer = {
            "id": self.create_unique_id(),
            "type": "diagram-links",
            "isSvg": True,
            "transformed": True,
            "models": {}
        }
        
        nodes_layer = {
            "id": self.create_unique_id(),
            "type": "diagram-nodes",
            "isSvg": False,
            "transformed": True,
            "models": {}
        }
        
        # Generate components and connections
        x_offset = 400
        y_offset = 150
        spacing = 300
        
        node_models = {}
        component_deps = {}
        
        for i, comp_info in enumerate(components_needed):
            # Generate unique IDs
            node_id = self.create_unique_id()
            
            # Create dependency ID
            dep_id = self.create_component_dependency_id()
            
            # Position calculation
            x_pos = x_offset + (i * spacing)
            y_pos = y_offset + (50 if i % 2 == 0 else 0)
            
            # Create node model
            node_model = self.create_node_model(node_id, comp_info, x_pos, y_pos, dep_id)
            node_models[node_id] = node_model
            nodes_layer["models"][node_id] = node_model
            
            # Create design graph block
            graph_block = {
                "id": node_id,
                "type": dep_id,
                "data": {},
                "position": {"x": x_pos, "y": y_pos}
            }
            enhanced["design"]["graph"]["blocks"].append(graph_block)
            
            # Create dependency
            component_deps[dep_id] = self.create_component_dependency(comp_info)
        
        # Create intelligent connections between components
        connections = self.create_connections(node_models, components_needed)
        
        # Add connections to links layer
        for conn in connections:
            links_layer["models"][conn["id"]] = conn
            
            # Add to graph wires
            source_node = node_models[conn["source"]]
            target_node = node_models[conn["target"]]
            
            # Find port labels
            source_port_label = self.find_port_label(source_node, conn["sourcePort"])
            target_port_label = self.find_port_label(target_node, conn["targetPort"])
            
            enhanced["design"]["graph"]["wires"].append({
                "source": {
                    "block": conn["source"],
                    "port": conn["sourcePort"],
                    "name": source_port_label
                },
                "target": {
                    "block": conn["target"],
                    "port": conn["targetPort"],
                    "name": target_port_label
                }
            })
        
        # Add layers
        enhanced["editor"]["layers"] = [links_layer, nodes_layer]
        enhanced["dependencies"] = component_deps
        
        return enhanced

    def create_connections(self, node_models: Dict[str, Any], component_infos: List[ComponentInfo]) -> List[Dict[str, Any]]:
        """Create intelligent connections between ALL compatible ports of components - ENHANCED VERSION"""
        connections = []
        node_list = list(node_models.keys())
        
        logger.info(f"🔗 Creating COMPLETE auto-connections between {len(node_list)} components")
        
        # Extract detailed port information from each node
        port_mappings = {}
        for node_id, node_model in node_models.items():
            port_mappings[node_id] = {
                "input_ports": [],
                "output_ports": [],
                "parameter_ports": []
            }
            
            for port in node_model.get("ports", []):
                port_info = {
                    "id": port["id"],
                    "name": port["name"],
                    "label": port["label"],
                    "type": port["type"],
                    "x": port["x"],
                    "y": port["y"],
                    "connected": False  # Track if port is already connected
                }
                
                if port["in"]:
                    if "parameter" in port["type"]:
                        port_mappings[node_id]["parameter_ports"].append(port_info)
                    else:
                        port_mappings[node_id]["input_ports"].append(port_info)
                else:
                    port_mappings[node_id]["output_ports"].append(port_info)
        
        # ENHANCED: Connect ALL compatible ports between consecutive components
        for i in range(len(node_list) - 1):
            source_node_id = node_list[i]
            target_node_id = node_list[i + 1]
            
            source_info = port_mappings[source_node_id]
            target_info = port_mappings[target_node_id]
            
            logger.info(f"🔄 Connecting Block {i} → Block {i+1}")
            logger.info(f"   Source outputs: {[p['label'] for p in source_info['output_ports']]}")
            logger.info(f"   Target inputs: {[p['label'] for p in target_info['input_ports']]}")
            
            # Try to connect EVERY output port to compatible input ports
            connections_made = 0
            for source_port in source_info["output_ports"]:
                if source_port["connected"]:
                    continue
                    
                # Find ALL compatible target ports for this source port
                compatible_targets = []
                for target_port in target_info["input_ports"]:
                    if not target_port["connected"] and self.ports_are_compatible(source_port["label"], target_port["label"]):
                        compatibility_score = self.calculate_port_compatibility_score(source_port["label"], target_port["label"])
                        compatible_targets.append((target_port, compatibility_score))
                
                # Sort by compatibility score (highest first)
                compatible_targets.sort(key=lambda x: x[1], reverse=True)
                
                # Connect to the best compatible target
                if compatible_targets:
                    target_port = compatible_targets[0][0]
                    connection_id = self.create_unique_id()
                    
                    # Calculate proper connection points
                    source_x = source_port["x"]
                    source_y = source_port["y"]
                    target_x = target_port["x"]
                    target_y = target_port["y"]
                    
                    connection = {
                        "id": connection_id,
                        "type": "default",
                        "selected": False,
                        "source": source_node_id,
                        "sourcePort": source_port["id"],
                        "target": target_node_id,
                        "targetPort": target_port["id"],
                        "points": [
                            {
                                "id": self.create_unique_id(),
                                "type": "point",
                                "x": source_x + 20,
                                "y": source_y
                            },
                            {
                                "id": self.create_unique_id(),
                                "type": "point",
                                "x": target_x - 20,
                                "y": target_y
                            }
                        ],
                        "labels": [],
                        "width": 3,
                        "color": "gray",
                        "curvyness": 50,
                        "selectedColor": "rgb(0,192,255)"
                    }
                    
                    connections.append(connection)
                    connections_made += 1
                    
                    # Mark ports as connected
                    source_port["connected"] = True
                    target_port["connected"] = True
                    
                    # Update port links in node models
                    self.update_port_links(node_models, source_node_id, source_port["id"], connection_id)
                    self.update_port_links(node_models, target_node_id, target_port["id"], connection_id)
                    
                    logger.info(f"   ✅ Connected: {source_port['label']} → {target_port['label']} (score: {compatible_targets[0][1]:.2f})")
            
            logger.info(f"   📊 Made {connections_made} connections between blocks {i} and {i+1}")
        
        # BONUS: Try to connect any remaining unconnected compatible ports across non-consecutive blocks
        self.create_cross_connections(node_models, port_mappings, connections, node_list)
        
        logger.info(f"🎯 Total connections created: {len(connections)}")
        return connections

    def calculate_port_compatibility_score(self, source_label: str, target_label: str) -> float:
        """Calculate compatibility score between two ports (0.0 to 1.0)"""
        source_lower = source_label.lower()
        target_lower = target_label.lower()
        
        # Perfect match
        if source_lower == target_lower:
            return 1.0
        
        # High compatibility mappings
        high_compatibility = {
            "image": ["frame", "img", "processedimage", "processed_image"],
            "frame": ["image", "img", "processedimage", "processed_image"],
            "jointstates": ["states", "robot_state", "endeffectorpose"],
            "endeffectorpose": ["pose", "position", "location"],
            "processedimage": ["image", "img", "frame"],
            "processed_image": ["image", "img", "frame"],
            "enable": ["trigger", "start", "activate"]
        }
        
        # Medium compatibility patterns
        medium_patterns = [
            ("output", "input"),
            ("result", "data"),
            ("processed", "input"),
            ("detection", "object"),
            ("state", "status")
        ]
        
        # Check high compatibility
        for key, compatible_list in high_compatibility.items():
            if key in source_lower:
                for comp in compatible_list:
                    if comp in target_lower:
                        return 0.9
        
        # Check medium compatibility
        for source_pattern, target_pattern in medium_patterns:
            if source_pattern in source_lower and target_pattern in target_lower:
                return 0.7
        
        # Generic output-to-input compatibility
        if any(word in source_lower for word in ["out", "result", "output"]) and \
           any(word in target_lower for word in ["in", "input", "data"]):
            return 0.5
        
        return 0.0

    def create_cross_connections(self, node_models: Dict[str, Any], port_mappings: Dict[str, Any], 
                               existing_connections: List[Dict[str, Any]], node_list: List[str]):
        """Create additional connections between non-consecutive blocks for better connectivity"""
        logger.info("🔗 Creating cross-connections for unconnected ports...")
        
        cross_connections_made = 0
        
        # Look for unconnected output ports
        for i, source_node_id in enumerate(node_list):
            source_info = port_mappings[source_node_id]
            
            for source_port in source_info["output_ports"]:
                if source_port["connected"]:
                    continue
                
                # Try to connect to ANY compatible input port in subsequent blocks
                best_target = None
                best_score = 0.0
                best_target_node = None
                
                for j, target_node_id in enumerate(node_list):
                    if j <= i:  # Skip same and previous blocks
                        continue
                        
                    target_info = port_mappings[target_node_id]
                    
                    for target_port in target_info["input_ports"]:
                        if target_port["connected"]:
                            continue
                            
                        score = self.calculate_port_compatibility_score(source_port["label"], target_port["label"])
                        if score > best_score and score >= 0.5:  # Minimum threshold for cross-connections
                            best_score = score
                            best_target = target_port
                            best_target_node = target_node_id
                
                # Create cross-connection if we found a good match
                if best_target and best_score >= 0.5:
                    connection_id = self.create_unique_id()
                    
                    connection = {
                        "id": connection_id,
                        "type": "default",
                        "selected": False,
                        "source": source_node_id,
                        "sourcePort": source_port["id"],
                        "target": best_target_node,
                        "targetPort": best_target["id"],
                        "points": [
                            {
                                "id": self.create_unique_id(),
                                "type": "point",
                                "x": source_port["x"] + 20,
                                "y": source_port["y"]
                            },
                            {
                                "id": self.create_unique_id(),
                                "type": "point",
                                "x": best_target["x"] - 20,
                                "y": best_target["y"]
                            }
                        ],
                        "labels": [],
                        "width": 3,
                        "color": "orange",  # Different color for cross-connections
                        "curvyness": 50,
                        "selectedColor": "rgb(0,192,255)"
                    }
                    
                    existing_connections.append(connection)
                    cross_connections_made += 1
                    
                    # Mark ports as connected
                    source_port["connected"] = True
                    best_target["connected"] = True
                    
                    # Update port links
                    self.update_port_links(node_models, source_node_id, source_port["id"], connection_id)
                    self.update_port_links(node_models, best_target_node, best_target["id"], connection_id)
                    
                    logger.info(f"   🌉 Cross-connected: {source_port['label']} → {best_target['label']} (score: {best_score:.2f})")
        
        logger.info(f"🌉 Created {cross_connections_made} cross-connections")

    def ports_are_compatible(self, source_label: str, target_label: str) -> bool:
        """Enhanced port compatibility checking with comprehensive mappings"""
        source_lower = source_label.lower()
        target_lower = target_label.lower()
        
        # Direct match (strongest)
        if source_lower == target_lower:
            return True
        
        # Comprehensive compatibility mappings
        compatibility_mappings = {
            # Image/Video data flow
            "image": ["image", "img", "frame", "processedimage", "processed_image", "input"],
            "frame": ["frame", "image", "img", "processedimage", "processed_image", "input"],
            "processedimage": ["processedimage", "processed_image", "image", "img", "frame", "input"],
            "processed_image": ["processed_image", "processedimage", "image", "img", "frame", "input"],
            
            # Robot/Control data flow
            "jointstates": ["jointstates", "joint_states", "states", "robot_state", "pose"],
            "joint_states": ["joint_states", "jointstates", "states", "robot_state", "pose"],
            "endeffectorpose": ["endeffectorpose", "end_effector_pose", "pose", "position", "location"],
            "end_effector_pose": ["end_effector_pose", "endeffectorpose", "pose", "position", "location"],
            "pose": ["pose", "position", "endeffectorpose", "end_effector_pose", "location"],
            
            # Enable/Control signals
            "enable": ["enable", "trigger", "start", "activate", "run", "input"],
            
            # Generic data types
            "data": ["data", "input", "output", "result", "information"],
            "output": ["output", "result", "data", "input"],
            "input": ["input", "data", "frame", "image", "enable"]
        }
        
        # Check category-based compatibility
        for source_key, compatible_list in compatibility_mappings.items():
            if source_key in source_lower:
                for compatible_term in compatible_list:
                    if compatible_term in target_lower:
                        return True
        
        # Reverse check (target to source)
        for target_key, compatible_list in compatibility_mappings.items():
            if target_key in target_lower:
                for compatible_term in compatible_list:
                    if compatible_term in source_lower:
                        return True
        
        # Pattern-based compatibility
        pattern_matches = [
            # Output to input patterns
            ("out" in source_lower and "in" in target_lower),
            ("result" in source_lower and "input" in target_lower),
            ("output" in source_lower and "data" in target_lower),
            # Image processing patterns
            ("img" in source_lower and "img" in target_lower),
            ("image" in source_lower and "frame" in target_lower),
            # State patterns
            ("state" in source_lower and "pose" in target_lower),
            ("pose" in source_lower and "position" in target_lower)
        ]
        
        return any(pattern_matches)

    def create_node_model(self, node_id: str, comp_info: ComponentInfo, x: int, y: int, dep_id: str) -> Dict[str, Any]:
        """Create a complete node model with inner model structure"""
        
        ports = []
        port_y_offset = 16
        
        # Create input ports
        for i, input_name in enumerate(comp_info.inputs):
            port_id = self.create_unique_id()
            ports.append({
                "id": port_id,
                "type": "port.input",
                "x": x + 1,
                "y": y + port_y_offset + (i * 41.5),
                "name": self.create_unique_id(),
                "alignment": "left",
                "parentNode": node_id,
                "links": [],
                "in": True,
                "label": input_name,
                "hideLabel": False
            })
        
        # Create output ports
        for i, output_name in enumerate(comp_info.outputs):
            port_id = self.create_unique_id()
            ports.append({
                "id": port_id,
                "type": "port.output",
                "x": x + 113,
                "y": y + port_y_offset + ((len(comp_info.inputs) + i) * 21),
                "name": self.create_unique_id(),
                "alignment": "right",
                "parentNode": node_id,
                "links": [],
                "in": False,
                "label": output_name,
                "hideLabel": False
            })
        
        # Create parameter ports
        for i, param_name in enumerate(comp_info.parameters or []):
            port_id = self.create_unique_id()
            ports.append({
                "id": port_id,
                "type": "port.parameter",
                "x": x + 57 + (i * 100),
                "y": y - 30,
                "name": self.create_unique_id(),
                "alignment": "top",
                "parentNode": node_id,
                "links": [],
                "in": True,
                "label": param_name,
                "hideLabel": False
            })
        
        # Create complete inner model
        inner_model = self.create_complete_inner_model(comp_info)
        
        return {
            "id": node_id,
            "type": "block.package",
            "selected": False,
            "x": x,
            "y": y,
            "ports": ports,
            "data": {},
            "model": inner_model,
            "info": {
                "name": comp_info.name,
                "version": "2.0.0",
                "description": comp_info.description,
                "author": "AI Generated",
                "image": ""
            },
            "design": {
                "board": "Python3-Noetic",
                "graph": {
                    "blocks": self.create_design_blocks(comp_info),
                    "wires": self.create_design_wires(comp_info)
                }
            },
            "dependencies": {}
        }

    def create_complete_inner_model(self, comp_info: ComponentInfo) -> Dict[str, Any]:
        """Create complete inner model with all required layers and models"""
        
        # Create inner nodes
        inner_nodes = {}
        inner_connections = []
        
        # Input nodes
        for i, input_name in enumerate(comp_info.inputs):
            input_id = self.create_unique_id()
            port_id = self.create_unique_id()
            
            inner_nodes[input_id] = {
                "id": input_id,
                "type": "basic.input",
                "selected": False,
                "x": 200,
                "y": 300 + (i * 150),
                "ports": [{
                    "id": port_id,
                    "type": "port.output",
                    "x": 286,
                    "y": 319 + (i * 150),
                    "name": "input-out",
                    "alignment": "right",
                    "parentNode": self.create_unique_id(),
                    "links": [],
                    "in": False,
                    "label": input_name,
                    "hideLabel": True
                }],
                "data": {"name": input_name}
            }
        
        # Main code block
        if comp_info.code:
            code_id = self.create_unique_id()
            code_ports = []
            
            # Input ports for code
            for i, input_name in enumerate(comp_info.inputs):
                code_ports.append({
                    "id": self.create_unique_id(),
                    "type": "port.input",
                    "x": 500,
                    "y": 350 + (i * 50),
                    "name": input_name,
                    "alignment": "left",
                    "parentNode": self.create_unique_id(),
                    "links": [],
                    "in": True,
                    "label": input_name,
                    "hideLabel": False
                })
            
            # Output ports for code
            for i, output_name in enumerate(comp_info.outputs):
                code_ports.append({
                    "id": self.create_unique_id(),
                    "type": "port.output",
                    "x": 900,
                    "y": 350 + (i * 50),
                    "name": output_name,
                    "alignment": "right",
                    "parentNode": self.create_unique_id(),
                    "links": [],
                    "in": False,
                    "label": output_name,
                    "hideLabel": False
                })
            
            # Parameter ports for code
            for i, param_name in enumerate(comp_info.parameters or []):
                code_ports.append({
                    "id": self.create_unique_id(),
                    "type": "port.parameter",
                    "x": 700 + (i * 100),
                    "y": 280,
                    "name": param_name,
                    "alignment": "top",
                    "parentNode": self.create_unique_id(),
                    "links": [],
                    "in": True,
                    "label": param_name,
                    "hideLabel": False
                })
            
            inner_nodes[code_id] = {
                "id": code_id,
                "type": "basic.code",
                "selected": False,
                "x": 488,
                "y": 200,
                "ports": code_ports,
                "data": {
                    "code": comp_info.code,
                    "frequency": "30",
                    "params": [{"name": p} for p in (comp_info.parameters or [])],
                    "ports": {
                        "in": [{"name": inp} for inp in comp_info.inputs],
                        "out": [{"name": out} for out in comp_info.outputs]
                    },
                    "size": {"width": "700px", "height": "500px"}
                }
            }
        
        # Output nodes
        for i, output_name in enumerate(comp_info.outputs):
            output_id = self.create_unique_id()
            port_id = self.create_unique_id()
            
            inner_nodes[output_id] = {
                "id": output_id,
                "type": "basic.output",
                "selected": False,
                "x": 1200,
                "y": 300 + (i * 150),
                "ports": [{
                    "id": port_id,
                    "type": "port.input",
                    "x": 1201,
                    "y": 319 + (i * 150),
                    "name": "output-in",
                    "alignment": "left",
                    "parentNode": self.create_unique_id(),
                    "links": [],
                    "in": True,
                    "label": "output-in",
                    "hideLabel": True
                }],
                "data": {"name": output_name}
            }
        
        # Constant nodes for parameters
        for i, param_name in enumerate(comp_info.parameters or []):
            const_id = self.create_unique_id()
            port_id = self.create_unique_id()
            default_value = "5,5" if "kernel" in param_name.lower() else "Gaussian" if "type" in param_name.lower() else "100"
            
            inner_nodes[const_id] = {
                "id": const_id,
                "type": "basic.constant",
                "selected": False,
                "x": 650 + (i * 200),
                "y": 100,
                "ports": [{
                    "id": port_id,
                    "type": "port.output",
                    "x": 703 + (i * 200),
                    "y": 200,
                    "name": "constant-out",
                    "alignment": "bottom",
                    "parentNode": self.create_unique_id(),
                    "links": [],
                    "in": False,
                    "label": param_name,
                    "hideLabel": True
                }],
                "data": {
                    "name": param_name,
                    "value": default_value,
                    "local": True
                }
            }
        
        # Create inner connections
        inner_connections = self.create_inner_connections(inner_nodes, comp_info)
        
        # Create layers
        links_layer = {
            "id": self.create_unique_id(),
            "type": "diagram-links",
            "isSvg": True,
            "transformed": True,
            "models": {conn["id"]: conn for conn in inner_connections}
        }
        
        nodes_layer = {
            "id": self.create_unique_id(),
            "type": "diagram-nodes",
            "isSvg": False,
            "transformed": True,
            "models": inner_nodes
        }
        
        return {
            "id": self.create_unique_id(),
            "locked": False,
            "offsetX": 0,
            "offsetY": 0,
            "zoom": 100,
            "gridSize": 0,
            "layers": [links_layer, nodes_layer]
        }

    def create_component_dependency(self, comp_info: ComponentInfo) -> Dict[str, Any]:
        """Create component dependency structure with complete inner model"""
        
        # Create inner model with proper structure
        inner_models = {}
        inner_connections = []
        
        # Create input models
        for i, input_name in enumerate(comp_info.inputs):
            input_id = self.create_unique_id()
            inner_models[input_id] = {
                "id": input_id,
                "type": "basic.input",
                "selected": False,
                "x": 300,
                "y": 300 + (i * 150),
                "ports": [{
                    "id": self.create_unique_id(),
                    "type": "port.output",
                    "x": 386,
                    "y": 319 + (i * 150),
                    "name": "input-out",
                    "alignment": "right",
                    "parentNode": self.create_unique_id(),
                    "links": [],
                    "in": False,
                    "label": input_name,
                    "hideLabel": True
                }],
                "data": {"name": input_name}
            }
        
        # Create main code block
        if comp_info.code:
            code_id = self.create_unique_id()
            code_ports = []
            
            # Add input ports
            for i, input_name in enumerate(comp_info.inputs):
                code_ports.append({
                    "id": self.create_unique_id(),
                    "type": "port.input",
                    "x": 500,
                    "y": 350 + (i * 50),
                    "name": input_name,
                    "alignment": "left",
                    "parentNode": self.create_unique_id(),
                    "links": [],
                    "in": True,
                    "label": input_name,
                    "hideLabel": False
                })
            
            # Add output ports
            for i, output_name in enumerate(comp_info.outputs):
                code_ports.append({
                    "id": self.create_unique_id(),
                    "type": "port.output",
                    "x": 900,
                    "y": 350 + (i * 50),
                    "name": output_name,
                    "alignment": "right",
                    "parentNode": self.create_unique_id(),
                    "links": [],
                    "in": False,
                    "label": output_name,
                    "hideLabel": False
                })
            
            # Add parameter ports
            for i, param_name in enumerate(comp_info.parameters or []):
                code_ports.append({
                    "id": self.create_unique_id(),
                    "type": "port.parameter",
                    "x": 700 + (i * 100),
                    "y": 280,
                    "name": param_name,
                    "alignment": "top",
                    "parentNode": self.create_unique_id(),
                    "links": [],
                    "in": True,
                    "label": param_name,
                    "hideLabel": False
                })
            
            inner_models[code_id] = {
                "id": code_id,
                "type": "basic.code",
                "selected": False,
                "x": 488,
                "y": 200,
                "ports": code_ports,
                "data": {
                    "code": comp_info.code,
                    "frequency": "30",
                    "params": [{"name": p} for p in (comp_info.parameters or [])],
                    "ports": {
                        "in": [{"name": inp} for inp in comp_info.inputs],
                        "out": [{"name": out} for out in comp_info.outputs]
                    },
                    "size": {"width": "700px", "height": "500px"}
                }
            }
        
        # Create output models
        for i, output_name in enumerate(comp_info.outputs):
            output_id = self.create_unique_id()
            inner_models[output_id] = {
                "id": output_id,
                "type": "basic.output",
                "selected": False,
                "x": 1200,
                "y": 300 + (i * 150),
                "ports": [{
                    "id": self.create_unique_id(),
                    "type": "port.input",
                    "x": 1201,
                    "y": 319 + (i * 150),
                    "name": "output-in",
                    "alignment": "left",
                    "parentNode": self.create_unique_id(),
                    "links": [],
                    "in": True,
                    "label": "output-in",
                    "hideLabel": True
                }],
                "data": {"name": output_name}
            }
        
        # Create constants for parameters
        for i, param_name in enumerate(comp_info.parameters or []):
            const_id = self.create_unique_id()
            default_value = "5,5" if "kernel" in param_name.lower() else "Gaussian" if "type" in param_name.lower() else "100"
            
            inner_models[const_id] = {
                "id": const_id,
                "type": "basic.constant",
                "selected": False,
                "x": 650 + (i * 200),
                "y": 100,
                "ports": [{
                    "id": self.create_unique_id(),
                    "type": "port.output",
                    "x": 703 + (i * 200),
                    "y": 200,
                    "name": "constant-out",
                    "alignment": "bottom",
                    "parentNode": self.create_unique_id(),
                    "links": [],
                    "in": False,
                    "label": param_name,
                    "hideLabel": True
                }],
                "data": {
                    "name": param_name,
                    "value": default_value,
                    "local": True
                }
            }
        
        # Create inner connections between models
        inner_connections = self.create_inner_connections(inner_models, comp_info)
        
        # Create complete dependency structure
        return {
            "package": {
                "name": comp_info.name,
                "version": "2.0.0",
                "description": comp_info.description,
                "author": "AI Generated",
                "image": ""
            },
            "design": {
                "board": "Python3-Noetic",
                "graph": {
                    "blocks": self.create_design_blocks(comp_info),
                    "wires": self.create_design_wires(comp_info)
                }
            },
            "dependencies": {}
        }

    def create_design_blocks(self, comp_info: ComponentInfo) -> List[Dict[str, Any]]:
        """Create design blocks for the component"""
        blocks = []
        
        # Input blocks
        for i, input_name in enumerate(comp_info.inputs):
            blocks.append({
                "id": self.create_unique_id(),
                "type": "basic.input",
                "data": {"name": input_name},
                "position": {"x": 300, "y": 300 + (i * 100)}
            })
        
        # Code block
        if comp_info.code:
            blocks.append({
                "id": self.create_unique_id(),
                "type": "basic.code",
                "data": {
                    "code": comp_info.code,
                    "frequency": "30",
                    "params": [{"name": p} for p in (comp_info.parameters or [])],
                    "ports": {
                        "in": [{"name": inp} for inp in comp_info.inputs],
                        "out": [{"name": out} for out in comp_info.outputs]
                    },
                    "size": {"width": "700px", "height": "500px"}
                },
                "position": {"x": 600, "y": 250}
            })
        
        # Output blocks
        for i, output_name in enumerate(comp_info.outputs):
            output_id = self.create_unique_id()  # Define output_id here
            blocks.append({
                "id": output_id,
                "type": "basic.output",
                "data": {"name": output_name},
                "position": {"x": 900, "y": 300 + (i * 100)}
            })
        
        # Constant blocks for parameters
        for i, param_name in enumerate(comp_info.parameters or []):
            default_value = "5,5" if "kernel" in param_name.lower() else "Gaussian" if "type" in param_name.lower() else "100"
            blocks.append({
                "id": self.create_unique_id(),
                "type": "basic.constant",
                "data": {
                    "name": param_name,
                    "value": default_value,
                    "local": True
                },
                "position": {"x": 650 + (i * 200), "y": 100}
            })
        
        return blocks

    def create_design_wires(self, comp_info: ComponentInfo) -> List[Dict[str, Any]]:
        """Create design wires for the component"""
        wires = []
        
        # This is a simplified version - in a real implementation you would 
        # connect inputs -> code -> outputs based on port names
        
        if comp_info.code and comp_info.inputs and comp_info.outputs:
            # Connect first input to code and code to first output
            wires.append({
                "source": {
                    "block": "input_block_id",
                    "port": "input-out",
                    "name": comp_info.inputs[0]
                },
                "target": {
                    "block": "code_block_id", 
                    "port": comp_info.inputs[0],
                    "name": comp_info.inputs[0]
                }
            })
            
            wires.append({
                "source": {
                    "block": "code_block_id",
                    "port": comp_info.outputs[0],
                    "name": comp_info.outputs[0]
                },
                "target": {
                    "block": "output_block_id",
                    "port": "output-in", 
                    "name": comp_info.outputs[0]
                }
            })
        
        return wires

    def create_inner_connections(self, inner_models: Dict[str, Any], comp_info: ComponentInfo) -> List[Dict[str, Any]]:
        """Create connections within the inner model"""
        connections = []
        
        # Find different types of models
        input_models = {k: v for k, v in inner_models.items() if v.get("type") == "basic.input"}
        output_models = {k: v for k, v in inner_models.items() if v.get("type") == "basic.output"}
        code_models = {k: v for k, v in inner_models.items() if v.get("type") == "basic.code"}
        constant_models = {k: v for k, v in inner_models.items() if v.get("type") == "basic.constant"}
        
        # Connect inputs to code block
        if code_models and input_models:
            code_id = list(code_models.keys())[0]
            
            for input_id, input_model in input_models.items():
                input_name = input_model.get("data", {}).get("name", "")
                input_ports = input_model.get("ports", [])
                code_ports = code_models[code_id].get("ports", [])
                
                # Find matching ports
                input_out_port = next((p for p in input_ports if not p.get("in", True)), None)
                code_in_port = next((p for p in code_ports if p.get("in", False) and p.get("name") == input_name), None)
                
                if input_out_port and code_in_port:
                    connection_id = self.create_unique_id()
                    connection = {
                        "id": connection_id,
                        "type": "default",
                        "selected": False,
                        "source": input_id,
                        "sourcePort": input_out_port["id"],
                        "target": code_id,
                        "targetPort": code_in_port["id"],
                        "points": [
                            {
                                "id": self.create_unique_id(),
                                "type": "point",
                                "x": input_out_port["x"] + 20,
                                "y": input_out_port["y"]
                            },
                            {
                                "id": self.create_unique_id(),
                                "type": "point", 
                                "x": code_in_port["x"] - 20,
                                "y": code_in_port["y"]
                            }
                        ],
                        "labels": [],
                        "width": 3,
                        "color": "gray",
                        "curvyness": 50,
                        "selectedColor": "rgb(0,192,255)"
                    }
                    connections.append(connection)
        
        # Connect code to outputs
        if code_models and output_models:
            code_id = list(code_models.keys())[0]
            
            for output_id, output_model in output_models.items():
                output_name = output_model.get("data", {}).get("name", "")
                output_ports = output_model.get("ports", [])
                code_ports = code_models[code_id].get("ports", [])
                
                # Find matching ports
                output_in_port = next((p for p in output_ports if p.get("in", False)), None)
                code_out_port = next((p for p in code_ports if not p.get("in", True) and p.get("name") == output_name), None)
                
                if output_in_port and code_out_port:
                    connection_id = self.create_unique_id()
                    connection = {
                        "id": connection_id,
                        "type": "default",
                        "selected": False,
                        "source": code_id,
                        "sourcePort": code_out_port["id"],
                        "target": output_id,
                        "targetPort": output_in_port["id"],
                        "points": [
                            {
                                "id": self.create_unique_id(),
                                "type": "point",
                                "x": code_out_port["x"] + 20,
                                "y": code_out_port["y"]
                            },
                            {
                                "id": self.create_unique_id(),
                                "type": "point",
                                "x": output_in_port["x"] - 20,
                                "y": output_in_port["y"]
                            }
                        ],
                        "labels": [],
                        "width": 3,
                        "color": "gray",
                        "curvyness": 50,
                        "selectedColor": "rgb(0,192,255)"
                    }
                    connections.append(connection)
        
        # Connect constants to code parameters
        if code_models and constant_models:
            code_id = list(code_models.keys())[0]
            
            for const_id, const_model in constant_models.items():
                const_name = const_model.get("data", {}).get("name", "")
                const_ports = const_model.get("ports", [])
                code_ports = code_models[code_id].get("ports", [])
                
                # Find matching ports
                const_out_port = next((p for p in const_ports if not p.get("in", True)), None)
                code_param_port = next((p for p in code_ports if "parameter" in p.get("type", "") and p.get("name") == const_name), None)
                
                if const_out_port and code_param_port:
                    connection_id = self.create_unique_id()
                    connection = {
                        "id": connection_id,
                        "type": "default",
                        "selected": False,
                        "source": const_id,
                        "sourcePort": const_out_port["id"],
                        "target": code_id,
                        "targetPort": code_param_port["id"],
                        "points": [
                            {
                                "id": self.create_unique_id(),
                                "type": "point",
                                "x": const_out_port["x"],
                                "y": const_out_port["y"] + 20
                            },
                            {
                                "id": self.create_unique_id(),
                                "type": "point",
                                "x": code_param_port["x"],
                                "y": code_param_port["y"] - 20
                            }
                        ],
                        "labels": [],
                        "width": 3,
                        "color": "gray",
                        "curvyness": 50,
                        "selectedColor": "rgb(0,192,255)"
                    }
                    connections.append(connection)
        
        return connections

    def build_architecture_from_components(self, components: List[ComponentInfo], prompt: str) -> Dict[str, Any]:
        """Build complete architecture from generated components with proper structure"""
        
        # Create base architecture structure
        architecture = {
            "editor": {
                "id": self.create_unique_id(),
                "offsetX": 163,
                "offsetY": 97,
                "zoom": 100,
                "gridSize": 0,
                "layers": []
            },
            "version": "3.0",
            "package": {
                "name": "",
                "version": "",
                "description": "",
                "author": "",
                "image": ""
            },
            "design": {
                "board": "Python3-Noetic",
                "graph": {
                    "blocks": [],
                    "wires": []
                }
            },
            "dependencies": {}
        }
        
        node_models = {}
        x_offset = 400
        
        # Create nodes for each component
        for i, comp in enumerate(components):
            node_id = self.create_unique_id()
            dep_id = self.create_component_dependency_id()
            
            # Create complete node model with inner structure
            node_model = self.create_node_model(node_id, comp, x_offset + i*300, 150, dep_id)
            node_models[node_id] = node_model
            
            # Add to architecture graph
            architecture["design"]["graph"]["blocks"].append({
                "id": node_id,
                "type": dep_id,
                "data": {},
                "position": {"x": x_offset + i*300, "y": 150}
            })
            
            # Add dependency
            architecture["dependencies"][dep_id] = self.create_component_dependency(comp)
        
        # Create connections between components - ENHANCED AUTO-CONNECTION
        connections = self.create_connections(node_models, components)
        
        # Add wires to graph
        for conn in connections:
            architecture["design"]["graph"]["wires"].append({
                "source": {
                    "block": conn["source"],
                    "port": conn["sourcePort"],
                    "name": self.find_port_label(node_models[conn["source"]], conn["sourcePort"])
                },
                "target": {
                    "block": conn["target"],
                    "port": conn["targetPort"],
                    "name": self.find_port_label(node_models[conn["target"]], conn["targetPort"])
                }
            })
        
        # Create layers with proper structure
        links_layer = {
            "id": self.create_unique_id(),
            "type": "diagram-links",
            "isSvg": True,
            "transformed": True,
            "models": {conn["id"]: conn for conn in connections}
        }
        
        nodes_layer = {
            "id": self.create_unique_id(),
            "type": "diagram-nodes",
            "isSvg": False,
            "transformed": True,
            "models": node_models
        }
        
        architecture["editor"]["layers"] = [links_layer, nodes_layer]
        
        return architecture

    # Utility methods
    def create_unique_id(self) -> str:
        """Generate unique ID"""
        return str(uuid.uuid4())

    def create_component_dependency_id(self) -> str:
        """Create dependency ID similar to original format"""
        random_data = f"{uuid.uuid4()}{time.time()}".encode()
        hash_obj = hashlib.sha256(random_data)
        b64_hash = base64.b64encode(hash_obj.digest()).decode()
        dependency_id = b64_hash[:48].replace('/', '_').replace('+', '-')
        return dependency_id

    def find_port_label(self, node_model: Dict[str, Any], port_id: str) -> str:
        """Find port label by port ID"""
        for port in node_model.get("ports", []):
            if port["id"] == port_id:
                return port.get("label", port.get("name", ""))
        return ""

    def update_port_links(self, node_models: Dict[str, Any], node_id: str, port_id: str, connection_id: str):
        """Update port links array with connection ID"""
        for port in node_models[node_id]["ports"]:
            if port["id"] == port_id:
                if "links" not in port:
                    port["links"] = []
                port["links"].append(connection_id)
                break

    def create_architecture(self, user_prompt: str, max_attempts: int = 3) -> Dict[str, Any]:
        """Create architecture with enhanced component generation"""
        
        logger.info(f"Creating architecture for prompt: {user_prompt}")
        
        for attempt in range(max_attempts):
            try:
                logger.info(f"Attempt {attempt + 1}/{max_attempts}")
                
                # Generate components from prompt
                components_needed = self.generate_components_from_prompt(user_prompt)
                
                # Create base architecture structure
                base_architecture = {
                    "editor": {"layers": []},
                    "version": "3.0",
                    "package": {},
                    "design": {"graph": {"blocks": [], "wires": []}},
                    "dependencies": {}
                }
                
                # Enhance with generated components
                enhanced_architecture = self.enhance_architecture(base_architecture, user_prompt)
                
                # Validate
                if self.validate_enhanced_architecture(enhanced_architecture):
                    logger.info("Successfully created and validated architecture")
                    return enhanced_architecture
                else:
                    logger.warning(f"Architecture validation failed on attempt {attempt + 1}")
                    
            except Exception as e:
                logger.error(f"Error on attempt {attempt + 1}: {e}")
        
        # Fallback: create a basic working architecture
        logger.warning("All attempts failed, creating fallback architecture")
        return self.create_fallback_architecture(user_prompt)

    def validate_enhanced_architecture(self, architecture: Dict[str, Any]) -> bool:
        """Validate enhanced architecture"""
        try:
            required_keys = ["editor", "version", "package", "design", "dependencies"]
            for key in required_keys:
                if key not in architecture:
                    logger.error(f"Missing required key: {key}")
                    return False
            
            editor = architecture["editor"]
            if not all(key in editor for key in ["id", "layers"]):
                logger.error("Invalid editor structure")
                return False
            
            layers = editor["layers"]
            if len(layers) < 2:
                logger.error("Insufficient layers")
                return False
            
            design = architecture["design"]
            if "graph" not in design or "board" not in design:
                logger.error("Invalid design structure")
                return False
            
            graph = design["graph"]
            if not all(key in graph for key in ["blocks", "wires"]):
                logger.error("Invalid graph structure")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Validation error: {e}")
            return False

    def create_fallback_architecture(self, prompt: str) -> Dict[str, Any]:
        """Create a basic fallback architecture with proper connections"""
        logger.info("Creating fallback architecture")

        # Get fallback components
        fallback_components = self.get_fallback_components(prompt)
        
        # Create unique IDs
        component_ids = []
        component_dep_ids = []
        node_models = {}
        
        for i, comp_info in enumerate(fallback_components):
            node_id = self.create_unique_id()
            dep_id = self.create_component_dependency_id()
            
            component_ids.append(node_id)
            component_dep_ids.append(dep_id)
            
            # Position calculation
            x_pos = 494 + (i * 200)
            y_pos = 150 + (i * 20)
            
            # Create node model
            node_model = self.create_node_model(node_id, comp_info, x_pos, y_pos, dep_id)
            node_models[node_id] = node_model
        
        # Create intelligent connections
        connections = self.create_connections(node_models, fallback_components)
        
        # Create basic structure
        fallback = {
            "editor": {
                "id": self.create_unique_id(),
                "offsetX": 163,
                "offsetY": 97,
                "zoom": 100,
                "gridSize": 0,
                "layers": [
                    {
                        "id": self.create_unique_id(),
                        "type": "diagram-links",
                        "isSvg": True,
                        "transformed": True,
                        "models": {conn["id"]: conn for conn in connections}
                    },
                    {
                        "id": self.create_unique_id(),
                        "type": "diagram-nodes",
                        "isSvg": False,
                        "transformed": True,
                        "models": node_models
                    }
                ]
            },
            "version": "3.0",
            "package": {
                "name": "",
                "version": "",
                "description": "",
                "author": "",
                "image": ""
            },
            "design": {
                "board": "Python3-Noetic",
                "graph": {
                    "blocks": [],
                    "wires": []
                }
            },
            "dependencies": {}
        }
        
        # Add blocks and dependencies
        for i, (node_id, comp_info, dep_id) in enumerate(zip(component_ids, fallback_components, component_dep_ids)):
            # Add block
            fallback["design"]["graph"]["blocks"].append({
                "id": node_id,
                "type": dep_id,
                "data": {},
                "position": {"x": 494 + (i * 200), "y": 150 + (i * 20)}
            })
            
            # Add dependency
            fallback["dependencies"][dep_id] = self.create_component_dependency(comp_info)
        
        # Add wires based on connections
        for conn in connections:
            source_label = self.find_port_label(node_models[conn["source"]], conn["sourcePort"])
            target_label = self.find_port_label(node_models[conn["target"]], conn["targetPort"])
            
            fallback["design"]["graph"]["wires"].append({
                "source": {
                    "block": conn["source"],
                    "port": conn["sourcePort"],
                    "name": source_label
                },
                "target": {
                    "block": conn["target"],
                    "port": conn["targetPort"],
                    "name": target_label
                }
            })
        
        return fallback

    def generate_components(self, user_prompt: str, max_attempts: int = 3) -> List[ComponentInfo]:
        """Generate components based on user prompt - main entry point"""
        return self.generate_components_from_prompt(user_prompt)


# Main execution functions with ENHANCED analytics
def main():
    """Test the enhanced AUTO-CONNECTION architecture generator"""
    generator = ArchitectureGenerator()
    
    print("🔧 Testing Enhanced AUTO-CONNECTION Architecture Generator")
    print("="*60)
    
    test_prompts = [
        "Create a camera blur screen pipeline",
        "Build an edge detection system", 
        "Create a video processing pipeline with blur and display",
        "Create a ros2 robotics application robot arm RRR type",
        "katamaran tipi geminin yapısını oluştur"
    ]
    
    try:
        # Test with robotics prompt (has complex components)
        prompt = test_prompts[3]  # robotics
        print(f"🎯 Testing with prompt: '{prompt}'")
        print("-" * 60)
        
        # Generate components and build architecture
        components = generator.generate_components(prompt)
        result = generator.build_architecture_from_components(components, prompt)
        
        print("✅ Successfully generated FULLY CONNECTED architecture")
        print(f"📊 Generated {len(result['design']['graph']['blocks'])} blocks")
        print(f"🔗 Generated {len(result['design']['graph']['wires'])} wires")
        print(f"📦 Generated {len(result['dependencies'])} dependencies")
        
        # Count connections in editor layers
        total_connections = 0
        for layer in result['editor']['layers']:
            if layer['type'] == 'diagram-links':
                total_connections = len(layer['models'])
                break
        
        print(f"🔌 Generated {total_connections} editor connections")
        
        # Detailed connection analysis
        print("\n🔍 CONNECTION ANALYSIS:")
        print("-" * 40)
        
        # Analyze each component's connections
        for i, (block, component) in enumerate(zip(result['design']['graph']['blocks'], components)):
            component_name = component.name
            inputs = len(component.inputs)
            outputs = len(component.outputs)
            
            # Count connected wires for this block
            connected_as_source = sum(1 for wire in result['design']['graph']['wires'] if wire['source']['block'] == block['id'])
            connected_as_target = sum(1 for wire in result['design']['graph']['wires'] if wire['target']['block'] == block['id'])
            
            print(f"   Block {i+1}: {component_name}")
            print(f"      Inputs: {inputs} | Outputs: {outputs}")
            print(f"      Connected Out: {connected_as_source}/{outputs} | Connected In: {connected_as_target}/{inputs}")
            
            if inputs > 0:
                input_connection_ratio = (connected_as_target / inputs) * 100
                print(f"      Input Connection Rate: {input_connection_ratio:.1f}%")
            
            if outputs > 0:
                output_connection_ratio = (connected_as_source / outputs) * 100
                print(f"      Output Connection Rate: {output_connection_ratio:.1f}%")
            print()
        
        # Show detailed wire connections
        print("🔗 DETAILED WIRE CONNECTIONS:")
        print("-" * 40)
        for i, wire in enumerate(result['design']['graph']['wires']):
            source_name = wire['source']['name']
            target_name = wire['target']['name']
            source_block = wire['source']['block'][:8]
            target_block = wire['target']['block'][:8]
            print(f"   Wire {i+1}: [{source_block}]{source_name} → [{target_block}]{target_name}")
        
        # Calculate overall connectivity metrics
        total_possible_inputs = sum(len(comp.inputs) for comp in components)
        total_possible_outputs = sum(len(comp.outputs) for comp in components)
        total_actual_connections = len(result['design']['graph']['wires'])
        
        print(f"\n📈 CONNECTIVITY METRICS:")
        print("-" * 40)
        print(f"   Total Possible Inputs: {total_possible_inputs}")
        print(f"   Total Possible Outputs: {total_possible_outputs}")
        print(f"   Total Connections Made: {total_actual_connections}")
        if total_possible_inputs > 0:
            connection_efficiency = (total_actual_connections / total_possible_inputs) * 100
            print(f"   Connection Efficiency: {connection_efficiency:.1f}%")
        
        # Save result with enhanced naming
        timestamp = int(time.time())
        filename = f"architecture_{timestamp}_FULLY_CONNECTED.json"
        with open(filename, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\n💾 Saved to {filename}")
        
        # Final validation
        print(f"\n🔍 FINAL VALIDATION:")
        print("-" * 40)
        print(f"   ✓ Editor layers: {len(result['editor']['layers'])}")
        print(f"   ✓ Graph blocks: {len(result['design']['graph']['blocks'])}")
        print(f"   ✓ Graph wires: {len(result['design']['graph']['wires'])}")
        print(f"   ✓ Dependencies: {len(result['dependencies'])}")
        print(f"   ✓ Connection density: {total_connections} connections")
        
        # Check if all blocks are connected
        connected_blocks = set()
        for wire in result['design']['graph']['wires']:
            connected_blocks.add(wire['source']['block'])
            connected_blocks.add(wire['target']['block'])
        
        connectivity_rate = (len(connected_blocks) / len(result['design']['graph']['blocks'])) * 100
        print(f"   ✓ Block connectivity: {connectivity_rate:.1f}% ({len(connected_blocks)}/{len(result['design']['graph']['blocks'])} blocks connected)")
        
        if connectivity_rate >= 75:
            print("   🎉 EXCELLENT connectivity achieved!")
        elif connectivity_rate >= 50:
            print("   👍 GOOD connectivity achieved!")
        else:
            print("   ⚠️ LOW connectivity - may need improvements")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


def generate_architecture(prompt: str, ollama_url: str = "http://localhost:11434") -> Dict[str, Any]:
    """Generate architecture for a single prompt"""
    generator = ArchitectureGenerator(ollama_url)
    components = generator.generate_components(prompt)
    architecture = generator.build_architecture_from_components(components, prompt)
    return architecture


def quick_test():
    """Quick test with enhanced auto-connection features"""
    print("🚀 Quick AUTO-CONNECTION test starting...")
    try:
        result = generate_architecture("Create a video processing pipeline with camera, edge detection and display")
        
        # Count connections
        total_connections = 0
        for layer in result['editor']['layers']:
            if layer['type'] == 'diagram-links':
                total_connections = len(layer['models'])
                break
        
        print("✅ Quick test successful!")
        print(f"📊 Generated {len(result['design']['graph']['blocks'])} blocks")
        print(f"🔗 Generated {len(result['design']['graph']['wires'])} wires") 
        print(f"🔌 Generated {total_connections} connections")
        
        # Show connection details
        print("\n🔍 Connection Details:")
        for wire in result['design']['graph']['wires']:
            source_name = wire['source']['name']
            target_name = wire['target']['name']
            print(f"   {source_name} → {target_name}")
        
        # Save quick test result
        with open("quick_test_AUTO_CONNECTED.json", "w") as f:
            json.dump(result, f, indent=2)
        print(f"\n💾 Saved to quick_test_AUTO_CONNECTED.json")
        
    except Exception as e:
        print(f"❌ Quick test failed: {e}")


if __name__ == "__main__":
    print("🎯 Enhanced AUTO-CONNECTION Visual Programming Architecture Generator")
    print("="*70)
    print("✨ NEW FEATURES:")
    print("  • Automatic connection of ALL compatible ports")
    print("  • Smart port compatibility scoring")
    print("  • Cross-component connections")
    print("  • Enhanced connection analytics")
    print("="*70)
    print("Choose an option:")
    print("1. Run full AUTO-CONNECTION tests")
    print("2. Run quick AUTO-CONNECTION test")
    
    choice = input("Enter choice (1 or 2): ").strip()
    
    if choice == "2":
        quick_test()
    else:
        main()