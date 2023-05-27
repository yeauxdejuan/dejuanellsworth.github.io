/*

//                                                      F U N C T I O N

Functions are like encapsulated tools we can use to perform a task or calculate a value. The task being perfomred or value being calculated is 
from the input paramater being modified in some form, and lastly ending the return statement including the modidied results of the input.
To access the functionality of a function, outside of its scope call/invoke the function by using its keyword with parenthesis, with a value 
representing the the parameters called arguements.

Function parameters are enclosed in parenthesis and separeted by commas after the function keyword.
Curly brackets house the statement the outlines the functions' purpose  (see example)

Function examples:

function declartion:

function whatsInThere(array){  <= parent func declare with <array> parameter <= global scope 
    return array.forEach((item){ <= returns child func with an <item> parameter 
        return item; <= returns elements of an array
    }); <= closure of inner function
}; <= ending of outer function

console.log(whatsInThere(['string', 9, true, [1, 2]], {key: value}, NaN])); <= console log with func invokation if whatsInThere function 

function expression:

let whatsInthere2 = (array) => { 
    return array.forEach((items) =>{
        return items;
    });
};

console.log(whatsInThere2(['string', 9, true, [1, 2]], {key: value}, NaN])); <= console log with func invokation if whatsInThere2 function

 */