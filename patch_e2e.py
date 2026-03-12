import yaml

with open('docker-compose.e2e.yml', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if skip:
        if line.startswith('      frontend:') or line.startswith('        condition:'):
            continue
        skip = False

    if line.startswith('    depends_on:'):
        new_lines.append(line)
        if 'backend:' in lines[i+1]:
            # This is the frontend depends_on block
            if 'frontend:' not in lines[i+1]:
                # skip next lines up to empty line or next block
                pass
        continue

