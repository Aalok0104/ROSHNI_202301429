import sys

def init():
    sys.stderr.write("DEBUG: mutmut_config.py loaded\n")

def pre_mutation(context):
    sys.stderr.write(f"DEBUG: Checking {context.filename}\n")
    if context.filename.endswith('app/env.py'):
        sys.stderr.write(f"DEBUG: Skipping {context.filename}\n")
        context.skip = True
