#!/usr/bin/env python3
"""
Minimal script to unpack zlib compressed files.
Usage: python unpack.py <input_file>
"""

import sys
import zlib
import os
import json
from pathlib import Path

def unpack_zlib_file(input_file):
    """Unpack a zlib compressed file and save to unpacked directory."""
    
    # Validate input file exists
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' does not exist")
        return False
    
    # Create output directory
    script_dir = Path(__file__).parent
    output_dir = script_dir / "unpacked"
    output_dir.mkdir(exist_ok=True)
    
    # Generate output filename
    input_path = Path(input_file)
    output_filename = input_path.stem  # Remove extension
    if output_filename.endswith('.json'):
        output_filename = output_filename[:-5]  # Remove .json if present
    output_filename += '_unpacked.json'
    output_path = output_dir / output_filename
    
    try:
        # Read and decompress the zlib file
        with open(input_file, 'rb') as f:
            compressed_data = f.read()
        
        print(f"Reading {len(compressed_data)} bytes from '{input_file}'")
        
        # Decompress using zlib
        decompressed_data = zlib.decompress(compressed_data)
        print(f"Decompressed to {len(decompressed_data)} bytes")
        
        # Try to parse as JSON and pretty print it
        try:
            json_data = json.loads(decompressed_data.decode('utf-8'))
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, indent=2)
            print(f"✅ Successfully unpacked and formatted JSON to: {output_path}")
            
            # Print some basic info about the data
            if isinstance(json_data, dict):
                print(f"📊 Data summary:")
                for key, value in json_data.items():
                    if isinstance(value, list):
                        print(f"  - {key}: {len(value)} items")
                    else:
                        print(f"  - {key}: {type(value).__name__}")
                        
        except json.JSONDecodeError:
            # If not JSON, save as text
            text_output_path = output_dir / (output_filename.replace('.json', '.txt'))
            with open(text_output_path, 'w', encoding='utf-8') as f:
                f.write(decompressed_data.decode('utf-8'))
            print(f"✅ Successfully unpacked to text file: {text_output_path}")
        
        return True
        
    except zlib.error as e:
        print(f"❌ Error decompressing file: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    """Main function to handle command line arguments."""
    if len(sys.argv) != 2:
        print("Usage: python unpack.py <input_file>")
        print("Example: python unpack.py /path/to/file.zlib")
        sys.exit(1)
    
    input_file = sys.argv[1]
    success = unpack_zlib_file(input_file)
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()