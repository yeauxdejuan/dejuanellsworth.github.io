// #!/usr/bin/env node

'use strict';

/**
 * 2: Fizz Buzz
 *
 *  a. Write a Function called fizzBuzz that prints the numbers from 1 to 100.
 *  b. BUT, for multiples of three print “Fizz” instead of the number.
 *  c. AND for the multiples of five print “Buzz”.
 *  d. FINALLY, for numbers which are multiples of both three and five print “FizzBuzz”.
*/
/*
    I: function takes in a number between 1-100
    O: function returns 'fizz', 'buzz', and 'fizzbuzz' based on conditions met
    C:
    E: negative numbers and numbers 100+

*/

function fizzBuzz(num) {
    // YOUR CODE GOES BELOW HERE //

    // after the for loop, the conditins should start with 15 so that 3/5 doesnt intercept the call before it reaches 15
    for( let num = 1; num <= 100; num++ ){
        if ( num % 15 === 0){ // num of 3 and 5  % = 0 is replaced by 15 for fizzbuzz and prioritzed to so that the call
            console.log('FizzBuzz');
        } else if (num % 5 === 0){
            console.log('Buzz');
        } else if (num % 3 === 0 ){
            console.log('Fizz')
        } else {
            console.log(num)
        }
    }
    // YOUR CODE GOES ABOVE HERE //
}





// DON'T REMOVE THIS CODE //////////////////////////////////////////////////////
if((typeof process !== 'undefined') &&
   (typeof process.versions.node !== 'undefined')) {
    // here, export any references you need for tests //
    module.exports.fizzBuzz = fizzBuzz
}