from pathlib import Path

path = Path("/tmp/os_tracer_demo.txt")
path.write_text("Operating Systems Mini Project\nSystem Call Tracer\n")
content = path.read_text()
print(content, end="")
path.unlink(missing_ok=True)
