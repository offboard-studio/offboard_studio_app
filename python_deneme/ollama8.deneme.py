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
        
        component_generation_prompt = f"""You are an expert in computer vision and robotics programming. 

User Request: "{user_prompt}"

Generate ONLY a JSON array of components needed for this pipeline. Each component should be a complete, functional unit.

Component types available:
- basic.input: For external inputs (camera, file, sensor data, etc.)
- basic.output: For displaying or saving results
- basic.code: For processing logic with Python code
- basic.constant: For fixed values/parameters

Required JSON format:
[
  {{
    "name": "Component Name",
    "type": "basic.code",
    "description": "Brief description",
    "inputs": ["Input1", "Input2"],
    "outputs": ["Output1"], 
    "parameters": ["Param1", "Param2"],
    "code": "import cv2\\nimport numpy as np\\n\\ndef main(inputs, outputs, parameters, synchronise):\\n    # Your code here\\n    pass"
  }}
]

Rules:
1. Create 2-5 components that form a complete pipeline
2. Always start with an input component (camera, file reader, sensor, etc.)
3. Always end with an output component (display, file writer, actuator, etc.)
4. Include processing components in between
5. Write REAL, WORKING Python code for basic.code components
6. Use proper OpenCV/NumPy/ROS functions when applicable
7. Handle synchronization and error cases
8. Make parameter names descriptive
9. For robotics: include joint control, kinematics, trajectory planning
10. For computer vision: include image processing, feature detection, object recognition

Respond with ONLY the JSON array, no explanation."""

        try:
            logger.info("Generating custom components with AI...")
            
            response = self.client.chat.completions.create(
                model="deepseek/deepseek-chat-v3-0324:free",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a computer vision and robotics expert. Generate only valid JSON arrays for visual programming components."
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
        """Create intelligent connections between components based on their ports"""
        connections = []
        node_list = list(node_models.keys())
        
        # Track port mappings for intelligent connection
        port_mappings = {}
        
        # Extract port information from each node
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
                    "type": port["type"]
                }
                
                if port["in"]:
                    if "parameter" in port["type"]:
                        port_mappings[node_id]["parameter_ports"].append(port_info)
                    else:
                        port_mappings[node_id]["input_ports"].append(port_info)
                else:
                    port_mappings[node_id]["output_ports"].append(port_info)
        
        # Create connections between consecutive components
        for i in range(len(node_list) - 1):
            source_node_id = node_list[i]
            target_node_id = node_list[i + 1]
            
            source_info = port_mappings[source_node_id]
            target_info = port_mappings[target_node_id]
            
            # Connect output ports of source to input ports of target
            for source_port in source_info["output_ports"]:
                for target_port in target_info["input_ports"]:
                    # Match compatible ports
                    if self.ports_are_compatible(source_port["label"], target_port["label"]):
                        connection_id = self.create_unique_id()
                        
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
                                    "x": 600 + (i * 300),
                                    "y": 200 + (i * 20)
                                },
                                {
                                    "id": self.create_unique_id(),
                                    "type": "point",
                                    "x": 650 + (i * 300),
                                    "y": 200 + (i * 20)
                                }
                            ],
                            "labels": [],
                            "width": 3,
                            "color": "gray",
                            "curvyness": 50,
                            "selectedColor": "rgb(0,192,255)"
                        }
                        
                        connections.append(connection)
                        
                        # Update port links
                        self.update_port_links(node_models, source_node_id, source_port["id"], connection_id)
                        self.update_port_links(node_models, target_node_id, target_port["id"], connection_id)
                        break  # Only connect first compatible pair
                break  # Only connect first output port
        
        return connections

    def ports_are_compatible(self, source_label: str, target_label: str) -> bool:
        """Check if two ports can be connected - Geliştirilmiş port uyumluluğu"""
        source_lower = source_label.lower()
        target_lower = target_label.lower()
        
        # Define comprehensive port compatibility mappings
        port_mappings = {
            # Image/Video data flow
            "image": ["image", "img", "frame", "processedimage", "processed_image", "out"],
            "video": ["video", "stream", "feed", "img", "image"],
            
            # Robot/Control data flow  
            "robot": ["jointstates", "joint_states", "pose", "endeffectorpose", "end_effector_pose", "angles", "joint_angles"],
            "control": ["command", "cmd", "control", "trajectory", "motion"],
            
            # Generic data flow
            "data": ["data", "output", "result", "processed", "detected", "detection"],
            "objects": ["objects", "detected_objects", "detections", "targets"],
            
            # Enable/Control signals
            "enable": ["enable", "trigger", "start", "activate", "run"],
            
            # Generic output to input mapping
            "output": ["input", "in", "data", "feed"]
        }
        
        # Direct match (strongest)
        if source_lower == target_lower:
            logger.info(f"Direct match: {source_label} == {target_label}")
            return True
        
        # Check category mappings
        for category, aliases in port_mappings.items():
            source_in_category = any(alias in source_lower for alias in aliases)
            target_in_category = any(alias in target_lower for alias in aliases)
            
            if source_in_category and target_in_category:
                logger.info(f"Category match ({category}): {source_label} → {target_label}")
                return True
        
        # Special cases for common patterns
        special_cases = [
            # Output to any input
            ("out" in source_lower and any(word in target_lower for word in ["img", "image", "input", "data"])),
            # Image to image processing
            ("img" in source_lower and any(word in target_lower for word in ["img", "image", "frame"])),
            # Any output to first available input (fallback)
            ("out" in source_lower or "result" in source_lower),
        ]
        
        for case in special_cases:
            if case:
                logger.info(f"Special case match: {source_label} → {target_label}")
                return True
        
        logger.info(f"No match found: {source_label} ↛ {target_label}")
        return False

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
        
        # Create connections between components at TOP LEVEL
        top_level_connections = self.create_top_level_connections(node_models, components)
        
        # Add wires to graph - EN ÖNEMLİ KISIM!
        for conn in top_level_connections:
            source_port_label = self.find_port_label(node_models[conn["source"]], conn["sourcePort"])
            target_port_label = self.find_port_label(node_models[conn["target"]], conn["targetPort"])
            
            architecture["design"]["graph"]["wires"].append({
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
        
        # Create layers with proper structure
        links_layer = {
            "id": self.create_unique_id(),
            "type": "diagram-links",
            "isSvg": True,
            "transformed": True,
            "models": {conn["id"]: conn for conn in top_level_connections}
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

    def create_top_level_connections(self, node_models: Dict[str, Any], components: List[ComponentInfo]) -> List[Dict[str, Any]]:
        """Create connections between main blocks at the top level - EN ÖNEMLİ FONKSİYON!"""
        connections = []
        node_list = list(node_models.keys())
        
        logger.info(f"Creating top-level connections between {len(node_list)} blocks")
        
        # Connect each block to the next one
        for i in range(len(node_list) - 1):
            source_node_id = node_list[i]
            target_node_id = node_list[i + 1]
            
            source_node = node_models[source_node_id]
            target_node = node_models[target_node_id]
            
            # Find output ports of source block
            source_output_ports = [
                port for port in source_node["ports"] 
                if not port["in"] and "parameter" not in port.get("type", "")
            ]
            
            # Find input ports of target block
            target_input_ports = [
                port for port in target_node["ports"] 
                if port["in"] and "parameter" not in port.get("type", "")
            ]
            
            logger.info(f"Block {i}: {len(source_output_ports)} outputs, Block {i+1}: {len(target_input_ports)} inputs")
            
            # Connect compatible ports
            if source_output_ports and target_input_ports:
                # Find best matching ports
                for source_port in source_output_ports:
                    for target_port in target_input_ports:
                        if self.ports_are_compatible(source_port["label"], target_port["label"]):
                            connection_id = self.create_unique_id()
                            
                            # Calculate connection points
                            source_x = source_port["x"] + 20
                            source_y = source_port["y"]
                            target_x = target_port["x"] - 20  
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
                                        "x": source_x,
                                        "y": source_y
                                    },
                                    {
                                        "id": self.create_unique_id(),
                                        "type": "point",
                                        "x": target_x,
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
                            
                            # Update port links
                            source_port["links"] = source_port.get("links", []) + [connection_id]
                            target_port["links"] = target_port.get("links", []) + [connection_id]
                            
                            logger.info(f"✅ Connected: {source_port['label']} → {target_port['label']}")
                            break  # Only connect first compatible pair per source port
                    else:
                        continue
                    break  # Break outer loop if connection made
        
        logger.info(f"Created {len(connections)} top-level connections")
        return connections

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

    def build_architecture_from_components(self, components: List[ComponentInfo], prompt: str) -> Dict[str, Any]:
        """Build architecture from generated components"""
        architecture = {
            "editor": {"layers": []},
            "design": {"graph": {"blocks": [], "wires": []}},
            "dependencies": {}
        }
        
        node_models = {}
        x_offset = 400
        
        # Create nodes for each component
        for i, comp in enumerate(components):
            node_id = self.create_unique_id()
            dep_id = self.create_component_dependency_id()
            
            # Create node model
            node_model = self.create_node_model(node_id, comp, x_offset + i*300, 150, dep_id)
            node_models[node_id] = node_model
            
            # Add to architecture
            architecture["design"]["graph"]["blocks"].append({
                "id": node_id,
                "type": dep_id,
                "position": {"x": x_offset + i*300, "y": 150}
            })
            
            # Add dependency
            architecture["dependencies"][dep_id] = self.create_component_dependency(comp)
        
        # Create connections between components
        connections = self.create_connections(node_models, components)
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
        
        # Create layers
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
        
        architecture["editor"] = {
            "id": self.create_unique_id(),
            "offsetX": 163,
            "offsetY": 97,
            "zoom": 100,
            "gridSize": 0,
            "layers": [links_layer, nodes_layer]
        }
        
        architecture["version"] = "3.0"
        architecture["package"] = {
            "name": "",
            "version": "",
            "description": "",
            "author": "",
            "image": ""
        }
        architecture["design"]["board"] = "Python3-Noetic"
        
        return architecture


# Main execution functions
def main():
    """Main function to test the architecture generator"""
    generator = ArchitectureGenerator()
    
    # Test prompts
    test_prompts = [
        "Create a camera blur screen pipeline",
        "Build an edge detection system",
        "Make a color filter application", 
        "Create a video processing pipeline with blur and display",
        "Create a ros2 robotics application robot arm RRR type"
    ]
    
    # for prompt in test_prompts:
    #     print(f"\n{'='*60}")
    #     print(f"🔧 Testing prompt: {prompt}")
    #     print('='*60)
        
    try:
        # Generate components and build architecture
        components = generator.generate_components("katamaran tipi geminin yapısını oluştur")
        result = generator.build_architecture_from_components(components, "katamaran tipi geminin yapısını oluştur")
        
        print("✅ Successfully generated architecture")
        print(f"📊 Generated {len(result['design']['graph']['blocks'])} blocks")
        print(f"🔗 Generated {len(result['design']['graph']['wires'])} wires")
        print(f"📦 Generated {len(result['dependencies'])} dependencies")
        
        # Count connections
        total_connections = 0
        for layer in result['editor']['layers']:
            if layer['type'] == 'diagram-links':
                total_connections = len(layer['models'])
                break
        
        print(f"🔌 Generated {total_connections} connections")
        
        # Save result
        timestamp = int(time.time())
        filename = f"architecture_{timestamp}.json"
        with open(filename, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"💾 Saved to {filename}")
        
        # Validate structure briefly
        print("🔍 Validation:")
        print(f"   ✓ Editor layers: {len(result['editor']['layers'])}")
        print(f"   ✓ Graph blocks: {len(result['design']['graph']['blocks'])}")
        print(f"   ✓ Graph wires: {len(result['design']['graph']['wires'])}")
        print(f"   ✓ Dependencies: {len(result['dependencies'])}")
        
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
    """Quick test with a simple prompt"""
    print("🚀 Quick test starting...")
    try:
        result = generate_architecture("create a ros2 robotics application robot arm RRR type")
        print("✅ Quick test successful!")
        print(f"Generated {len(result['design']['graph']['blocks'])} blocks")
        
        # Save quick test result
        with open("quick_test_result.json", "w") as f:
            json.dump(result, f, indent=2)
        print("💾 Saved to quick_test_result.json")
        
    except Exception as e:
        print(f"❌ Quick test failed: {e}")


if __name__ == "__main__":
    print("🎯 Enhanced Visual Programming Architecture Generator")
    print("Choose an option:")
    print("1. Run full tests")
    print("2. Run quick test")
    
    choice = input("Enter choice (1 or 2): ").strip()
    
    if choice == "2":
        quick_test()
    else:
        main()