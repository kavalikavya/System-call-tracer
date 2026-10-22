import os
import time

pid = os.fork()

if pid == 0:
    print("Child process executed.")
    os._exit(0)
else:
    os.waitpid(pid, 0)
    print("Parent process waited for child.")
