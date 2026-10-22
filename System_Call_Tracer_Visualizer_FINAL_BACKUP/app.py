from flask import Flask, render_template, jsonify, request
from pathlib import Path
import subprocess
import tempfile
import re
import time


app = Flask(__name__)


# =========================================================
# PROJECT DIRECTORIES
# =========================================================

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
    }

}


# =========================================================
# SYSTEM CALL CATEGORIES
# =========================================================

SYSCALL_CATEGORIES = {

    # File related
    "open": "File",
    "openat": "File",
    "close": "File",
    "stat": "File",
    "fstat": "File",
    "lstat": "File",
    "newfstatat": "File",
    "access": "File",
    "readlink": "File",
    "readlinkat": "File",
    "getdents": "File",
    "getdents64": "File",
    "unlink": "File",
    "unlinkat": "File",
    "rename": "File",
    "renameat": "File",

    # I/O
    "read": "I/O",
    "write": "I/O",
    "pread64": "I/O",
    "pwrite64": "I/O",
    "readv": "I/O",
    "writev": "I/O",
    "lseek": "I/O",
    "ioctl": "I/O",

    # Memory
    "mmap": "Memory",
    "munmap": "Memory",
    "mprotect": "Memory",
    "brk": "Memory",
    "mremap": "Memory",

    # Process
    "execve": "Process",
    "execveat": "Process",
    "fork": "Process",
    "vfork": "Process",
    "clone": "Process",
    "clone3": "Process",
    "wait4": "Process",
    "waitid": "Process",
    "exit": "Process",
    "exit_group": "Process",

    # Network
    "socket": "Network",
    "connect": "Network",
    "accept": "Network",
    "accept4": "Network",
    "sendto": "Network",
    "recvfrom": "Network",
    "sendmsg": "Network",
    "recvmsg": "Network",
    "bind": "Network",
    "listen": "Network",

    # Security
    "setuid": "Security",
    "setgid": "Security",
    "geteuid": "Security",
    "getegid": "Security",
    "setresuid": "Security",
    "setresgid": "Security",

    # Time
    "clock_gettime": "Time",
    "clock_nanosleep": "Time",
    "nanosleep": "Time",
    "gettimeofday": "Time",

    # System information
    "uname": "System",
    "sysinfo": "System",
    "getpid": "System",
    "getppid": "System",
    "gettid": "System",

}


# =========================================================
# GET SYSCALL CATEGORY
# =========================================================

def get_syscall_category(name):

    return SYSCALL_CATEGORIES.get(
        name,
        "Other"
    )


# =========================================================
# PARSE STRACE OUTPUT
# =========================================================

def parse_trace(trace_text: str):

    counts = {}

    category_counts = {}

    events = []

    total_time = 0.0

    lines_seen = 0

    # All process IDs detected
    process_ids = set()

    # Parent -> child relationships
    process_tree = []

    # =====================================================
    # STRACE LINE FORMAT
    #
    # Example:
    #
    # 12345 12:30:01.123456 openat(...) = 3 <0.000123>
    #
    # =====================================================

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

        # =================================================
        # EXTRACT INFORMATION
        # =================================================

        pid = match.group(1)

        timestamp = match.group(2)

        syscall_name = match.group(3)

        arguments = match.group(4)

        return_value = match.group(5).strip()

        duration_text = match.group(6)

        # =================================================
        # PID
        # =================================================

        pid_number = None

        if pid is not None:

            try:

                pid_number = int(pid)

                process_ids.add(
                    pid_number
                )

            except ValueError:

                pid_number = None

        # =================================================
        # DURATION
        # =================================================

        try:

            duration = float(
                duration_text
            )

        except ValueError:

            duration = 0.0

        total_time += duration

        # =================================================
        # CATEGORY
        # =================================================

        category = get_syscall_category(
            syscall_name
        )

        # =================================================
        # COUNT SYSTEM CALL
        # =================================================

        counts[syscall_name] = (
            counts.get(
                syscall_name,
                0
            ) + 1
        )

        # =================================================
        # COUNT CATEGORY
        # =================================================

        category_counts[category] = (
            category_counts.get(
                category,
                0
            ) + 1
        )

        # =================================================
        # PROCESS CREATION
        #
        # fork()
        # vfork()
        # clone()
        # clone3()
        #
        # Example:
        #
        # 1000 clone(...) = 1001
        #
        # Parent = 1000
        # Child  = 1001
        # =================================================

        process_creation_calls = {
            "fork",
            "vfork",
            "clone",
            "clone3"
        }

        if (
            syscall_name in process_creation_calls
            and pid_number is not None
        ):

            child_match = re.match(
                r"^\s*(\d+)\b",
                return_value
            )

            if child_match:

                try:

                    child_pid = int(
                        child_match.group(1)
                    )

                    if child_pid > 0:

                        # Add child PID
                        process_ids.add(
                            child_pid
                        )

                        relationship = {
                            "parent": pid_number,
                            "child": child_pid
                        }

                        if relationship not in process_tree:

                            process_tree.append(
                                relationship
                            )

                except ValueError:

                    pass

        # =================================================
        # STORE EVENT
        #
        # Limit to 500 events for the dashboard.
        # =================================================

        if len(events) < 500:

            events.append({

                "pid": pid_number,

                "timestamp": timestamp,

                "name": syscall_name,

                "arguments": arguments,

                "return_value": return_value,

                "duration": duration,

                "category": category

            })

    # =====================================================
    # TOTAL CALLS
    # =====================================================

    total_calls = sum(
        counts.values()
    )

    # =====================================================
    # UNIQUE CALLS
    # =====================================================

    unique_calls = len(
        counts
    )

    # =====================================================
    # SYSTEM CALL SUMMARY
    # =====================================================

    rows = []

    for name, count in sorted(
        counts.items(),
        key=lambda item: (
            -item[1],
            item[0]
        )
    ):

        percentage = (

            round(
                count /
                total_calls *
                100,
                2
            )

            if total_calls

            else 0

        )

        rows.append({

            "name": name,

            "count": count,

            "percentage": percentage,

            "category":
                get_syscall_category(
                    name
                )

        })

    # =====================================================
    # CATEGORY SUMMARY
    # =====================================================

    categories = []

    for name, count in sorted(
        category_counts.items(),
        key=lambda item: (
            -item[1],
            item[0]
        )
    ):

        percentage = (

            round(
                count /
                total_calls *
                100,
                2
            )

            if total_calls

            else 0

        )

        categories.append({

            "name": name,

            "count": count,

            "percentage": percentage

        })

    # =====================================================
    # SORT PROCESS IDS
    # =====================================================

    process_ids = sorted(
        process_ids
    )

    # =====================================================
    # SORT PROCESS TREE
    # =====================================================

    process_tree = sorted(
        process_tree,
        key=lambda relation: (
            relation["parent"],
            relation["child"]
        )
    )

    # =====================================================
    # RETURN RESULT
    # =====================================================

    return {

        "total_calls":
            total_calls,

        "unique_calls":
            unique_calls,

        "trace_time":
            round(
                total_time,
                6
            ),

        "lines_seen":
            lines_seen,

        "calls":
            rows,

        "top_calls":
            rows[:10],

        "categories":
            categories,

        "category_counts":
            category_counts,

        "events":
            events,

        "process_ids":
            process_ids,

        "process_tree":
            process_tree,

        "event_count":
            len(events)

    }


# =========================================================
# RUN STRACE
# =========================================================

def run_trace(sample_key: str):

    sample = SAMPLES.get(
        sample_key
    )

    if not sample:

        raise ValueError(
            "Invalid sample program"
        )

    # =====================================================
    # TEMPORARY TRACE FILE
    # =====================================================

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

        "-f",

        "-tt",

        "-T",

        "-e",
        "trace=all",

        "-o",
        trace_file,

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
            "On Ubuntu/WSL run: "
            "sudo apt install strace"

        )

    except subprocess.TimeoutExpired:

        raise RuntimeError(
            "Trace timed out after 15 seconds."
        )

    finally:

        elapsed = (
            time.perf_counter()
            - start
        )

    # =====================================================
    # READ TRACE FILE
    # =====================================================

    try:

        trace_text = Path(
            trace_file
        ).read_text(
            errors="replace"
        )

    finally:

        Path(
            trace_file
        ).unlink(
            missing_ok=True
        )

    # =====================================================
    # CHECK PROGRAM RESULT
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

    result = parse_trace(
        trace_text
    )

    # =====================================================
    # ADD EXECUTION INFORMATION
    # =====================================================

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

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    sample_key = data.get(
        "sample"
    )

    try:

        result = run_trace(
            sample_key
        )

        result["sample"] = (
            SAMPLES[
                sample_key
            ]["name"]
        )

        result["description"] = (
            SAMPLES[
                sample_key
            ]["description"]
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
# START FLASK
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True
    )
