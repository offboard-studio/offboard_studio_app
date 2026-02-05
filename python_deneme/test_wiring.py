import importlib.util
import sys
import os

spec = importlib.util.spec_from_file_location("mod", "/Users/harunkurtdev/Desktop/offboard_studio_app/python_deneme/ollama7.deneme_calisiyor.py")
mod = importlib.util.module_from_spec(spec)
sys.modules["mod"] = mod
spec.loader.exec_module(mod)

ArchitectureGenerator = mod.ArchitectureGenerator
ComponentInfo = mod.ComponentInfo
ComponentType = mod.ComponentType

def test_wiring():
    gen = ArchitectureGenerator()
    
    # Create 3 components that SHOULD connect
    # 1. Source: [Output] ->
    # 2. Middle: [Input] -> [Processed] ->
    # 3. Sink:   [Processed]
    
    comps = [
        ComponentInfo(
            name="Source", type=ComponentType.BASIC_CODE, description="Src",
            inputs=["Enable"], outputs=["Output"], parameters=[], code=""
        ),
        ComponentInfo(
            name="Filter", type=ComponentType.BASIC_CODE, description="Mid",
            inputs=["Input"], outputs=["Processed"], parameters=[], code=""
        ),
        ComponentInfo(
            name="Sink", type=ComponentType.BASIC_CODE, description="Sink",
            inputs=["Processed"], outputs=[], parameters=[], code=""
        )
    ]
    
    print("Building architecture...")
    result = gen.build_full_architecture(comps)
    
    blocks = result['design']['graph']['blocks']
    wires = result['design']['graph']['wires']
    
    print(f"Blocks: {len(blocks)}")
    print(f"Wires: {len(wires)}")
    
    # Expected: 
    # Source(Output) -> Filter(Input) [Match via 'fallback' connect? Or loose match?]
    # Output vs Input: 'output' group vs 'data' group (with 'input'). No match.
    # Fallback logic should connect them (1 out, 1 in).
    
    # Filter(Processed) -> Sink(Processed)
    # Exact match 'Processed'. Should connect.
    
    if len(wires) >= 2:
        print("✅ SUCCESS: Wires created.")
        for w in wires:
            print(f"Wire: {w['source']['name']} -> {w['target']['name']}")
    else:
        print("❌ FAILURE: Not enough wires.")

if __name__ == "__main__":
    test_wiring()
