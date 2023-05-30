/*



//                          V A R I A B L E S


//                              V A R

The VAR keyword declares variables to the global scope. Variables using VAR in the 
scope of a funciton becmomes a globally scoped variable. 

EXAMPLES:

var name; <= varibale declartion => returns undefined 
var name = Dejuan; <= varibale initialization 

'The scope of a variable declared with var is its current execution context and closures thereof,
which is either the enclosing function and functions declared within it, or, for variables 
declared outside any function, global. Duplicate variable declarations using var will not 
trigger an error, even in strict mode, and the variable will not lose its value, unless 
another assignment is performed.'

'Because var declarations are processed before any code is executed, declaring a variable
 anywhere in the code is equivalent to declaring it at the top. This also means that a 
 variable can appear to be used before it's declared.'

https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var


//                               L E T

The LET keyword declars a block-scoped local variable.

EXAMPLES:

if(!name){let name = 'Dejuan'} <= block variable declaration 

'let allows you to declare variables that are limited to the scope of a block statement, 
or expression on which it is used, unlike the var keyword, which declares a variable globally, 
or locally to an entire function regardless of block scope. The other difference between var 
and let is that the latter can only be accessed after its declaration is reached.
For this reason, let declarations are commonly regarded as non-hoisted.'

Redeclaring the same variable within the same function or block scope raises a SyntaxError.


 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var



//                              C O N S T


Like the LET keyword, the CONST keyword creates a block scoped variable. Though, values declared using  
CONST cannot be redeclared but can be modified if data type is complex.

EXAMPLES:

if(!name){const name = 'Dejuan'} <= block variable declaration 


'This declaration creates a constant whose scope can be either global or local to the block in which it 
is declared. Global constants do not become properties of the globalThis object, unlike var variables.'




 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var
 */