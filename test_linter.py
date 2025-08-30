# test_linter.py
import os # Flake8 will complain: 'os' imported but unused

def my_function( a,b ): # Flake8 will complain: missing whitespace around operator
    print("Hello from the test linter file!")
    return a+b