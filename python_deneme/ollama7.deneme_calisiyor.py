import json
import uuid
import time
import logging
import base64
import hashlib
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum
from openai import OpenAI

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Constants ---

class LayoutConstants:
    START_X = 400
    START_Y = 150
    NODE_SPACING_X = 400
    NODE_SPACING_Y = 50
    INNER_INPUT_X = 200
    INNER_CODE_X = 500
    INNER_OUTPUT_X = 900
    INNER_Y_START = 300
    INNER_Y_SPACING = 150

class PortType:
    INPUT = "port.input"
    OUTPUT = "port.output"
    PARAMETER = "port.parameter"

class ComponentType:
    BASIC_CODE = "basic.code"
    BASIC_INPUT = "basic.input"
    BASIC_OUTPUT = "basic.output"
    BASIC_CONSTANT = "basic.constant"
    BLOCK_PACKAGE = "block.package"

# --- Data Models ---

@dataclass
class PortModel:
    id: str
    name: str
    type: str # 'port.input', 'port.output', or 'port.parameter'
    label: str
    is_input: bool
    parent_node_id: str = ""
    links: List[str] = field(default_factory=list)
    
    # Visual properties
    x: int = 0
    y: int = 0
    alignment: str = "left" # 'left', 'right', 'top', 'bottom'

@dataclass
class NodeModel:
    id: str
    type: str
    name: str # The readable name (e.g. "Camera Input")
    x: int
    y: int
    ports: List[PortModel] = field(default_factory=list)
    data: Dict[str, Any] = field(default_factory=dict)
    # For package nodes, they have an internal model
    inner_model: Optional[Dict[str, Any]] = None 
    dependency_id: Optional[str] = None # The hash ID used in "type" field for the graph
    
    def get_port_by_label(self, label: str, is_input: bool) -> Optional[PortModel]:
        for port in self.ports:
            # Check direction and label match (case insensitive partial match)
            if port.is_input == is_input and (label.lower() in port.label.lower() or port.label.lower() in label.lower()):
                return port
        return None

    def get_any_compatible_port(self, target_label: str, is_input: bool) -> Optional[PortModel]:
        """Tries to find a port compatible with the given label."""
        # 1. Exact match
        for port in self.ports:
            if port.is_input == is_input and port.label.lower() == target_label.lower():
                return port
        
        # 2. Semantic match
        for port in self.ports:
            if port.is_input == is_input and self._are_labels_compatible(port.label, target_label):
                return port
                
        # 3. Fallback: Loose partial match
        for port in self.ports:
            if port.is_input == is_input:
                if target_label.lower() in port.label.lower() or port.label.lower() in target_label.lower():
                    return port

        return None

    def _are_labels_compatible(self, label1: str, label2: str) -> bool:
        l1, l2 = label1.lower(), label2.lower()
        # Semantic groups
        mappings = [
            {"image", "img", "frame", "processedimage", "output", "video"},
            {"data", "pose", "jointstates", "array", "value", "result", "output", "input", "position"},
            {"enable", "trigger", "sync", "start"},
        ]
        
        # Check if they belong to the same group
        for group in mappings:
            # Check if l1 closely matches any group item
            l1_match = any(x in l1 for x in group)
            # Check if l2 closely matches any group item
            l2_match = any(y in l2 for y in group)
            
            if l1_match and l2_match:
                return True
                
        return False

@dataclass
class ConnectionModel:
    id: str
    source_node_id: str
    source_port_id: str
    target_node_id: str
    target_port_id: str
    # Pre-calculate points to help the editor
    points: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class ComponentInfo:
    name: str
    type: str # Usually 'basic.code' for the main logic
    description: str
    inputs: List[str]
    outputs: List[str]
    parameters: List[str] = field(default_factory=list)
    code: Optional[str] = None

# --- Component Library ---

class ComponentLibrary:
    @staticmethod
    def get_defaults() -> Dict[str, ComponentInfo]:
        return {
            "camera_input": ComponentInfo(
                name="Camera Input",
                type=ComponentType.BASIC_CODE,
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
                type=ComponentType.BASIC_CODE,
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
                type=ComponentType.BASIC_CODE,
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
                type=ComponentType.BASIC_CODE,
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

# --- Architecture Generator ---

class ArchitectureGenerator:
    def __init__(self, ollama_base_url: str = "http://localhost:11434"):
        """Initialize with Ollama client using OpenAI library"""
        self.client = OpenAI(
            base_url=f"https://openrouter.ai/api/v1",
            api_key="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"
        )
        self.library = ComponentLibrary.get_defaults()
        self._id_counter = 0

    def generate_id(self) -> str:
        """Generate a unique ID (UUID4)"""
        return str(uuid.uuid4())

    def generate_dependency_id(self) -> str:
        """Create a deterministic-looking but unique dependency ID"""
        random_data = f"{uuid.uuid4()}{time.time()}".encode()
        hash_obj = hashlib.sha256(random_data)
        b64_hash = base64.b64encode(hash_obj.digest()).decode()
        return b64_hash[:48].replace('/', '_').replace('+', '-')

    # --- AI Generation ---

    def generate_components_from_prompt(self, user_prompt: str) -> List[ComponentInfo]:
        """Generate custom components using AI, fallback to library/defaults on failure."""
        
        system_prompt = """You are a computer vision and robotics expert. 
Generate a JSON array of components for the requested pipeline.
Each component must comprise: name, type ('basic.code'), description, inputs (list), outputs (list), parameters (list), and working Python 'code'.
Structure:
[
  {
    "name": "Comp Name",
    "type": "basic.code",
    "description": "...",
    "inputs": ["in1"],
    "outputs": ["out1"],
    "parameters": ["param1"],
    "code": "..."
  }
]
Always include a source (input) and a sink (output/display).
"""
        
        try:
            logger.info(f"Requesting components for: {user_prompt}")
            response = self.client.chat.completions.create(
                model="mistralai/devstral-2512:free",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,
                max_tokens=4096,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content.strip()
            # Handle potential markdown wrapping
            if content.startswith("```json"):
                content = content[7:-3]
            elif content.startswith("```"):
                content = content[3:-3]
                
            try:
                data = json.loads(content)
                # Some models might wrap the list in a key like "components"
                if isinstance(data, dict):
                    if "components" in data:
                        data = data["components"]
                    else:
                        # Try to find any list in the values
                        for val in data.values():
                            if isinstance(val, list):
                                data = val
                                break
                
                if not isinstance(data, list):
                    raise ValueError("JSON result is not a list")

                components = []
                for item in data:
                    components.append(ComponentInfo(
                        name=item.get("name", "Unknown"),
                        type=item.get("type", ComponentType.BASIC_CODE),
                        description=item.get("description", ""),
                        inputs=item.get("inputs", []),
                        outputs=item.get("outputs", []),
                        parameters=item.get("parameters", []),
                        code=item.get("code", "")
                    ))
                
                if components:
                    logger.info(f"AI generated {len(components)} components.")
                    return components
                    
            except json.JSONDecodeError:
                logger.error("Failed to decode JSON from AI response.")
                
        except Exception as e:
            logger.error(f"AI generation failed: {e}")

        return self.get_fallback_components(user_prompt)

    def get_fallback_components(self, prompt: str) -> List[ComponentInfo]:
        """Return hardcoded components based on keywords."""
        logger.info("Using fallback components logic.")
        p = prompt.lower()
        
        # Robotics Path
        if any(x in p for x in ["robot", "arm", "kinematics"]):
             return [
                 ComponentInfo("Joint State Publisher", "basic.code", "Publishes joints", ["Enable"], ["JointStates"], ["JointNames", "DefaultPositions"], 
                               code="""def main(inputs, outputs, parameters, synchronise): pass"""), 
                 ComponentInfo("Forward Kinematics", "basic.code", "FK Calc", ["JointStates"], ["EndEffectorPose"], ["LinkLengths"], 
                               code="""def main(inputs, outputs, parameters, synchronise): pass"""),
                 ComponentInfo("Pose Visualizer", "basic.code", "Vis Pose", ["EndEffectorPose"], [], [], 
                               code="""def main(inputs, outputs, parameters, synchronise): pass""")
             ]
        
        # CV Path (Default)
        comps = [self.library["camera_input"]]
        if "edge" in p:
            comps.append(self.library["edge_detection"])
        elif "blur" in p:
            comps.append(self.library["image_blur"])
        else:
            comps.append(self.library["image_blur"])
        
        comps.append(self.library["display_output"])
        return comps

    # --- Connection & Construction ---

    def create_port_models(self, node_id: str, comp: ComponentInfo, x: int, y: int) -> List[PortModel]:
        ports = []
        offset_y = 16
        
        # Input Ports
        for i, name in enumerate(comp.inputs):
            ports.append(PortModel(
                id=self.generate_id(),
                name=self.generate_id(), 
                type=PortType.INPUT,
                label=name,
                is_input=True,
                parent_node_id=node_id,
                x=x + 1,
                y=y + offset_y + (i * 40),
                alignment="left"
            ))
            
        # Output Ports
        for i, name in enumerate(comp.outputs):
            ports.append(PortModel(
                id=self.generate_id(),
                name=self.generate_id(),
                type=PortType.OUTPUT,
                label=name,
                is_input=False,
                parent_node_id=node_id,
                x=x + 113, 
                y=y + offset_y + ((len(comp.inputs) + i) * 25), 
                alignment="right"
            ))
            
        # Parameter Ports
        for i, name in enumerate(comp.parameters):
            ports.append(PortModel(
                id=self.generate_id(),
                name=self.generate_id(),
                type=PortType.PARAMETER,
                label=name,
                is_input=True,
                parent_node_id=node_id,
                x=x + 50 + (i * 80),
                y=y - 30, # Top
                alignment="top"
            ))
            
        return ports

    def create_inner_structure(self, comp: ComponentInfo) -> Dict[str, Any]:
        """Creates the 'model' and 'design' for the inner workings of a Package node."""
        inner_nodes = {}
        inner_conns = []
        
        # 1. Inner Input Blocks
        input_node_ids = {} # name -> id
        start_y = 300
        
        for i, req_input in enumerate(comp.inputs):
            node_id = self.generate_id()
            port_id = self.generate_id()
            input_node_ids[req_input] = (node_id, port_id)
            
            inner_nodes[node_id] = {
                "id": node_id,
                "type": ComponentType.BASIC_INPUT,
                "x": LayoutConstants.INNER_INPUT_X,
                "y": start_y + (i * 100),
                "ports": [{
                    "id": port_id, 
                    "type": PortType.OUTPUT, 
                    "x": LayoutConstants.INNER_INPUT_X + 80, 
                    "y": start_y + (i * 100) + 20,
                    "name": "out", 
                    "label": req_input, 
                    "links": []
                }],
                "data": {"name": req_input}
            }

        # 2. Main Code Block
        code_node_id = self.generate_id()
        code_ports = []
        
        # Ports on Code Block
        code_input_ports = {} # name -> id
        for i, name in enumerate(comp.inputs):
            pid = self.generate_id()
            code_input_ports[name] = pid
            code_ports.append({
                "id": pid, "type": PortType.INPUT, "name": name, "label": name, "in": True,
                "x": LayoutConstants.INNER_CODE_X, "y": 350 + (i*50) 
            })
            
        code_output_ports = {} 
        for i, name in enumerate(comp.outputs):
            pid = self.generate_id()
            code_output_ports[name] = pid
            code_ports.append({
                "id": pid, "type": PortType.OUTPUT, "name": name, "label": name, "in": False,
                "x": LayoutConstants.INNER_CODE_X + 400, "y": 350 + (i*50)
            })

        code_param_ports = {}
        for i, name in enumerate(comp.parameters):
            pid = self.generate_id()
            code_param_ports[name] = pid
            code_ports.append({
                "id": pid, "type": PortType.PARAMETER, "name": name, "label": name, "in": True,
                "x": LayoutConstants.INNER_CODE_X + 100 + (i*100), "y": 280
            })

        inner_nodes[code_node_id] = {
            "id": code_node_id,
            "type": ComponentType.BASIC_CODE,
            "x": LayoutConstants.INNER_CODE_X,
            "y": 200,
            "ports": code_ports,
            "data": {
                "code": comp.code or "",
                "params": [{"name": p} for p in comp.parameters],
                "ports": {
                    "in": [{"name": i} for i in comp.inputs],
                    "out": [{"name": o} for o in comp.outputs]
                }
            }
        }

        # 3. Inner Output Blocks
        output_node_ids = {}
        for i, req_output in enumerate(comp.outputs):
            node_id = self.generate_id()
            port_id = self.generate_id()
            output_node_ids[req_output] = (node_id, port_id)
            
            inner_nodes[node_id] = {
                "id": node_id,
                "type": ComponentType.BASIC_OUTPUT,
                "x": LayoutConstants.INNER_OUTPUT_X,
                "y": start_y + (i * 100),
                "ports": [{
                    "id": port_id, 
                    "type": PortType.INPUT,
                    "x": LayoutConstants.INNER_OUTPUT_X, 
                    "y": start_y + (i * 100) + 20,
                    "name": "in", 
                    "label": req_output, 
                    "links": []
                }],
                "data": {"name": req_output}
            }

        # 4. Parameters (Constants)
        const_node_ids = {}
        for i, param in enumerate(comp.parameters):
            node_id = self.generate_id()
            port_id = self.generate_id()
            const_node_ids[param] = (node_id, port_id)
            
            inner_nodes[node_id] = {
                "id": node_id,
                "type": ComponentType.BASIC_CONSTANT,
                "x": LayoutConstants.INNER_CODE_X + (i*200),
                "y": 100,
                "ports": [{
                    "id": port_id, "type": PortType.OUTPUT, "name": "out", "label": param, "links": []
                }],
                "data": {"name": param, "value": "10", "local": True}
            }

        # --- Internal Connections ---
        # Simply connect matching names
        
        for name, (src_node, src_port) in input_node_ids.items():
            if name in code_input_ports:
                inner_conns.append(self._make_connection_dict(src_node, src_port, code_node_id, code_input_ports[name]))

        for name, (tgt_node, tgt_port) in output_node_ids.items():
            if name in code_output_ports:
                inner_conns.append(self._make_connection_dict(code_node_id, code_output_ports[name], tgt_node, tgt_port))

        for name, (src_node, src_port) in const_node_ids.items():
            if name in code_param_ports:
                inner_conns.append(self._make_connection_dict(src_node, src_port, code_node_id, code_param_ports[name]))

        # Layers
        links_layer = {
            "id": self.generate_id(), "type": "diagram-links", "isSvg": True, "transformed": True,
            "models": {c["id"]: c for c in inner_conns}
        }
        nodes_layer = {
            "id": self.generate_id(), "type": "diagram-nodes", "isSvg": False, "transformed": True,
            "models": inner_nodes
        }

        # Design
        design_blocks = [{"id": n_id, "type": d["type"], "data": d["data"]} for n_id, d in inner_nodes.items()]

        return {
            "model": {
                "id": self.generate_id(),
                "layers": [links_layer, nodes_layer]
            },
            "design": {
                "graph": {"blocks": design_blocks, "wires": []}
            }
        }

    def _make_connection_dict(self, src_node, src_port, tgt_node, tgt_port):
        cid = self.generate_id()
        return {
            "id": cid, "type": "default", "source": src_node, "sourcePort": src_port,
            "target": tgt_node, "targetPort": tgt_port,
            "points": [{"id": self.generate_id(), "type": "point", "x": 0, "y": 0}] 
        }

    def build_full_architecture(self, components: List[ComponentInfo]) -> Dict[str, Any]:
        """Main method to construct the full JSON architecture."""
        
        node_models: List[NodeModel] = []
        connections: List[ConnectionModel] = []
        dependencies = {}
        
        # 1. Instantiate Nodes
        curr_x = LayoutConstants.START_X
        for i, comp in enumerate(components):
            node_id = self.generate_id()
            dep_id = self.generate_dependency_id()
            
            node = NodeModel(
                id=node_id,
                type=ComponentType.BLOCK_PACKAGE,
                name=comp.name,
                x=curr_x,
                y=LayoutConstants.START_Y,
                dependency_id=dep_id
            )
            node.ports = self.create_port_models(node_id, comp, node.x, node.y)
            
            inner_struct = self.create_inner_structure(comp)
            node.inner_model = inner_struct["model"]
            node.data = {
                "design": inner_struct["design"],
                "package": {"name": comp.name, "description": comp.description, "version": "1.0.0"}
            }
            
            node_models.append(node)
            dependencies[dep_id] = {
                "package": node.data["package"],
                "design": node.data["design"],
                "dependencies": {} 
            }
            
            curr_x += LayoutConstants.NODE_SPACING_X

        # 2. Create connections
        for i in range(len(node_models) - 1):
            src_node = node_models[i]
            tgt_node = node_models[i + 1]
            connected = False
            
            src_outputs = [p for p in src_node.ports if not p.is_input]
            tgt_inputs = [p for p in tgt_node.ports if p.is_input]
            
            # Strategy A: Intelligent Matching
            for src_port in src_outputs:
                target_port = tgt_node.get_any_compatible_port(src_port.label, is_input=True)
                if target_port:
                    self._create_connection(connections, src_node, src_port, tgt_node, target_port)
                    connected = True
                    break 
            
            # Strategy B: Fallback / Force Connection
            # If no smart connection occurred, and we have logical ports available, connect them.
            if not connected:
                # If there's primarily one output and one input, they are likely meant for each other
                if len(src_outputs) == 1 and len(tgt_inputs) >= 1:
                    logger.info(f"Fallback connecting {src_node.name} -> {tgt_node.name}")
                    self._create_connection(connections, src_node, src_outputs[0], tgt_node, tgt_inputs[0])
                    connected = True
            
            if not connected:
                logger.warning(f"Could not automatically connect {src_node.name} to {tgt_node.name}")

        return self._serialize_to_json(node_models, connections, dependencies)
    
    def _create_connection(self, connections_list, src_node, src_port, tgt_node, tgt_port):
        conn_id = self.generate_id()
        # Calculate approximate center points for the wire
        spos = {"x": src_node.x + src_port.x, "y": src_node.y + src_port.y}
        tpos = {"x": tgt_node.x + tgt_port.x, "y": tgt_node.y + tgt_port.y}
        
        connections_list.append(ConnectionModel(
            id=conn_id,
            source_node_id=src_node.id, source_port_id=src_port.id,
            target_node_id=tgt_node.id, target_port_id=tgt_port.id,
            points=[
                {"id": self.generate_id(), "type": "point", "x": spos["x"], "y": spos["y"]},
                {"id": self.generate_id(), "type": "point", "x": tpos["x"], "y": tpos["y"]}
            ]
        ))
        src_port.links.append(conn_id)
        tgt_port.links.append(conn_id)

    def _serialize_to_json(self, nodes: List[NodeModel], connections: List[ConnectionModel], dependencies: Dict) -> Dict[str, Any]:
        """Convert internal models to the exact JSON format expected by the frontend."""
        
        link_models = {}
        graph_wires = []
        
        for conn in connections:
            link_models[conn.id] = {
                "id": conn.id, "type": "default", "selected": False,
                "source": conn.source_node_id, "sourcePort": conn.source_port_id,
                "target": conn.target_node_id, "targetPort": conn.target_port_id,
                "points": conn.points, # Using calculated points
                "labels": [], "width": 3, "color": "gray"
            }
            
            src_node = next(n for n in nodes if n.id == conn.source_node_id)
            tgt_node = next(n for n in nodes if n.id == conn.target_node_id)
            src_port = next(p for p in src_node.ports if p.id == conn.source_port_id)
            tgt_port = next(p for p in tgt_node.ports if p.id == conn.target_port_id)
            
            graph_wires.append({
                "source": {"block": src_node.id, "port": src_port.id, "name": src_port.label},
                "target": {"block": tgt_node.id, "port": tgt_port.id, "name": tgt_port.label}
            })

        node_models_dict = {}
        graph_blocks = []
        
        for node in nodes:
            serialized_ports = []
            for p in node.ports:
                serialized_ports.append({
                    "id": p.id, "type": p.type, "x": p.x, "y": p.y,
                    "name": p.name, "alignment": p.alignment, "parentNode": node.id,
                    "links": p.links, "in": p.is_input, "label": p.label, "hideLabel": False
                })
                
            node_models_dict[node.id] = {
                "id": node.id,
                "type": node.type,
                "selected": False,
                "x": node.x, "y": node.y,
                "ports": serialized_ports,
                "data": {},
                "model": node.inner_model,
                "info": node.data.get("package", {}),
                "design": {"board": "Python3-Noetic", "graph": node.data.get("design", {}).get("graph")}
            }
            
            graph_blocks.append({
                "id": node.id,
                "type": node.dependency_id, 
                "data": {},
                "position": {"x": node.x, "y": node.y}
            })

        return {
            "version": "3.0",
            "editor": {
                "id": self.generate_id(),
                "offsetX": 0, "offsetY": 0, "zoom": 100,
                "layers": [
                    {"id": self.generate_id(), "type": "diagram-links", "isSvg": True, "transformed": True, "models": link_models},
                    {"id": self.generate_id(), "type": "diagram-nodes", "isSvg": False, "transformed": True, "models": node_models_dict}
                ]
            },
            "design": {
                "board": "Python3-Noetic",
                "graph": {
                    "blocks": graph_blocks,
                    "wires": graph_wires
                }
            },
            "dependencies": dependencies,
            "package": {"name": "Generated Pipeline", "version": "0.1.0"}
        }

    def generate(self, user_prompt: str) -> Dict[str, Any]:
        """Main entry point."""
        components = self.generate_components_from_prompt(user_prompt)
        return self.build_full_architecture(components)


# --- Execution ---

def main():
    generator = ArchitectureGenerator()
    prompt = "Create a ros2 robotics application robot arm RRR type"
    
    print(f"Generating for: {prompt}")
    result = generator.generate(prompt)
    
    filename = f"architecture_{int(time.time())}.json"
    with open(filename, 'w') as f:
        json.dump(result, f, indent=2)
        
    print(f"✅ Generated {filename}")
    print(f"Blocks: {len(result['design']['graph']['blocks'])}")
    print(f"Wires: {len(result['design']['graph']['wires'])}")
    print(f"Dependencies: {len(result['dependencies'])}")

if __name__ == "__main__":
    main()
