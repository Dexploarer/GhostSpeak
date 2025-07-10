import re

# Read the file
with open('programs/agent-marketplace/src/lib.rs', 'r') as f:
    content = f.read()

# Find all error code lines
pattern = r'(\s+\w+\s*=\s*)(\d+),'
matches = list(re.finditer(pattern, content))

# Track seen codes and fix duplicates
seen_codes = {}
next_code = 2135  # Start from a safe number

for match in matches:
    code = int(match.group(2))
    if code >= 2134:  # Only fix codes from 2134 onwards
        if code in seen_codes:
            # Replace with next available code
            content = content[:match.start(2)] + str(next_code) + content[match.end(2):]
            next_code += 1
        else:
            seen_codes[code] = True
            if code >= next_code:
                next_code = code + 1

# Write the fixed file
with open('programs/agent-marketplace/src/lib.rs', 'w') as f:
    f.write(content)

print(f"Fixed error codes. Next available code: {next_code}")
