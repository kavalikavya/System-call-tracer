from flask import Flask, render_template, jsonify, request
from pathlib import Path
import subprocess
import tempfile
import re
import time

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
SAMPLES_DIR = BASE_DIR / "samples"


# =========================================================
# SAMPLE PROGRAMS
# =========================================================

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


# =========================================================
# SYSTEM CALL CATEGORIES
# =========================================================

SYSCALL_CATEGORIES = {

    # File management
    "open": "File",
    "openat": "File",
    "close": "File",
    "stat": "File",
    "fstat": "File",
    "newfstatat": "File",
    "lstat": "File",
    "readlink": "File",
    "readlinkat": "File",
    "access": "File",
    "faccessat": "File",
    "unlink": "File",
    "unlinkat": "File",
    "rename": "File",
    "renameat": "File",
    "mkdir": "File",
    "mkdirat": "File",
    "getdents": "File",
    "getdents64": "File",

    # I/O
    "read": "I/O",
    "write": "I/O",
    "pread64": "I/O",
    "pwrite64": "I/O",
    "readv": "I/O",
    "writev": "I/O",
    "ioctl": "I/O",
    "lseek": "I/O",
    "dup": "I/O",
    "dup2": "I/O",
    "dup3": "I/O",
    "pipe": "I/O",
    "pipe2": "I/O",

    # Process management
    "fork": "Process",
    "vfork": "Process",
    "clone": "Process",
    "clone3": "Process",
    "execve": "Process",
    "execveat": "Process",
    "wait4": "Process",
    "waitid": "Process",
    "exit": "Process",
    "exit_group": "Process",
    "getpid": "Process",
    "getppid": "Process",
    "kill": "Process",

    # Memory management
    "mmap": "Memory",
    "munmap": "Memory",
    "mprotect": "Memory",
    "brk": "Memory",
    "mremap": "Memory",
    "msync": "Memory",

    # Network
    "socket": "Network",
    "connect": "Network",
    "accept": "Network",
    "accept4": "Network",
    "bind": "Network",
    "listen": "Network",
    "sendto": "Network",
    "recvfrom": "Network",
    "sendmsg": "Network",
    "recvmsg": "Network",
    "shutdown": "Network",

    # Security / identity
    "getuid": "Security",
    "geteuid": "Security",
    "getgid": "Security",
    "getegid": "Security",
    "setuid": "Security",
    "setgid": "Security",

    # Time
    "clock_gettime": "Time",
    "clock_nanosleep": "Time",
    "nanosleep": "Time",
    "gettimeofday": "Time",

    # Other / system
    "uname": "System",
    "arch_prctl": "System",
    "prctl": "System",
    "set_tid_address": "System",
    "set_robust_list": "System",
    "rseq": "System",
}


def get_syscall_category(name):
    """
    Return a readable category for a system call.
    """
    return SYSCALL_CATEGORIES.get(name, "Other")


# =========================================================
# TRACE PARSER
# =========================================================

def parse_trace(trace_text: str):

    counts = {}
    category_counts = {}

    events = []

    total_time = 0.0
    lines_seen = 0

    # Example line:
    #
    # 12345 12:30:01.123456 openat(...) = 3 <0.000123>
    #
    # Some strace lines may not contain a PID, therefore both
    # formats are supported.

    syscall_pattern = re.compile(
        r"^(?:(\d+)\s+)?"
        r"(\d{2}:\d{2}:\d{2}\.\d+)\s+"
        r"([A-Za-z_][A-Za-z0-9_]*)"
        r"\((.*)\)\s+=\s+"
        r"(.+?)\s+"
        r"<([0-9.]+)>$"
    )

    for line in trace_text.splitlines():

        lines_seen += 1

        line = line.strip()

        if not line:
            continue

        match = syscall_pattern.match(line)

        if not match:
            continue

        pid = match.group(1)
        timestamp = match.group(2)
        syscall_name = match.group(3)
        arguments = match.group(4)
        return_value = match.group(5).strip()
        duration_text = match.group(6)

        try:
            duration = float(duration_text)
        except ValueError:
            duration = 0.0

        category = get_syscall_category(syscall_name)

        # -------------------------------------------------
        # Count syscall
        # -------------------------------------------------

        counts[syscall_name] = counts.get(syscall_name, 0) + 1

        # -------------------------------------------------
        # Count category
        # -------------------------------------------------

        category_counts[category] = (
            category_counts.get(category, 0) + 1
        )

        total_time += duration

        # -------------------------------------------------
        # Store detailed event
        # -------------------------------------------------

        events.append({
            "pid": int(pid) if pid else None,
            "timestamp": timestamp,
            "name": syscall_name,
            "arguments": arguments,
            "return_value": return_value,
            "duration": round(duration, 6),
            "category": category
        })

    total_calls = sum(counts.values())
    unique_calls = len(counts)

    # =====================================================
    # CALL SUMMARY
    # =====================================================

    rows = []

    for name, count in sorted(
        counts.items(),
        key=lambda item: (-item[1], item[0])
    ):

        category = get_syscall_category(name)

        rows.append({
            "name": name,
            "count": count,
            "percentage": round(
                (count / total_calls * 100),
                2
            ) if total_calls else 0,
            "category": category
        })

    # =====================================================
    # CATEGORY SUMMARY
    # =====================================================

    categories = []

    for category, count in sorted(
        category_counts.items(),
        key=lambda item: (-item[1], item[0])
    ):

        categories.append({
            "name": category,
            "count": count,
            "percentage": round(
                (count / total_calls * 100),
                2
            ) if total_calls else 0
        })

    # =====================================================
    # PROCESS INFORMATION
    # =====================================================

    process_ids = sorted({
        event["pid"]
        for event in events
        if event["pid"] is not None
    })

    return {
        "total_calls": total_calls,
        "unique_calls": unique_calls,

        "trace_time": round(
            total_time,
            6
        ),

        "lines_seen": lines_seen,

        "calls": rows,

        "top_calls": rows[:10],

        "categories": categories,

        "category_counts": category_counts,

        # Limit timeline data so the browser isn't overloaded.
        "events": events[:500],

        "process_ids": process_ids,

        "event_count": len(events)
    }


# =========================================================
# RUN SYSTEM CALL TRACE
# =========================================================

def run_trace(sample_key: str):

    sample = SAMPLES.get(sample_key)

    if not sample:
        raise ValueError("Invalid sample program")

    if not sample["file"].exists():
        raise RuntimeError(
            f"Sample program not found: {sample['file']}"
        )

    # Temporary file for strace output
    with tempfile.NamedTemporaryFile(
        prefix="os_trace_",
        suffix=".txt",
        delete=False
    ) as temp:

        trace_file = temp.name

    # =====================================================
    # STRACE COMMAND
    # =====================================================

    command = [
        "strace",

        # Follow child processes
        "-f",

        # Microsecond timestamp
        "-tt",

        # Time spent inside syscall
        "-T",

        # Trace all system calls
        "-e",
        "trace=all",

        # Save trace to file
        "-o",
        trace_file,

        # Run selected Python program
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
            "strace is not installed. "
            "Run: sudo apt install strace"
        )

    except subprocess.TimeoutExpired:

        raise RuntimeError(
            "Trace timed out after 15 seconds."
        )

    finally:

        elapsed = time.perf_counter() - start

    # =====================================================
    # READ TRACE FILE
    # =====================================================

    try:

        trace_text = Path(trace_file).read_text(
            errors="replace"
        )

    finally:

        Path(trace_file).unlink(
            missing_ok=True
        )

    # =====================================================
    # CHECK PROGRAM ERROR
    # =====================================================

    if completed.returncode != 0:

        error = (
            completed.stderr.strip()
            or "The sample program failed."
        )

        raise RuntimeError(
            error[:500]
        )

    # =====================================================
    # PARSE TRACE
    # =====================================================

    result = parse_trace(trace_text)

    result["wall_time"] = round(
        elapsed,
        6
    )

    result["program_output"] = (
        completed.stdout.strip()
    )

    return result


# =========================================================
# HOME PAGE
# =========================================================

@app.route("/")
def index():

    return render_template(
        "index.html",
        samples=SAMPLES
    )


# =========================================================
# TRACE API
# =========================================================

@app.post("/api/trace")
def trace_api():

    data = request.get_json(
        silent=True
    ) or {}

    sample_key = data.get(
        "sample"
    )

    try:

        result = run_trace(
            sample_key
        )

        result["sample"] = (
            SAMPLES[sample_key]["name"]
        )

        result["description"] = (
            SAMPLES[sample_key]["description"]
        )

        return jsonify({
            "ok": True,
            "result": result
        })

    except Exception as exc:

        return jsonify({
            "ok": False,
            "error": str(exc)
        }), 400


# =========================================================
# APPLICATION START
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True
    )
