# Operating Systems & Command Shells

## How a Command Shell Runs Programs
A shell reads a command line, splits arguments, clones itself (`fork`), replaces the child process with the target program (`exec`), and waits for it to finish (`waitpid`).

## File Descriptors & Pipes
Every process has an open file table (`0` stdin, `1` stdout, `2` stderr). Pipes connect the output of one process to the input of another.

