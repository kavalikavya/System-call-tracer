# OS MINI PROJECT REPORT — CONTENT PLAN

## 1. Cover Page
Project: System Call Tracer and Visualizer
Course: Operating Systems
Include group members, roll numbers, faculty name, academic year.

## 2. Certificate / Declaration
Use your department's required format.

## 3. Abstract (150–200 words)
Explain:
- What system calls are
- Why tracing is useful for understanding OS interaction
- The proposed tool
- Technologies: Python, Flask, Linux strace
- Dashboard output: counts, percentages, execution information and mode-transition visualization
- Outcome: easier understanding of user/kernel interaction

## 4. Introduction
### 4.1 Background
Applications request OS services through system calls.

### 4.2 Problem Statement
Raw tracing output can be difficult for beginners to interpret. The project provides a simple visualization layer.

### 4.3 Objectives
1. Execute safe sample programs.
2. Capture their system calls.
3. Count and analyze calls.
4. Present results through a web dashboard.
5. Explain user-mode/kernel-mode interaction visually.

## 5. Related Concepts / Theory
- Operating system
- User mode
- Kernel mode
- System calls
- Process management
- File-related system calls
- `strace`
- Basic tracing and performance concepts

## 6. System Design
Include:
### Architecture
Browser
  -> Flask API
  -> Safe sample program
  -> Linux strace
  -> Trace file
  -> Parser
  -> JSON result
  -> Dashboard

### Modules
1. Sample Program Manager
2. Trace Engine
3. Trace Parser
4. Statistics Analyzer
5. Visualization Dashboard

## 7. Implementation
Explain the important files:
- app.py
- templates/index.html
- static/style.css
- static/app.js
- samples/*.py

Include short snippets only, not the complete code dump.

## 8. Results & Discussion
Take screenshots of:
1. Home dashboard
2. Trace running
3. Result statistics
4. Top system-call bars
5. System-call details table
6. User/kernel mode flow

Suggested table:
Program | Total Calls | Unique Calls | Trace Time
File Reader | fill after run | fill | fill
Process Demo | fill after run | fill | fill
Calculation Demo | fill after run | fill | fill

Discuss why different programs produce different system-call patterns.

## 9. Conclusion & Future Scope
Conclusion: the project makes system-call activity easier to observe and understand.

Future scope:
- More sample programs
- CSV/PDF export
- Historical trace comparison
- More detailed syscall categories
- Process tree visualization
- Live trace streaming

## 10. References
Use your OS textbook, Linux `strace` documentation, Python documentation, Flask documentation, and any sources actually used.
