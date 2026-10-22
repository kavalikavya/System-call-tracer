from flask import Flask, render_template, jsonify, request
from pathlib import Path
import subprocess
import tempfile
import re
import time

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
SAMPLES_DIR = BASE_DIR / "samples"

# Whitelist: browser can only select these programs.
SAMPLES = {
    "file_reader": {
        "name": "File Reader",
        "file": SAMPLES_DIR / "file_reader.py",
        "description": "Creates and reads a small text file."
    },
    "process_demo": {
        "name": "Process Demo",
        "file": SAMPLES_DIR / "process_demo.py",
        "description": "Creates a child process and waits for it."
    },
    "calculation": {
        "name": "Calculation Demo",
        "file": SAMPLES_DIR / "calculation.py",
        "description": "Performs a small CPU calculation."
    },
}

SYSCALL_RE = re.compile(r"\b([A-Za-z_][A-Za-z0-9_]*)\([^)]*\)\s*=\s*([^\s]+)")

def parse_trace(trace_text: str):
    counts = {}
    total_time = 0.0
    lines_seen = 0

    for line in trace_text.splitlines():
        lines_seen += 1

        # Extract syscall name from lines such as:
        # openat(...)=3 <0.000123>
        match = SYSCALL_RE.search(line)
        if match:
            name = match.group(1)
            counts[name] = counts.get(name, 0) + 1

        # strace -T prints syscall duration at the end.
        duration_match = re.search(r"<([0-9.]+)>$", line.strip())
        if duration_match:
            try:
                total_time += float(duration_match.group(1))
            except ValueError:
                pass

    total_calls = sum(counts.values())
    unique_calls = len(counts)

    rows = []
    for name, count in sorted(counts.items(), key=lambda item: (-item[1], item[0])):
        rows.append({
            "name": name,
            "count": count,
            "percentage": round((count / total_calls * 100), 2) if total_calls else 0
        })

    return {
        "total_calls": total_calls,
        "unique_calls": unique_calls,
        "trace_time": round(total_time, 6),
        "lines_seen": lines_seen,
        "calls": rows,
        "top_calls": rows[:10],
    }

def run_trace(sample_key: str):
    sample = SAMPLES.get(sample_key)
    if not sample:
        raise ValueError("Invalid sample program")

    with tempfile.NamedTemporaryFile(prefix="os_trace_", suffix=".txt", delete=False) as temp:
        trace_file = temp.name

    command = [
        "strace",
        "-f",
        "-tt",
        "-T",
        "-e", "trace=file,process,network,read,write,memory",
        "-o", trace_file,
        "python3",
        str(sample["file"])
    ]

    start = time.perf_counter()
    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=15
        )
    except FileNotFoundError:
        raise RuntimeError(
            "strace is not installed. On Ubuntu/WSL run: sudo apt install strace"
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("Trace timed out after 15 seconds.")
    finally:
        elapsed = time.perf_counter() - start

    try:
        trace_text = Path(trace_file).read_text(errors="replace")
    finally:
        Path(trace_file).unlink(missing_ok=True)

    if completed.returncode != 0:
        error = completed.stderr.strip() or "The sample program failed."
        raise RuntimeError(error[:500])

    result = parse_trace(trace_text)
    result["wall_time"] = round(elapsed, 6)
    result["program_output"] = completed.stdout.strip()
    return result

@app.route("/")
def index():
    return render_template("index.html", samples=SAMPLES)

@app.post("/api/trace")
def trace_api():
    data = request.get_json(silent=True) or {}
    sample_key = data.get("sample")

    try:
        result = run_trace(sample_key)
        result["sample"] = SAMPLES[sample_key]["name"]
        result["description"] = SAMPLES[sample_key]["description"]
        return jsonify({"ok": True, "result": result})
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

if __name__ == "__main__":
    app.run(debug=True)
