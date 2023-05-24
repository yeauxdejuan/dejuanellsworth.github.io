/*


Functions are one of the fundamental building blocks in JavaScript. 
A function in JavaScript is similar to a procedure—a set of statements that performs a task or calculates a value, but for a procedure to qualify as a function, 
it should take some input and return an output where there is some obvious relationship between the input and the output. To use a function, you must define it 
somewhere in the scope from which you wish to call it.



Function declarations
A function definition (also called a function declaration, or function statement) consists of the function keyword, followed by:

The name of the function.
A list of parameters to the function, enclosed in parentheses and separated by commas.
The JavaScript statements that define the function, enclosed in curly brackets, 
For example, the following code defines a simple function named square:


Parameters are essentially passed to functions by value — so if the code within the body of a function assigns a completely new value to a parameter that was passed to the function, 
the change is not reflected globally or in the code which called that function.



Function scope
Variables defined inside a function cannot be accessed from anywhere outside the function, 
because the variable is defined only in the scope of the function. However, a function can access all variables and functions defined inside the scope in which it is defined.

In other words, a function defined in the global scope can access all variables defined in the global scope.
 A function defined inside another function can also access all variables defined in its parent function, and any other variables to which the parent function has access.

 Calling the function actually performs the specified actions with the indicated parameters. For example, if you define the function square, you could call it as follows:







 */