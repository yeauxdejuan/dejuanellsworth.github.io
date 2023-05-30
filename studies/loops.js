/*


loops are iterative statements that repeats a condition a number of times until 
the loop condition ends

///                                      F O R - L O O P S

///     example:    for(let i = 0; i < 10; i++){ console.log(i) } 

A for loop has an initialization, a stop condition, and an update condition that dictates how a 
for loop operates. For-loops will begin at its intializatin and continue to run until it's stop
condition is meet. When the stop condition evalutes to false, the loop terminates.
The update condition determines how the loop increments or decrements 


//                              D O ....W H I L E  L O O P S 

let i = 1;
do{
    i += 2;
    console.log(i)
} while (i < 10)

Do...while is a type of iterative statement that will loop until the condition evalutaes 
to false. The statement within the do...while loop dictates looping as long as the statement 
is true. The while statement will execute until the specified condition evaluates to

//                                  F O R.... I N  L O O P S

//                      for(let keys in object){ return object[keys] }

For...in loops are specificly designed to iterate over objects. Each property on an objetct is 
iterated over and the loop ends after the last property is accessed  


//                                  F O R....O F  L O O P S

//for(let keys of object){ return object[keys] }

A for...of loop is a iterative statement that loops over iterable objects and calls a custom 
loop that excecutes over property values 

//                              S W I T C H   S T A T E M E N T S 

switch(colors){
    case blue:
        console.log(spectrum)
    case red:
        console.log(vibrant)
        break;
    default:
}

Switch statements iterates over each case outlined in its code block once. If an expression 
matches a case, the matching cases' code block is executed specifically unless the code reaches
the default code block 





*/