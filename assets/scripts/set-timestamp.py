#!/usr/bin/env python3
# For testing rulesets by changing timestams, forcing recomopilation

import os
import sys
from datetime import datetime

def get_timestamp():
    """Generate timestamp string down to the minute."""
    return f"// Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M')}"

def add_timestamps(directory="functions/src"):
    """Add timestamp to the first line of all .ts files."""
    timestamp = get_timestamp()
    files_modified = 0

    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.ts'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()

                    # Skip if timestamp already exists
                    if lines and lines[0].startswith('// Timestamp:'):
                        continue

                    # Add timestamp as first line
                    lines.insert(0, timestamp + '\n')

                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.writelines(lines)

                    files_modified += 1
                    print(f"Added timestamp to: {file_path}")

                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

    print(f"Total files modified: {files_modified}")

def remove_timestamps(directory="functions/src"):
    """Remove timestamp from the first line of all .ts files."""
    files_modified = 0

    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.ts'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()

                    # Remove timestamp if it exists as first line
                    if lines and lines[0].startswith('// Timestamp:'):
                        lines.pop(0)

                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.writelines(lines)

                        files_modified += 1
                        print(f"Removed timestamp from: {file_path}")

                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

    print(f"Total files modified: {files_modified}")

if __name__ == "__main__":
    #lil explainer for other persons
    if len(sys.argv) < 2:
        print("Usage: python set-timestamp.py [add|remove] [directory]")
        print("  add - Add timestamps to .ts files")
        print("  remove - Remove timestaps from .ts files")
        print("  directory - Optional directory to process (defaults to functions/src)")
        sys.exit(1)

    action = sys.argv[1]
    directory = sys.argv[2] if len(sys.argv) > 2 else "functions/src"

    if action == "add":
        add_timestamps(directory)
    elif action == "remove":
        remove_timestamps(directory)
    else:
        print("Invalid action. Use 'add' or 'remove'")
        sys.exit(1)