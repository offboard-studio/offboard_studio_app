from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from contextlib import asynccontextmanager
import json
import uuid
import time
import logging
import base64
import hashlib
from datetime import datetime
from dataclasses import dataclass
from openai import OpenAI
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Thread pool for CPU-intensive tasks
executor = ThreadPoolExecutor(max_workers=4)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Visual Programming Architecture Generator API started")
    yield
    # Shutdown
    logger.info("Visual Programming Architecture Generator API shutting down")
    executor.shutdown(wait=True)

# FastAPI app initialization with lifespan
app = FastAPI(
    title="Visual Programming Architecture Generator",
    description="AI-powered visual programming architecture generator with automatic component connection",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class ComponentInfo(BaseModel):
    name: str
    type: str
    description: str
    inputs: List[str]
    outputs: List[str]
    code: Optional[str] = None
    parameters: Optional[List[str]] = None

class ArchitectureRequest(BaseModel):
    prompt: str = Field(..., description="User prompt describing the desired architecture")
    ollama_base_url: Optional[str] = Field(default="http://localhost:11434", description="Ollama base URL")
    max_attempts: Optional[int] = Field(default=3, description="Maximum generation attempts")

class ComponentRequest(BaseModel):
    prompt: str = Field(..., description="User prompt for component generation")
    ollama_base_url: Optional[str] = Field(default="http://localhost:11434", description="Ollama base URL")

class ArchitectureResponse(BaseModel):
    success: bool
    architecture: Optional[Dict[str, Any]] = None
    components: Optional[List[ComponentInfo]] = None
    metrics: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    generation_time: Optional[float] = None

class ComponentResponse(BaseModel):
    success: bool
    components: Optional[List[ComponentInfo]] = None
    error: Optional[str] = None
    generation_time: Optional[float] = None

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str

# Original ComponentInfo dataclass for internal use
@dataclass
class ComponentInfoInternal:
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
    
    def _initialize_component_library(self) -> Dict[str, ComponentInfoInternal]:
        """Initialize library of predefined components"""
        return {
            "camera_input": ComponentInfoInternal(
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
            "image_blur": ComponentInfoInternal(
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
            "edge_detection": ComponentInfoInternal(
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
            "display_output": ComponentInfoInternal(
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

    async def generate_components_from_prompt_async(self, user_prompt: str) -> List[ComponentInfoInternal]:
        """Generate custom components based on user prompt using AI - Async version"""
        
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

Respond with ONLY the JSON array, no explanation."""

        try:
            logger.info("Generating custom components with AI...")
            
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                executor,
                lambda: self.client.chat.completions.create(
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
            )
            
            # Clean and parse JSON
            json_text = response.choices[0].message.content.strip()
            
            if json_text.startswith("```json"):
                json_text = json_text[7:-3]
            elif json_text.startswith("```"):
                json_text = json_text[3:-3]
            
            components_data = json.loads(json_text)
            
            # Convert to ComponentInfoInternal objects
            components = []
            for comp_data in components_data:
                component = ComponentInfoInternal(
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

    def get_fallback_components(self, prompt: str) -> List[ComponentInfoInternal]:
        """Fallback components if AI generation fails"""
        logger.info("Using fallback components")
        
        prompt_lower = prompt.lower()
        components = []
        
        # Determine component type based on prompt keywords
        if any(word in prompt_lower for word in ["robot", "arm", "joint", "kinematics"]):
            # Robotics pipeline - simplified version
            components = [
                ComponentInfoInternal(
                    name="Joint State Publisher",
                    type="basic.code",
                    description="Publishes joint states for robot arm",
                    inputs=["Enable"],
                    outputs=["JointStates"],
                    parameters=["JointNames", "DefaultPositions"]
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

    # FULL IMPLEMENTATION - All methods from original file
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

    async def build_architecture_from_components_async(self, components: List[ComponentInfoInternal], prompt: str) -> Dict[str, Any]:
        """Build complete architecture from generated components with MAXIMUM connectivity"""
        
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
        
        # ENHANCED: Create MAXIMUM connections between ALL compatible components
        connections = self.create_maximum_connections(node_models, components)
        
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

    def create_maximum_connections(self, node_models: Dict[str, Any], component_infos: List[ComponentInfoInternal]) -> List[Dict[str, Any]]:
        """Create MAXIMUM connections between ALL compatible ports across ALL components"""
        connections = []
        node_list = list(node_models.keys())
        
        logger.info(f"🔗 Creating MAXIMUM auto-connections between {len(node_list)} components")
        
        # Extract detailed port information from each node
        port_mappings = {}
        for node_id, node_model in node_models.items():
            port_mappings[node_id] = {
                "input_ports": [],
                "output_ports": [],
                "parameter_ports": [],
                "node_info": {}
            }
            
            # Store component info for this node
            comp_index = node_list.index(node_id)
            if comp_index < len(component_infos):
                port_mappings[node_id]["node_info"] = {
                    "name": component_infos[comp_index].name,
                    "type": component_infos[comp_index].type,
                    "index": comp_index
                }
            
            for port in node_model.get("ports", []):
                port_info = {
                    "id": port["id"],
                    "name": port["name"],
                    "label": port["label"],
                    "type": port["type"],
                    "x": port["x"],
                    "y": port["y"],
                    "connected": False,
                    "connection_priority": self.calculate_port_priority(port["label"])
                }
                
                if port["in"]:
                    if "parameter" in port["type"]:
                        port_mappings[node_id]["parameter_ports"].append(port_info)
                    else:
                        port_mappings[node_id]["input_ports"].append(port_info)
                else:
                    port_mappings[node_id]["output_ports"].append(port_info)
        
        # PHASE 1: Sequential component connections (data flow pipeline)
        logger.info("📊 Phase 1: Creating sequential pipeline connections...")
        sequential_connections = self.create_sequential_connections(port_mappings, node_list)
        connections.extend(sequential_connections)
        
        # PHASE 2: Cross-component connections (parallel processing)
        logger.info("🌉 Phase 2: Creating cross-component connections...")
        cross_connections = self.create_all_cross_connections(port_mappings, node_list)
        connections.extend(cross_connections)
        
        # Update all port links in node models
        for conn in connections:
            self.update_port_links(node_models, conn["source"], conn["sourcePort"], conn["id"])
            self.update_port_links(node_models, conn["target"], conn["targetPort"], conn["id"])
        
        logger.info(f"🎯 Total MAXIMUM connections created: {len(connections)}")
        
        return connections

    def calculate_port_priority(self, port_label: str) -> int:
        """Calculate connection priority for ports (higher = more important)"""
        port_lower = port_label.lower()
        
        # High priority ports (main data flow)
        if any(term in port_lower for term in ["image", "frame", "data", "output", "result"]):
            return 10
        
        # Medium priority ports (control and state)
        if any(term in port_lower for term in ["enable", "state", "pose", "position"]):
            return 7
        
        # Medium priority ports (processed data)
        if any(term in port_lower for term in ["processed", "detected", "filtered"]):
            return 8
        
        # Lower priority ports (parameters and config)
        if any(term in port_lower for term in ["config", "param", "threshold", "size"]):
            return 5
        
        # Default priority
        return 6

    def create_sequential_connections(self, port_mappings: Dict[str, Any], node_list: List[str]) -> List[Dict[str, Any]]:
        """Create sequential pipeline connections between consecutive components"""
        connections = []
        
        for i in range(len(node_list) - 1):
            source_node_id = node_list[i]
            target_node_id = node_list[i + 1]
            
            source_info = port_mappings[source_node_id]
            target_info = port_mappings[target_node_id]
            
            logger.info(f"🔄 Connecting Block {i} → Block {i+1}")
            
            # Get all possible output-to-input connections
            connection_candidates = []
            
            for source_port in source_info["output_ports"]:
                if source_port["connected"]:
                    continue
                    
                for target_port in target_info["input_ports"]:
                    if target_port["connected"]:
                        continue
                    
                    compatibility_score = self.calculate_enhanced_port_compatibility(
                        source_port["label"], target_port["label"]
                    )
                    
                    if compatibility_score > 0.3:  # Lower threshold for sequential connections
                        priority_score = (source_port["connection_priority"] + target_port["connection_priority"]) / 2
                        total_score = compatibility_score + (priority_score / 10)
                        
                        connection_candidates.append({
                            "source_port": source_port,
                            "target_port": target_port,
                            "score": total_score,
                            "compatibility": compatibility_score,
                            "priority": priority_score
                        })
            
            # Sort by total score and create best connections
            connection_candidates.sort(key=lambda x: x["score"], reverse=True)
            
            # Create connections ensuring no port is used twice
            used_source_ports = set()
            used_target_ports = set()
            
            for candidate in connection_candidates:
                source_port = candidate["source_port"]
                target_port = candidate["target_port"]
                
                if source_port["id"] in used_source_ports or target_port["id"] in used_target_ports:
                    continue
                
                # Create connection
                connection = self.create_connection_object(
                    source_node_id, source_port, 
                    target_node_id, target_port,
                    "sequential"
                )
                
                connections.append(connection)
                
                # Mark ports as connected
                source_port["connected"] = True
                target_port["connected"] = True
                used_source_ports.add(source_port["id"])
                used_target_ports.add(target_port["id"])
                
                logger.info(f"   ✅ Connected: {source_port['label']} → {target_port['label']} (score: {candidate['score']:.2f})")
        
        return connections

    def create_all_cross_connections(self, port_mappings: Dict[str, Any], node_list: List[str]) -> List[Dict[str, Any]]:
        """Create ALL possible cross-connections between non-consecutive components"""
        connections = []
        
        # Create a comprehensive compatibility matrix
        all_connection_candidates = []
        
        for i, source_node_id in enumerate(node_list):
            source_info = port_mappings[source_node_id]
            
            for j, target_node_id in enumerate(node_list):
                if j <= i:  # Skip same and previous blocks
                    continue
                    
                target_info = port_mappings[target_node_id]
                
                # Check all output-to-input combinations
                for source_port in source_info["output_ports"]:
                    if source_port["connected"]:
                        continue
                    
                    for target_port in target_info["input_ports"]:
                        if target_port["connected"]:
                            continue
                        
                        compatibility_score = self.calculate_enhanced_port_compatibility(
                            source_port["label"], target_port["label"]
                        )
                        
                        if compatibility_score > 0.5:  # Higher threshold for cross-connections
                            distance_penalty = abs(j - i) * 0.1  # Prefer closer components
                            final_score = compatibility_score - distance_penalty
                            
                            if final_score > 0.4:
                                all_connection_candidates.append({
                                    "source_node": source_node_id,
                                    "target_node": target_node_id,
                                    "source_port": source_port,
                                    "target_port": target_port,
                                    "score": final_score,
                                    "distance": abs(j - i),
                                    "type": "cross"
                                })
        
        # Sort all candidates by score
        all_connection_candidates.sort(key=lambda x: x["score"], reverse=True)
        
        # Create cross-connections avoiding conflicts
        used_ports = set()
        
        for candidate in all_connection_candidates:
            source_port_id = candidate["source_port"]["id"]
            target_port_id = candidate["target_port"]["id"]
            
            if source_port_id in used_ports or target_port_id in used_ports:
                continue
            
            # Create cross-connection
            connection = self.create_connection_object(
                candidate["source_node"], candidate["source_port"],
                candidate["target_node"], candidate["target_port"],
                "cross",
                color="orange"
            )
            
            connections.append(connection)
            
            # Mark ports as used
            candidate["source_port"]["connected"] = True
            candidate["target_port"]["connected"] = True
            used_ports.add(source_port_id)
            used_ports.add(target_port_id)
            
            logger.info(f"   🌉 Cross-connected: {candidate['source_port']['label']} → {candidate['target_port']['label']} (score: {candidate['score']:.2f})")
        
        return connections

    def calculate_enhanced_port_compatibility(self, source_label: str, target_label: str) -> float:
        """Enhanced port compatibility with more sophisticated matching"""
        source_lower = source_label.lower()
        target_lower = target_label.lower()
        
        # Perfect match
        if source_lower == target_lower:
            return 1.0
        
        # High compatibility mappings with scores
        high_compatibility = {
            "image": {"frame": 0.95, "img": 0.95, "processedimage": 0.9, "processed_image": 0.9, "input": 0.8},
            "frame": {"image": 0.95, "img": 0.95, "processedimage": 0.9, "processed_image": 0.9, "input": 0.8},
            "processedimage": {"image": 0.9, "img": 0.9, "frame": 0.9, "input": 0.85},
            "processed_image": {"image": 0.9, "img": 0.9, "frame": 0.9, "input": 0.85},
            "jointstates": {"states": 0.95, "robot_state": 0.9, "pose": 0.8},
            "endeffectorpose": {"pose": 0.95, "position": 0.9, "location": 0.85},
            "enable": {"trigger": 0.9, "start": 0.85, "activate": 0.85, "run": 0.8},
            "output": {"input": 0.8, "data": 0.75, "result": 0.7},
            "result": {"output": 0.75, "data": 0.8, "input": 0.7}
        }
        
        # Check direct mappings
        for source_key, target_mapping in high_compatibility.items():
            if source_key in source_lower:
                for target_key, score in target_mapping.items():
                    if target_key in target_lower:
                        return score
        
        # Medium compatibility patterns
        medium_patterns = [
            (["output", "out", "result"], ["input", "in", "data"], 0.6),
            (["processed", "filtered", "detected"], ["input", "data"], 0.65),
            (["state", "status"], ["pose", "position"], 0.6),
            (["control", "command"], ["input", "signal"], 0.7)
        ]
        
        for source_patterns, target_patterns, score in medium_patterns:
            if any(p in source_lower for p in source_patterns) and \
            any(p in target_lower for p in target_patterns):
                return score
        
        # Type-based compatibility
        type_compatibility = {
            "image": 0.5, "data": 0.4, "signal": 0.4, "state": 0.35
        }
        
        for type_word, score in type_compatibility.items():
            if type_word in source_lower and type_word in target_lower:
                return score
        
        return 0.0

    def create_connection_object(self, source_node_id: str, source_port: Dict, 
                            target_node_id: str, target_port: Dict, 
                            connection_type: str = "default", color: str = "gray") -> Dict[str, Any]:
        """Create a connection object with proper structure"""
        connection_id = self.create_unique_id()
        
        # Calculate connection points
        source_x = source_port["x"]
        source_y = source_port["y"]
        target_x = target_port["x"]
        target_y = target_port["y"]
        
        # Adjust connection points based on type
        curvyness = {
            "sequential": 50,
            "cross": 75,
            "feedback": 100,
            "broadcast": 25
        }.get(connection_type, 50)
        
        return {
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
            "color": color,
            "curvyness": curvyness,
            "selectedColor": "rgb(0,192,255)",
            "connectionType": connection_type
        }

    def create_node_model(self, node_id: str, comp_info: ComponentInfoInternal, x: int, y: int, dep_id: str) -> Dict[str, Any]:
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

    def create_complete_inner_model(self, comp_info: ComponentInfoInternal) -> Dict[str, Any]:
        """Create complete inner model with all required layers and models"""
        
        # Create inner nodes
        inner_nodes = {}
        
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
                    "parentNode": input_id,
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
                    "parentNode": code_id,
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
                    "parentNode": code_id,
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
                    "parentNode": code_id,
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
                    "parentNode": output_id,
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
                    "parentNode": const_id,
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
        inner_connections = []
        
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

    def create_component_dependency(self, comp_info: ComponentInfoInternal) -> Dict[str, Any]:
        """Create component dependency structure"""
        
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

    def create_design_blocks(self, comp_info: ComponentInfoInternal) -> List[Dict[str, Any]]:
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
            blocks.append({
                "id": self.create_unique_id(),
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

    def create_design_wires(self, comp_info: ComponentInfoInternal) -> List[Dict[str, Any]]:
        """Create design wires for the component"""
        wires = []
        
        # This is a simplified version
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

    async def create_architecture_async(self, user_prompt: str, max_attempts: int = 3) -> Dict[str, Any]:
        """Create architecture with enhanced component generation - Async version"""
        
        logger.info(f"Creating architecture for prompt: {user_prompt}")
        
        for attempt in range(max_attempts):
            try:
                logger.info(f"Attempt {attempt + 1}/{max_attempts}")
                
                # Generate components from prompt
                components_needed = await self.generate_components_from_prompt_async(user_prompt)
                
                # Build architecture from components
                enhanced_architecture = await self.build_architecture_from_components_async(components_needed, user_prompt)
                
                # Validate
                if self.validate_architecture(enhanced_architecture):
                    logger.info("Successfully created and validated architecture")
                    return enhanced_architecture
                else:
                    logger.warning(f"Architecture validation failed on attempt {attempt + 1}")
                    
            except Exception as e:
                logger.error(f"Error on attempt {attempt + 1}: {e}")
        
        # Fallback: create a basic working architecture
        logger.warning("All attempts failed, creating fallback architecture")
        return await self.create_fallback_architecture_async(user_prompt)

    def validate_architecture(self, architecture: Dict[str, Any]) -> bool:
        """Validate architecture structure"""
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
            
            return True
            
        except Exception as e:
            logger.error(f"Validation error: {e}")
            return False

    async def create_fallback_architecture_async(self, prompt: str) -> Dict[str, Any]:
        """Create a basic fallback architecture - Async version"""
        logger.info("Creating fallback architecture")

        # Get fallback components
        fallback_components = self.get_fallback_components(prompt)
        
        # Build architecture from fallback components
        return await self.build_architecture_from_components_async(fallback_components, prompt)

# Global generator instance
generator = ArchitectureGenerator()

# API Endpoints
@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint"""
    return {
        "message": "Visual Programming Architecture Generator API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0"
    )

@app.post("/generate-architecture", response_model=ArchitectureResponse)
async def generate_architecture(request: ArchitectureRequest):
    """Generate a complete visual programming architecture from a prompt"""
    start_time = time.time()
    
    try:
        logger.info(f"Generating architecture for prompt: {request.prompt}")
        
        # Generate architecture
        architecture = await generator.create_architecture_async(
            request.prompt, 
            request.max_attempts
        )
        
        # Calculate metrics
        blocks_count = len(architecture.get("design", {}).get("graph", {}).get("blocks", []))
        wires_count = len(architecture.get("design", {}).get("graph", {}).get("wires", []))
        dependencies_count = len(architecture.get("dependencies", {}))
        
        # Count connections in editor layers
        total_connections = 0
        for layer in architecture.get("editor", {}).get("layers", []):
            if layer.get("type") == "diagram-links":
                total_connections = len(layer.get("models", {}))
                break
        
        metrics = {
            "blocks_count": blocks_count,
            "wires_count": wires_count,
            "dependencies_count": dependencies_count,
            "total_connections": total_connections,
            "has_connections": wires_count > 0
        }
        
        generation_time = time.time() - start_time
        
        logger.info(f"Successfully generated architecture in {generation_time:.2f}s")
        logger.info(f"Metrics: {metrics}")
        
        return ArchitectureResponse(
            success=True,
            architecture=architecture,
            metrics=metrics,
            generation_time=generation_time
        )
        
    except Exception as e:
        logger.error(f"Error generating architecture: {str(e)}")
        return ArchitectureResponse(
            success=False,
            error=str(e),
            generation_time=time.time() - start_time
        )

@app.post("/generate-components", response_model=ComponentResponse)
async def generate_components(request: ComponentRequest):
    """Generate components only from a prompt"""
    start_time = time.time()
    
    try:
        logger.info(f"Generating components for prompt: {request.prompt}")
        
        # Generate components
        components_internal = await generator.generate_components_from_prompt_async(request.prompt)
        
        # Convert to Pydantic models
        components = [
            ComponentInfo(
                name=comp.name,
                type=comp.type,
                description=comp.description,
                inputs=comp.inputs,
                outputs=comp.outputs,
                code=comp.code,
                parameters=comp.parameters
            )
            for comp in components_internal
        ]
        
        generation_time = time.time() - start_time
        
        logger.info(f"Successfully generated {len(components)} components in {generation_time:.2f}s")
        
        return ComponentResponse(
            success=True,
            components=components,
            generation_time=generation_time
        )
        
    except Exception as e:
        logger.error(f"Error generating components: {str(e)}")
        return ComponentResponse(
            success=False,
            error=str(e),
            generation_time=time.time() - start_time
        )

@app.post("/validate-architecture")
async def validate_architecture_endpoint(architecture: Dict[str, Any]):
    """Validate an architecture structure"""
    try:
        is_valid = generator.validate_architecture(architecture)
        return {
            "valid": is_valid,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "timestamp": datetime.now().isoformat()}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error", 
            "timestamp": datetime.now().isoformat()
        }
    )

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting Visual Programming Architecture Generator API...")
    print("📝 API Documentation: http://localhost:8000/docs")
    print("🔄 Full Architecture Generation with Maximum Connectivity!")
    
    uvicorn.run(
        app,
        host="localhost",
        port=8002,
        reload=False,  # Disabled to avoid import string warning
        log_level="info"
    )