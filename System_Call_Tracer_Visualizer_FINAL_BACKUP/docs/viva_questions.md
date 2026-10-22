# VIVA QUESTIONS & SHORT ANSWERS

1. What is a system call?
A system call is the mechanism through which a user-level program requests a service from the operating system kernel.

2. Why are system calls needed?
They provide a controlled interface for programs to request OS services such as file access, process creation and I/O.

3. What is user mode?
A restricted CPU execution mode in which normal application code runs.

4. What is kernel mode?
A privileged execution mode in which the OS kernel can perform protected operations.

5. What is the main purpose of your project?
To trace system calls made by sample programs and visualize the results.

6. What tool is used for tracing?
Linux `strace`.

7. Why did you use Python?
Python makes process execution, text parsing and web-backend development simple.

8. Why did you use Flask?
Flask provides a lightweight web framework for the dashboard API.

9. What does `strace -f` do?
It follows child processes/threads created by the traced process.

10. What does `-T` provide?
It displays the time spent inside each system call.

11. Why is Linux required?
The implementation relies on the Linux `strace` utility.

12. Do you need a database?
No. The current mini-project only needs temporary trace results.

13. What is the difference between a system call and a normal function?
A normal function executes in the application's context; a system call requests a protected OS service.

14. What happens when a program makes a system call?
Control transfers from user-level execution to the kernel to perform the requested service, then returns a result to the program.

15. What are examples of system calls?
Examples include read, write, openat, close, fork, wait-related calls and memory-management calls.

16. What happens if the selected program fails?
The backend returns an error message and the dashboard displays it.

17. What is an edge case in your project?
Missing `strace`, invalid sample selection, trace timeout or an empty trace.

18. Why use a whitelist of programs?
For safety and predictable demonstration; the browser cannot execute arbitrary shell commands.

19. How can the project be improved?
Add export, historical comparison, live streaming, more categories and process-tree visualization.

20. Explain your architecture.
The browser sends a selected sample to Flask; Flask runs the whitelisted sample through strace; the parser extracts system-call information; the analyzer calculates statistics; JSON is returned to the dashboard.
