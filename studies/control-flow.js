/*

//                                                       C O N T R O L     F L O W


Control flow is the procedure of how code is excecuted from top to bottom. The flow begins from the first line of code

and continues execution to the last line of code. Execution of code can be altered by loops, conditionals, and functions. 


//                                                              L O O P S


Loops are statements that will iterate until a stop condition or until there's nothing left to iterate over. For-loops control 

flow by iterating as long as a condition is true, meaning the following code won't execute until the for loop completes its execution 

or dictates how the code is executed. The code below shows how a for loop that counts, when the line of code executes, the code after 

it won't execute until i reaches 1000.

//How would a loop effect control flow?
for (var i = 1; i <= 5; i++){
  console.log(weather + ' Weather') // => Sunny Weather x5
}



//                                                        C O N D I T I O N A L S

 Conditional statements are used to control flow by executing code based on truthy and falsey results. For example, if-else-if-else statements 

 allow for several conditions to be executed based on the code within the code block. 
 
 
    How would a conditional effect control flow?

    if (weather === 'rainy'){
    console.log('Bring umbrella')
    } else if (weather === 'Sunny') {
    let weather = 'Shorts and Shades'
    onsole.log(weather) // => 'shorts and shades'
    }


//                                                              F U N C T I O N S 




Functions are code blocks that ultimately returns or calculates a value. What happpens within the code block of a function can control the 
flow depending on the functionality of the code inside the function scope. Function invocations can alter control flow by implementing the design of a function on a variable.


//   How would a functino effect control flow? 

const upperCase = variable => console.log(variable.toUpperCase());

upperCase(weather); // => SUNNY

function lowerCase(variable){
  console.log(variable.toLowerCase());
};

lowerCase(weather) // => sunny


Control flow is like a water in a maze, where the maze is rittled with loops, conditions and functions that dictates how and when the water will flow until
it reaches the end of the maze .
*/