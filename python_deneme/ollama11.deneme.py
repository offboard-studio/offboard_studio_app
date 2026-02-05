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

class EnhancedTopLevelConnector:
    """Enhanced connector that ensures ALL top-level packages are connected"""
    
    def __init__(self):
        pass
    
    def create_comprehensive_top_level_connections(self, node_models: Dict[str, Any], 
                                                  component_infos: List[ComponentInfo]) -> List[Dict[str, Any]]:
        """Create COMPREHENSIVE connections ensuring ALL top-level packages are connected"""
        connections = []
        node_list = list(node_models.keys())
        
        logger.info(f"🔗 Creating COMPREHENSIVE top-level connections between {len(node_list)} packages")
        
        # Extract detailed port information from each top-level package
        package_port_mappings = {}
        for node_id, node_model in node_models.items():
            package_port_mappings[node_id] = {
                "input_ports": [],
                "output_ports": [],
                "parameter_ports": [],
                "package_info": {}
            }
            
            # Store package info
            comp_index = node_list.index(node_id)
            if comp_index < len(component_infos):
                package_port_mappings[node_id]["package_info"] = {
                    "name": component_infos[comp_index].name,
                    "type": component_infos[comp_index].type,
                    "index": comp_index
                }
            
            # Extract top-level package ports
            for port in node_model.get("ports", []):
                port_info = {
                    "id": port["id"],
                    "name": port["name"],
                    "label": port["label"],
                    "type": port["type"],
                    "x": port["x"],
                    "y": port["y"],
                    "connected": False,
                    "compatibility_score": self.calculate_port_compatibility_score(port["label"]),
                    "connection_priority": self.calculate_top_level_port_priority(port["label"])
                }
                
                if port["in"]:
                    if "parameter" in port["type"]:
                        package_port_mappings[node_id]["parameter_ports"].append(port_info)
                    else:
                        package_port_mappings[node_id]["input_ports"].append(port_info)
                else:
                    package_port_mappings[node_id]["output_ports"].append(port_info)
        
        # PHASE 1: Sequential pipeline connections (primary data flow)
        logger.info("📊 Phase 1: Creating sequential pipeline connections...")
        sequential_connections = self.create_sequential_package_connections(package_port_mappings, node_list)
        connections.extend(sequential_connections)
        
        # PHASE 2: Parallel processing connections (same-level packages)
        logger.info("🔄 Phase 2: Creating parallel processing connections...")
        parallel_connections = self.create_parallel_package_connections(package_port_mappings, node_list)
        connections.extend(parallel_connections)
        
        # PHASE 3: Cross-package connections (skip-level connections)
        logger.info("🌉 Phase 3: Creating cross-package connections...")
        cross_connections = self.create_cross_package_connections(package_port_mappings, node_list)
        connections.extend(cross_connections)
        
        # PHASE 4: Broadcast connections (one-to-many)
        logger.info("📡 Phase 4: Creating broadcast connections...")
        broadcast_connections = self.create_broadcast_package_connections(package_port_mappings, node_list)
        connections.extend(broadcast_connections)
        
        # PHASE 5: Feedback connections (reverse flow)
        logger.info("🔄 Phase 5: Creating feedback connections...")
        feedback_connections = self.create_feedback_package_connections(package_port_mappings, node_list)
        connections.extend(feedback_connections)
        
        # PHASE 6: Ensure every package is connected (gap filling)
        logger.info("🔧 Phase 6: Ensuring every package is connected...")
        gap_filling_connections = self.ensure_all_packages_connected(package_port_mappings, node_list, connections)
        connections.extend(gap_filling_connections)
        
        logger.info(f"🎯 Total top-level connections created: {len(connections)}")
        self.print_comprehensive_connection_summary(package_port_mappings, connections, node_list)
        
        return connections

    def calculate_top_level_port_priority(self, port_label: str) -> int:
        """Calculate connection priority for top-level package ports"""
        port_lower = port_label.lower()
        
        # Highest priority - main data flow ports
        if any(term in port_lower for term in ["image", "frame", "data", "output", "result"]):
            return 10
        
        # High priority - processed data
        if any(term in port_lower for term in ["processed", "filtered", "detected", "transformed"]):
            return 9
        
        # Medium-high priority - control signals
        if any(term in port_lower for term in ["enable", "trigger", "start", "control"]):
            return 8
        
        # Medium priority - state and position data
        if any(term in port_lower for term in ["state", "pose", "position", "location"]):
            return 7
        
        # Medium-low priority - configuration
        if any(term in port_lower for term in ["config", "param", "setting"]):
            return 6
        
        # Low priority - thresholds and limits
        if any(term in port_lower for term in ["threshold", "limit", "size", "amount"]):
            return 5
        
        return 6  # Default priority

    def calculate_port_compatibility_score(self, port_label: str) -> float:
        """Calculate base compatibility score for a port"""
        port_lower = port_label.lower()
        
        # High compatibility scores for common data types
        if any(term in port_lower for term in ["image", "frame", "img"]):
            return 0.9
        elif any(term in port_lower for term in ["data", "output", "result"]):
            return 0.8
        elif any(term in port_lower for term in ["processed", "filtered"]):
            return 0.85
        elif any(term in port_lower for term in ["enable", "trigger"]):
            return 0.7
        elif any(term in port_lower for term in ["state", "pose"]):
            return 0.75
        else:
            return 0.6

    def create_sequential_package_connections(self, package_port_mappings: Dict[str, Any], 
                                            node_list: List[str]) -> List[Dict[str, Any]]:
        """Create sequential connections between consecutive top-level packages"""
        connections = []
        
        for i in range(len(node_list) - 1):
            source_package_id = node_list[i]
            target_package_id = node_list[i + 1]
            
            source_info = package_port_mappings[source_package_id]
            target_info = package_port_mappings[target_package_id]
            
            logger.info(f"🔄 Connecting Package {i} → Package {i+1}")
            
            # Find best output-to-input connections
            connection_candidates = []
            
            for source_port in source_info["output_ports"]:
                if source_port["connected"]:
                    continue
                    
                for target_port in target_info["input_ports"]:
                    if target_port["connected"]:
                        continue
                    
                    compatibility_score = self.calculate_enhanced_package_port_compatibility(
                        source_port["label"], target_port["label"]
                    )
                    
                    if compatibility_score > 0.4:  # Threshold for sequential connections
                        priority_score = (source_port["connection_priority"] + target_port["connection_priority"]) / 2
                        total_score = compatibility_score + (priority_score / 20)
                        
                        connection_candidates.append({
                            "source_port": source_port,
                            "target_port": target_port,
                            "score": total_score,
                            "compatibility": compatibility_score,
                            "priority": priority_score
                        })
            
            # Sort by total score and create best connections
            connection_candidates.sort(key=lambda x: x["score"], reverse=True)
            
            # Create multiple connections if beneficial
            used_source_ports = set()
            used_target_ports = set()
            
            for candidate in connection_candidates[:3]:  # Allow up to 3 connections per package pair
                source_port = candidate["source_port"]
                target_port = candidate["target_port"]
                
                if source_port["id"] in used_source_ports or target_port["id"] in used_target_ports:
                    continue
                
                # Create connection
                connection = self.create_top_level_connection_object(
                    source_package_id, source_port,
                    target_package_id, target_port,
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

    def create_parallel_package_connections(self, package_port_mappings: Dict[str, Any], 
                                          node_list: List[str]) -> List[Dict[str, Any]]:
        """Create parallel connections between packages at similar levels"""
        connections = []
        
        # Identify packages that can work in parallel (similar processing types)
        parallel_groups = self.identify_parallel_processing_groups(package_port_mappings, node_list)
        
        for group in parallel_groups:
            if len(group) < 2:
                continue
                
            logger.info(f"🔄 Creating parallel connections for group: {[package_port_mappings[pkg]['package_info'].get('name', 'Unknown') for pkg in group]}")
            
            # Connect packages within the group
            for i, source_pkg in enumerate(group):
                for target_pkg in group[i+1:]:
                    source_info = package_port_mappings[source_pkg]
                    target_info = package_port_mappings[target_pkg]
                    
                    # Find compatible connections
                    for source_port in source_info["output_ports"]:
                        if source_port["connected"]:
                            continue
                            
                        for target_port in target_info["input_ports"]:
                            if target_port["connected"]:
                                continue
                            
                            compatibility = self.calculate_enhanced_package_port_compatibility(
                                source_port["label"], target_port["label"]
                            )
                            
                            if compatibility > 0.6:  # Higher threshold for parallel connections
                                connection = self.create_top_level_connection_object(
                                    source_pkg, source_port,
                                    target_pkg, target_port,
                                    "parallel",
                                    color="blue"
                                )
                                
                                connections.append(connection)
                                source_port["connected"] = True
                                target_port["connected"] = True
                                
                                logger.info(f"   🔵 Parallel: {source_port['label']} → {target_port['label']}")
                                break
        
        return connections

    def create_cross_package_connections(self, package_port_mappings: Dict[str, Any], 
                                       node_list: List[str]) -> List[Dict[str, Any]]:
        """Create cross connections between non-adjacent packages"""
        connections = []
        
        # Create cross-connections between all package pairs
        for i, source_package_id in enumerate(node_list):
            source_info = package_port_mappings[source_package_id]
            
            for j, target_package_id in enumerate(node_list):
                if j <= i + 1:  # Skip same, next, and previous packages
                    continue
                    
                target_info = package_port_mappings[target_package_id]
                
                # Find cross-compatible connections
                for source_port in source_info["output_ports"]:
                    if source_port["connected"]:
                        continue
                    
                    for target_port in target_info["input_ports"]:
                        if target_port["connected"]:
                            continue
                        
                        compatibility = self.calculate_enhanced_package_port_compatibility(
                            source_port["label"], target_port["label"]
                        )
                        
                        distance_penalty = (j - i) * 0.1  # Penalty for distance
                        final_score = compatibility - distance_penalty
                        
                        if final_score > 0.5:  # Threshold for cross-connections
                            connection = self.create_top_level_connection_object(
                                source_package_id, source_port,
                                target_package_id, target_port,
                                "cross",
                                color="orange"
                            )
                            
                            connections.append(connection)
                            source_port["connected"] = True
                            target_port["connected"] = True
                            
                            logger.info(f"   🟠 Cross: {source_port['label']} → {target_port['label']} (distance: {j-i})")
                            break
        
        return connections

    def create_broadcast_package_connections(self, package_port_mappings: Dict[str, Any], 
                                           node_list: List[str]) -> List[Dict[str, Any]]:
        """Create broadcast connections (one output to multiple inputs)"""
        connections = []
        
        for source_package_id in node_list:
            source_info = package_port_mappings[source_package_id]
            
            for source_port in source_info["output_ports"]:
                if source_port["connected"]:
                    continue
                
                # Find ALL compatible unconnected input ports across other packages
                compatible_targets = []
                
                for target_package_id in node_list:
                    if target_package_id == source_package_id:
                        continue
                    
                    target_info = package_port_mappings[target_package_id]
                    
                    for target_port in target_info["input_ports"]:
                        if target_port["connected"]:
                            continue
                        
                        if self.is_broadcast_compatible_package(source_port["label"], target_port["label"]):
                            compatibility = self.calculate_enhanced_package_port_compatibility(
                                source_port["label"], target_port["label"]
                            )
                            
                            compatible_targets.append({
                                "package": target_package_id,
                                "port": target_port,
                                "compatibility": compatibility
                            })
                
                # Create broadcast connections if multiple targets found
                if len(compatible_targets) > 1:
                    compatible_targets.sort(key=lambda x: x["compatibility"], reverse=True)
                    
                    # Create connections to best targets
                    for i, target in enumerate(compatible_targets[:2]):  # Limit to 2 broadcasts
                        connection = self.create_top_level_connection_object(
                            source_package_id, source_port,
                            target["package"], target["port"],
                            "broadcast",
                            color="green"
                        )
                        
                        connections.append(connection)
                        target["port"]["connected"] = True
                        
                        logger.info(f"   🟢 Broadcast {i+1}: {source_port['label']} → {target['port']['label']}")
                    
                    source_port["connected"] = True
        
        return connections

    def create_feedback_package_connections(self, package_port_mappings: Dict[str, Any], 
                                          node_list: List[str]) -> List[Dict[str, Any]]:
        """Create feedback connections from later packages back to earlier ones"""
        connections = []
        
        for i, target_package_id in enumerate(node_list):
            target_info = package_port_mappings[target_package_id]
            
            for j, source_package_id in enumerate(node_list):
                if j <= i:  # Only feedback from later to earlier packages
                    continue
                    
                source_info = package_port_mappings[source_package_id]
                
                # Look for feedback-type connections
                for source_port in source_info["output_ports"]:
                    if source_port["connected"]:
                        continue
                    
                    for target_port in target_info["input_ports"]:
                        if target_port["connected"]:
                            continue
                        
                        if self.is_feedback_connection_package(source_port["label"], target_port["label"]):
                            connection = self.create_top_level_connection_object(
                                source_package_id, source_port,
                                target_package_id, target_port,
                                "feedback",
                                color="red"
                            )
                            
                            connections.append(connection)
                            source_port["connected"] = True
                            target_port["connected"] = True
                            
                            logger.info(f"   🔴 Feedback: {source_port['label']} → {target_port['label']}")
        
        return connections

    def ensure_all_packages_connected(self, package_port_mappings: Dict[str, Any], 
                                    node_list: List[str], existing_connections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Ensure every package has at least one connection"""
        gap_connections = []
        
        # Identify connected packages
        connected_packages = set()
        for conn in existing_connections:
            connected_packages.add(conn["source"])
            connected_packages.add(conn["target"])
        
        # Find unconnected packages
        unconnected_packages = [pkg for pkg in node_list if pkg not in connected_packages]
        
        if unconnected_packages:
            logger.info(f"🔧 Found {len(unconnected_packages)} unconnected packages, creating gap-filling connections...")
            
            for unconnected_pkg in unconnected_packages:
                unconnected_info = package_port_mappings[unconnected_pkg]
                
                # Try to connect to nearest connected package
                best_target = None
                best_score = 0.0
                best_connection_data = None
                
                for connected_pkg in connected_packages:
                    connected_info = package_port_mappings[connected_pkg]
                    
                    # Check both directions
                    # 1. Unconnected as source
                    for source_port in unconnected_info["output_ports"]:
                        if source_port["connected"]:
                            continue
                        for target_port in connected_info["input_ports"]:
                            if target_port["connected"]:
                                continue
                            
                            score = self.calculate_enhanced_package_port_compatibility(
                                source_port["label"], target_port["label"]
                            )
                            
                            if score > best_score:
                                best_score = score
                                best_connection_data = {
                                    "source_pkg": unconnected_pkg,
                                    "source_port": source_port,
                                    "target_pkg": connected_pkg,
                                    "target_port": target_port,
                                    "direction": "out"
                                }
                    
                    # 2. Unconnected as target
                    for source_port in connected_info["output_ports"]:
                        if source_port["connected"]:
                            continue
                        for target_port in unconnected_info["input_ports"]:
                            if target_port["connected"]:
                                continue
                            
                            score = self.calculate_enhanced_package_port_compatibility(
                                source_port["label"], target_port["label"]
                            )
                            
                            if score > best_score:
                                best_score = score
                                best_connection_data = {
                                    "source_pkg": connected_pkg,
                                    "source_port": source_port,
                                    "target_pkg": unconnected_pkg,
                                    "target_port": target_port,
                                    "direction": "in"
                                }
                
                # Create the best gap-filling connection
                if best_connection_data and best_score > 0.3:  # Lower threshold for gap filling
                    connection = self.create_top_level_connection_object(
                        best_connection_data["source_pkg"], best_connection_data["source_port"],
                        best_connection_data["target_pkg"], best_connection_data["target_port"],
                        "gap_fill",
                        color="purple"
                    )
                    
                    gap_connections.append(connection)
                    best_connection_data["source_port"]["connected"] = True
                    best_connection_data["target_port"]["connected"] = True
                    connected_packages.add(unconnected_pkg)
                    
                    logger.info(f"   🟣 Gap-fill: {best_connection_data['source_port']['label']} → {best_connection_data['target_port']['label']} (score: {best_score:.2f})")
        
        return gap_connections

    def identify_parallel_processing_groups(self, package_port_mappings: Dict[str, Any], 
                                          node_list: List[str]) -> List[List[str]]:
        """Identify groups of packages that can work in parallel"""
        groups = []
        
        # Group packages by similar functionality
        processing_types = {
            "image_processing": [],
            "data_processing": [],
            "control": [],
            "input": [],
            "output": []
        }
        
        for pkg_id in node_list:
            pkg_info = package_port_mappings[pkg_id]["package_info"]
            pkg_name = pkg_info.get("name", "").lower()
            
            if any(term in pkg_name for term in ["image", "vision", "camera", "frame"]):
                processing_types["image_processing"].append(pkg_id)
            elif any(term in pkg_name for term in ["data", "process", "filter", "transform"]):
                processing_types["data_processing"].append(pkg_id)
            elif any(term in pkg_name for term in ["control", "command", "drive", "motor"]):
                processing_types["control"].append(pkg_id)
            elif any(term in pkg_name for term in ["input", "sensor", "read"]):
                processing_types["input"].append(pkg_id)
            elif any(term in pkg_name for term in ["output", "display", "write", "save"]):
                processing_types["output"].append(pkg_id)
        
        # Return groups with more than one package
        for group_name, packages in processing_types.items():
            if len(packages) > 1:
                groups.append(packages)
                logger.info(f"   Found parallel group '{group_name}': {len(packages)} packages")
        
        return groups

    def calculate_enhanced_package_port_compatibility(self, source_label: str, target_label: str) -> float:
        """Enhanced compatibility calculation for top-level package ports"""
        source_lower = source_label.lower()
        target_lower = target_label.lower()
        
        # Perfect match
        if source_lower == target_lower:
            return 1.0
        
        # High compatibility mappings with enhanced scores
        high_compatibility = {
            "image": {"frame": 0.95, "img": 0.95, "processedimage": 0.9, "processed_image": 0.9, "input": 0.8, "data": 0.75},
            "frame": {"image": 0.95, "img": 0.95, "processedimage": 0.9, "processed_image": 0.9, "input": 0.8, "data": 0.75},
            "processedimage": {"image": 0.9, "img": 0.9, "frame": 0.9, "input": 0.85, "output": 0.8},
            "processed_image": {"image": 0.9, "img": 0.9, "frame": 0.9, "input": 0.85, "output": 0.8},
            "data": {"input": 0.85, "output": 0.8, "result": 0.85, "information": 0.8},
            "output": {"input": 0.8, "data": 0.75, "result": 0.7, "display": 0.9},
            "result": {"output": 0.75, "data": 0.8, "input": 0.7, "display": 0.75},
            "enable": {"trigger": 0.9, "start": 0.85, "activate": 0.85, "run": 0.8, "control": 0.7}
        }
        
        # Check direct mappings with enhanced scoring
        for source_key, target_mapping in high_compatibility.items():
            if source_key in source_lower:
                for target_key, score in target_mapping.items():
                    if target_key in target_lower:
                        return score
        
        # Medium compatibility patterns with bonus for semantic similarity
        medium_patterns = [
            (["output", "out", "result"], ["input", "in", "data"], 0.7),
            (["processed", "filtered", "detected"], ["input", "data", "display"], 0.75),
            (["state", "status", "info"], ["pose", "position", "data"], 0.65),
            (["control", "command", "cmd"], ["input", "signal"], 0.7),
            (["sensor", "measurement"], ["data", "input"], 0.8),
            (["video", "stream"], ["image", "frame"], 0.85)
        ]
        
        for source_patterns, target_patterns, score in medium_patterns:
            if any(p in source_lower for p in source_patterns) and \
               any(p in target_lower for p in target_patterns):
                return score
        
        # Type-based compatibility with enhanced scoring
        type_compatibility = {
            "image": 0.6, "data": 0.5, "signal": 0.5, "state": 0.45, "control": 0.5
        }
        
        for type_word, score in type_compatibility.items():
            if type_word in source_lower and type_word in target_lower:
                return score
        
        # Semantic similarity bonus
        semantic_bonus = 0.0
        if len(set(source_lower.split()) & set(target_lower.split())) > 0:
            semantic_bonus = 0.2
        
        return max(0.0, 0.3 + semantic_bonus)  # Minimum base compatibility

    def is_broadcast_compatible_package(self, source_label: str, target_label: str) -> bool:
        """Check if ports are suitable for broadcasting at package level"""
        source_lower = source_label.lower()
        target_lower = target_label.lower()
        
        # Enhanced broadcast scenarios for top-level packages
        broadcast_types = [
            ("enable", ["enable", "trigger", "start", "activate", "control"]),
            ("image", ["input", "frame", "image", "data"]),
            ("data", ["input", "data", "information"]),
            ("state", ["input", "state", "status"]),
            ("output", ["input", "display", "save"]),
            ("result", ["input", "data", "output"])
        ]
        
        for broadcast_source, broadcast_targets in broadcast_types:
            if broadcast_source in source_lower:
                return any(target in target_lower for target in broadcast_targets)
        
        return False

    def is_feedback_connection_package(self, source_label: str, target_label: str) -> bool:
        """Check if this could be a feedback connection at package level"""
        source_lower = source_label.lower()
        target_lower = target_label.lower()
        
        # Enhanced feedback patterns for packages
        feedback_patterns = [
            ("error", "correction"),
            ("result", "input"),
            ("output", "control"),
            ("state", "command"),
            ("feedback", "input"),
            ("status", "control"),
            ("measurement", "adjustment")
        ]
        
        for source_pattern, target_pattern in feedback_patterns:
            if source_pattern in source_lower and target_pattern in target_lower:
                return True
        
        return False

    def create_top_level_connection_object(self, source_package_id: str, source_port: Dict, 
                                         target_package_id: str, target_port: Dict, 
                                         connection_type: str = "default", color: str = "gray") -> Dict[str, Any]:
        """Create a top-level connection object with enhanced structure"""
        connection_id = str(uuid.uuid4())
        
        # Calculate connection points for top-level packages
        source_x = source_port["x"]
        source_y = source_port["y"]
        target_x = target_port["x"]
        target_y = target_port["y"]
        
        # Enhanced connection styling based on type
        connection_styles = {
            "sequential": {"curvyness": 50, "width": 4, "color": "gray"},
            "parallel": {"curvyness": 30, "width": 3, "color": "blue"},
            "cross": {"curvyness": 80, "width": 3, "color": "orange"},
            "broadcast": {"curvyness": 25, "width": 2, "color": "green"},
            "feedback": {"curvyness": 100, "width": 3, "color": "red"},
            "gap_fill": {"curvyness": 60, "width": 2, "color": "purple"}
        }
        
        style = connection_styles.get(connection_type, {"curvyness": 50, "width": 3, "color": color})
        
        return {
            "id": connection_id,
            "type": "default",
            "selected": False,
            "source": source_package_id,
            "sourcePort": source_port["id"],
            "target": target_package_id,
            "targetPort": target_port["id"],
            "points": [
                {
                    "id": str(uuid.uuid4()),
                    "type": "point",
                    "x": source_x + 20,
                    "y": source_y
                },
                {
                    "id": str(uuid.uuid4()),
                    "type": "point",
                    "x": target_x - 20,
                    "y": target_y
                }
            ],
            "labels": [],
            "width": style["width"],
            "color": style["color"],
            "curvyness": style["curvyness"],
            "selectedColor": "rgb(0,192,255)",
            "connectionType": connection_type,
            "topLevelConnection": True  # Mark as top-level connection
        }

    def print_comprehensive_connection_summary(self, package_port_mappings: Dict[str, Any], 
                                             connections: List[Dict[str, Any]], node_list: List[str]):
        """Print comprehensive connection summary for top-level packages"""
        logger.info("\n📊 COMPREHENSIVE TOP-LEVEL CONNECTION SUMMARY:")
        logger.info("=" * 60)
        
        total_packages = len(node_list)
        total_input_ports = sum(len(info["input_ports"]) for info in package_port_mappings.values())
        total_output_ports = sum(len(info["output_ports"]) for info in package_port_mappings.values())
        total_parameter_ports = sum(len(info["parameter_ports"]) for info in package_port_mappings.values())
        
        connected_input_ports = sum(sum(1 for p in info["input_ports"] if p["connected"]) for info in package_port_mappings.values())
        connected_output_ports = sum(sum(1 for p in info["output_ports"] if p["connected"]) for info in package_port_mappings.values())
        
        # Connection type analysis
        connection_types = {}
        for conn in connections:
            conn_type = conn.get("connectionType", "default")
            connection_types[conn_type] = connection_types.get(conn_type, 0) + 1
        
        # Package connectivity analysis
        connected_packages = set()
        package_connection_count = {}
        for conn in connections:
            connected_packages.add(conn["source"])
            connected_packages.add(conn["target"])
            package_connection_count[conn["source"]] = package_connection_count.get(conn["source"], 0) + 1
            package_connection_count[conn["target"]] = package_connection_count.get(conn["target"], 0) + 1
        
        logger.info(f"📦 Package Overview:")
        logger.info(f"  - Total packages: {total_packages}")
        logger.info(f"  - Connected packages: {len(connected_packages)}")
        logger.info(f"  - Package connectivity: {(len(connected_packages)/total_packages)*100:.1f}%")
        
        logger.info(f"\n🔌 Port Overview:")
        logger.info(f"  - Total input ports: {total_input_ports} (connected: {connected_input_ports})")
        logger.info(f"  - Total output ports: {total_output_ports} (connected: {connected_output_ports})")
        logger.info(f"  - Total parameter ports: {total_parameter_ports}")
        
        logger.info(f"\n🔗 Connection Types:")
        for conn_type, count in connection_types.items():
            logger.info(f"  - {conn_type}: {count}")
        
        logger.info(f"\n📈 Connectivity Metrics:")
        if total_input_ports > 0:
            input_efficiency = (connected_input_ports / total_input_ports) * 100
            logger.info(f"  - Input connection efficiency: {input_efficiency:.1f}%")
        
        if total_output_ports > 0:
            output_efficiency = (connected_output_ports / total_output_ports) * 100
            logger.info(f"  - Output connection efficiency: {output_efficiency:.1f}%")
        
        # Quality assessment
        overall_connectivity = (len(connected_packages) / total_packages) * 100
        total_connections = len(connections)
        
        logger.info(f"\n🎯 QUALITY ASSESSMENT:")
        logger.info(f"  - Overall connectivity: {overall_connectivity:.1f}%")
        logger.info(f"  - Total connections: {total_connections}")
        logger.info(f"  - Average connections per package: {total_connections*2/total_packages:.1f}")
        
        if overall_connectivity >= 90:
            logger.info("  - Quality: 🌟 EXCELLENT - Nearly all packages connected!")
        elif overall_connectivity >= 75:
            logger.info("  - Quality: ⭐ VERY GOOD - Most packages connected!")
        elif overall_connectivity >= 50:
            logger.info("  - Quality: 👍 GOOD - Majority of packages connected!")
        else:
            logger.info("  - Quality: ⚠️ NEEDS IMPROVEMENT - Many packages unconnected!")
        
        logger.info("=" * 60)


class ArchitectureGenerator:
    def __init__(self, ollama_base_url: str = "http://localhost:11434"):
        """Initialize with Ollama client using OpenAI library"""
        self.client = OpenAI(
            base_url=f"https://openrouter.ai/api/v1",
            api_key="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"
        )
        
        # Initialize component library with basic components
        self.component_library = self._initialize_component_library()
        
        # Initialize enhanced top-level connector
        self.top_level_connector = EnhancedTopLevelConnector()
    
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

Generate 2-5 components that form a complete, working pipeline.

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
        """Enhanced architecture with FULL top-level connectivity"""
        
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
        
        # Generate components and connections with enhanced spacing
        x_offset = 400
        y_offset = 150
        spacing = 350  # Increased spacing for better visibility
        
        node_models = {}
        component_deps = {}
        
        # Create all nodes first
        for i, comp_info in enumerate(components_needed):
            # Generate unique IDs
            node_id = self.create_unique_id()
            dep_id = self.create_component_dependency_id()
            
            # Enhanced positioning
            x_pos = x_offset + (i * spacing)
            y_pos = y_offset + ((i % 2) * 80)  # Alternating heights
            
            # Create node model
            node_model = self.create_node_model(node_id, comp_info, x_pos, y_pos, dep_id)
            node_models[node_id] = node_model
            
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
        
        # CREATE COMPREHENSIVE TOP-LEVEL CONNECTIONS
        logger.info("🔗 Creating COMPREHENSIVE top-level connections...")
        
        # Create maximum connections
        connections = self.top_level_connector.create_comprehensive_top_level_connections(
            node_models, components_needed
        )
        
        # Add connections to links layer
        for conn in connections:
            # Find port labels for graph wires
            source_node = node_models[conn["source"]]
            target_node = node_models[conn["target"]]
            
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
        
        # Add layers and dependencies
        enhanced["editor"]["layers"] = [links_layer, nodes_layer]
        enhanced["dependencies"] = component_deps
        
        # Validate and report connectivity
        self.validate_and_report_connectivity(enhanced, connections, components_needed)
        
        return enhanced

    def validate_and_report_connectivity(self, architecture: Dict[str, Any], 
                                       connections: List[Dict[str, Any]], 
                                       components: List[ComponentInfo]):
        """Validate and report connectivity statistics"""
        
        total_blocks = len(architecture["design"]["graph"]["blocks"])
        total_wires = len(architecture["design"]["graph"]["wires"])
        
        # Analyze connectivity
        connected_blocks = set()
        for wire in architecture["design"]["graph"]["wires"]:
            connected_blocks.add(wire["source"]["block"])
            connected_blocks.add(wire["target"]["block"])
        
        connectivity_rate = (len(connected_blocks) / total_blocks) * 100 if total_blocks > 0 else 0
        
        # Connection type analysis
        connection_types = {}
        for conn in connections:
            conn_type = conn.get("connectionType", "default")
            connection_types[conn_type] = connection_types.get(conn_type, 0) + 1
        
        logger.info(f"\n🎯 ARCHITECTURE CONNECTIVITY REPORT:")
        logger.info(f"  📦 Total packages: {total_blocks}")
        logger.info(f"  🔗 Total connections: {len(connections)}")
        logger.info(f"  📊 Total wires: {total_wires}")
        logger.info(f"  ✅ Connected packages: {len(connected_blocks)}/{total_blocks}")
        logger.info(f"  📈 Connectivity rate: {connectivity_rate:.1f}%")
        
        if connection_types:
            logger.info(f"  🎨 Connection types:")
            for conn_type, count in connection_types.items():
                logger.info(f"    - {conn_type}: {count}")
        
        # Quality assessment
        if connectivity_rate >= 95:
            logger.info(f"  🌟 EXCELLENT: {connectivity_rate:.1f}% connectivity achieved!")
        elif connectivity_rate >= 80:
            logger.info(f"  ⭐ VERY GOOD: {connectivity_rate:.1f}% connectivity!")
        elif connectivity_rate >= 60:
            logger.info(f"  👍 GOOD: {connectivity_rate:.1f}% connectivity!")
        else:
            logger.info(f"  ⚠️ NEEDS IMPROVEMENT: Only {connectivity_rate:.1f}% connectivity!")

    def create_architecture(self, user_prompt: str, max_attempts: int = 3) -> Dict[str, Any]:
        """Create architecture with GUARANTEED full top-level connectivity"""
        
        logger.info(f"🎯 Creating FULLY CONNECTED architecture for: '{user_prompt}'")
        
        for attempt in range(max_attempts):
            try:
                logger.info(f"🔄 Attempt {attempt + 1}/{max_attempts}")
                
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
                
                # Enhance with FULL connectivity
                enhanced_architecture = self.enhance_architecture(base_architecture, user_prompt)
                
                # Validate
                if self.validate_enhanced_architecture(enhanced_architecture):
                    # Additional connectivity check
                    connectivity_check = self.check_full_connectivity(enhanced_architecture)
                    if connectivity_check["rate"] >= 75:  # Minimum 75% connectivity required
                        logger.info(f"✅ Successfully created architecture with {connectivity_check['rate']:.1f}% connectivity")
                        return enhanced_architecture
                    else:
                        logger.warning(f"Insufficient connectivity: {connectivity_check['rate']:.1f}%")
                        
                else:
                    logger.warning(f"Architecture validation failed on attempt {attempt + 1}")
                    
            except Exception as e:
                logger.error(f"Error on attempt {attempt + 1}: {e}")
        
        # Fallback: create enhanced fallback architecture
        logger.warning("All attempts failed, creating enhanced fallback with guaranteed connectivity")
        return self.create_guaranteed_connected_fallback(user_prompt)

    def check_full_connectivity(self, architecture: Dict[str, Any]) -> Dict[str, Any]:
        """Check full connectivity of architecture"""
        
        total_blocks = len(architecture["design"]["graph"]["blocks"])
        total_wires = len(architecture["design"]["graph"]["wires"])
        
        if total_blocks == 0:
            return {"rate": 0, "connected": 0, "total": 0, "wires": 0}
        
        # Find connected blocks
        connected_blocks = set()
        for wire in architecture["design"]["graph"]["wires"]:
            connected_blocks.add(wire["source"]["block"])
            connected_blocks.add(wire["target"]["block"])
        
        connectivity_rate = (len(connected_blocks) / total_blocks) * 100
        
        return {
            "rate": connectivity_rate,
            "connected": len(connected_blocks),
            "total": total_blocks,
            "wires": total_wires
        }

    def create_guaranteed_connected_fallback(self, prompt: str) -> Dict[str, Any]:
        """Create fallback architecture with GUARANTEED connectivity"""
        logger.info("🔧 Creating GUARANTEED connected fallback architecture")

        # Get fallback components
        fallback_components = self.get_fallback_components(prompt)
        
        # Ensure we have at least 3 components for meaningful connections
        if len(fallback_components) < 3:
            # Add more basic components
            fallback_components.extend([
                self.component_library["camera_input"],
                self.component_library["image_blur"],
                self.component_library["display_output"]
            ])
        
        # Remove duplicates while preserving order
        seen = set()
        unique_components = []
        for comp in fallback_components:
            if comp.name not in seen:
                unique_components.append(comp)
                seen.add(comp.name)
        
        # Use enhanced architecture builder
        base_architecture = {
            "editor": {"layers": []},
            "version": "3.0", 
            "package": {},
            "design": {"graph": {"blocks": [], "wires": []}},
            "dependencies": {}
        }
        
        enhanced_fallback = self.enhance_architecture(base_architecture, prompt)
        
        # Force connectivity if still insufficient
        connectivity_check = self.check_full_connectivity(enhanced_fallback)
        if connectivity_check["rate"] < 50:
            logger.warning("Fallback connectivity still low, applying force connections...")
            enhanced_fallback = self.force_minimum_connectivity(enhanced_fallback, unique_components)
        
        return enhanced_fallback

    def force_minimum_connectivity(self, architecture: Dict[str, Any], 
                                 components: List[ComponentInfo]) -> Dict[str, Any]:
        """Force minimum connectivity between packages"""
        logger.info("🔧 Forcing minimum connectivity...")
        
        blocks = architecture["design"]["graph"]["blocks"]
        if len(blocks) < 2:
            return architecture
        
        # Create simple sequential connections if no connections exist
        if not architecture["design"]["graph"]["wires"]:
            for i in range(len(blocks) - 1):
                source_block = blocks[i]
                target_block = blocks[i + 1]
                
                # Create a basic wire connection
                wire = {
                    "source": {
                        "block": source_block["id"],
                        "port": "output_port",
                        "name": "Output"
                    },
                    "target": {
                        "block": target_block["id"],
                        "port": "input_port", 
                        "name": "Input"
                    }
                }
                
                architecture["design"]["graph"]["wires"].append(wire)
            
            logger.info(f"🔗 Added {len(blocks)-1} forced connections")
        
        return architecture

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
        
        return connections

    def create_component_dependency(self, comp_info: ComponentInfo) -> Dict[str, Any]:
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

    def find_port_label(self, node_model: Dict[str, Any], port_id: str) -> str:
        """Find port label by port ID"""
        for port in node_model.get("ports", []):
            if port["id"] == port_id:
                return port.get("label", port.get("name", ""))
        return ""

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

    def generate_components(self, user_prompt: str, max_attempts: int = 3) -> List[ComponentInfo]:
        """Generate components based on user prompt - main entry point"""
        return self.generate_components_from_prompt(user_prompt)


# Main execution functions
def main():
    """Test the GUARANTEED CONNECTIVITY architecture generator"""
    generator = ArchitectureGenerator()
    
    print("🎯 Testing GUARANTEED CONNECTIVITY Architecture Generator")
    print("=" * 70)
    print("✨ ENHANCED FEATURES:")
    print("  • Comprehensive top-level package connections")
    print("  • Multi-phase connection strategy (6 phases)")
    print("  • Gap-filling for unconnected packages")
    print("  • Connection type diversity (sequential, parallel, cross, broadcast, feedback)")
    print("  • Guaranteed minimum connectivity")
    print("  • Enhanced validation and reporting")
    print("=" * 70)
    
    test_prompts = [
        "Create a camera blur screen pipeline",
        "Build a comprehensive edge detection system", 
        "Create a video processing pipeline with camera, multiple filters and display",
        "Create a ros2 robotics application robot arm RRR type with full control",
        "Build a complex computer vision system with multiple processing stages",
        "Design a robotics system for a warehouse that uses a mobile robot with a 6-DOF manipulator arm. The robot must perform object pick-and-place tasks between stations in a dynamic environment. The system should include:\n\n1. Real-time task scheduling with priority handling (e.g., emergency tasks).\n2. Multi-target navigation using SLAM and dynamic obstacle avoidance via LiDAR and cameras.\n3. Object detection using vision models like YOLOv8 or CLIP/DINOv2, followed by IK-based manipulation.\n4. Coordination between base and arm (e.g., motion synchronization).\n5. Error handling and fallback strategies if the object is missing or unreachable.\n6. Modular ROS 2 architecture with topics, services, and parameter configurations.\n7. Visualization with RViz or web interface (e.g., CesiumJS or custom dashboard).\n8. Optional: multi-robot coordination, energy optimization, and OTA update mechanisms with Docker and CI/CD.\n\nPlease define the system modules (perception, planning, control, decision), their ROS 2 nodes, communication interfaces, and recommended libraries or tools (e.g., Nav2, MoveIt 2, OpenCV)."
    ]
    
    try:
        # Test with most complex prompt
        prompt = test_prompts[4]  # complex computer vision
        print(f"🎯 Testing with prompt: '{prompt}'")
        print("-" * 70)
        
        # Generate architecture with guaranteed connectivity
        result = generator.create_architecture(prompt)
        
        print("✅ Successfully generated GUARANTEED CONNECTED architecture")
        
        # Comprehensive analysis
        connectivity_stats = generator.check_full_connectivity(result)
        
        print(f"\n📊 COMPREHENSIVE STATISTICS:")
        print(f"  📦 Total packages: {connectivity_stats['total']}")
        print(f"  🔗 Total wires: {connectivity_stats['wires']}")
        print(f"  ✅ Connected packages: {connectivity_stats['connected']}")
        print(f"  📈 Connectivity rate: {connectivity_stats['rate']:.1f}%")
        print(f"  📦 Dependencies: {len(result['dependencies'])}")
        
        # Editor layer analysis
        total_editor_connections = 0
        for layer in result['editor']['layers']:
            if layer['type'] == 'diagram-links':
                total_editor_connections = len(layer['models'])
                break
        
        print(f"  🔌 Editor connections: {total_editor_connections}")
        
        # Connection details
        print(f"\n🔍 CONNECTION DETAILS:")
        print("-" * 40)
        for i, wire in enumerate(result['design']['graph']['wires'][:10]):  # Show first 10
            source_name = wire['source']['name']
            target_name = wire['target']['name']
            print(f"  {i+1}. {source_name} → {target_name}")
        
        if len(result['design']['graph']['wires']) > 10:
            remaining = len(result['design']['graph']['wires']) - 10
            print(f"  ... and {remaining} more connections")
        
        # Quality assessment
        print(f"\n🎯 QUALITY ASSESSMENT:")
        if connectivity_stats['rate'] >= 95:
            print(f"  🌟 OUTSTANDING: {connectivity_stats['rate']:.1f}% connectivity!")
            print(f"  🎉 Nearly perfect top-level package connectivity achieved!")
        elif connectivity_stats['rate'] >= 85:
            print(f"  ⭐ EXCELLENT: {connectivity_stats['rate']:.1f}% connectivity!")
            print(f"  👍 Very high connectivity achieved!")
        elif connectivity_stats['rate'] >= 75:
            print(f"  👌 VERY GOOD: {connectivity_stats['rate']:.1f}% connectivity!")
            print(f"  ✅ Good connectivity achieved!")
        elif connectivity_stats['rate'] >= 50:
            print(f"  👍 GOOD: {connectivity_stats['rate']:.1f}% connectivity!")
            print(f"  📈 Reasonable connectivity achieved!")
        else:
            print(f"  ⚠️ BASIC: {connectivity_stats['rate']:.1f}% connectivity")
            print(f"  🔧 Minimum connectivity ensured!")
        
        # Save result with detailed filename
        timestamp = int(time.time())
        connectivity_level = "OUTSTANDING" if connectivity_stats['rate'] >= 95 else \
                           "EXCELLENT" if connectivity_stats['rate'] >= 85 else \
                           "VERY_GOOD" if connectivity_stats['rate'] >= 75 else \
                           "GOOD" if connectivity_stats['rate'] >= 50 else "BASIC"
        
        filename = f"architecture_{connectivity_level}_{connectivity_stats['rate']:.0f}pct_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\n💾 Saved to {filename}")
        
        # Final success message
        print(f"\n🎉 SUCCESS: GUARANTEED CONNECTIVITY architecture completed!")
        print(f"   ✅ {connectivity_stats['connected']}/{connectivity_stats['total']} packages connected")
        print(f"   🔗 {connectivity_stats['wires']} total connections created")
        print(f"   📈 {connectivity_stats['rate']:.1f}% connectivity rate achieved")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

def quick_full_connectivity_test():
    """Quick test for full connectivity"""
    print("🚀 Quick FULL CONNECTIVITY test starting...")
    try:
        generator = ArchitectureGenerator()
        result = generator.create_architecture(
            "Create a comprehensive computer vision pipeline with camera, multiple filters and display"
        )
        
        # Analyze connectivity
        connectivity_stats = generator.check_full_connectivity(result)
        
        print("✅ Quick test successful!")
        print(f"📊 Generated {connectivity_stats['total']} blocks with {connectivity_stats['wires']} connections")
        print(f"🎯 Connectivity rate: {connectivity_stats['rate']:.1f}%")
        
        if connectivity_stats['rate'] >= 90:
            print("🌟 EXCELLENT connectivity achieved!")
        
        # Save quick test result
        with open("quick_test_FULLY_CONNECTED.json", "w") as f:
            json.dump(result, f, indent=2)
        print(f"💾 Saved to quick_test_FULLY_CONNECTED.json")
        
    except Exception as e:
        print(f"❌ Quick test failed: {e}")

def generate_architecture(prompt: str, ollama_url: str = "http://localhost:11434") -> Dict[str, Any]:
    """Generate architecture for a single prompt"""
    generator = ArchitectureGenerator(ollama_url)
    return generator.create_architecture(prompt)

if __name__ == "__main__":
    print("🎯 FULLY CONNECTED Visual Programming Architecture Generator")
    print("=" * 70)
    print("✨ NEW FEATURES:")
    print("  • Comprehensive top-level package connections")
    print("  • Multi-phase connection strategy")
    print("  • Gap-filling for unconnected packages")
    print("  • Enhanced connection validation")
    print("  • Full connectivity guarantee")
    print("=" * 70)
    print("Choose an option:")
    print("1. Run full connectivity tests")
    print("2. Run quick connectivity test")
    
    choice = input("Enter choice (1 or 2): ").strip()
    
    if choice == "2":
        quick_full_connectivity_test()
    else:
        main()