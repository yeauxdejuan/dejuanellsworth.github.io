// #!/usr/bin/env node

'use strict';

/**
 * 3: range()
 *
 *  a. Create a function called range that takes two integers as 
 *  parameters and returns an Array containing all integers 
 *  between the two parameters, inclusively.  For example:
 *
 *      range(8, 14);  // => [8, 9, 10, 11, 12, 13, 14]
 *
 *  If the first argument is greater than the second, 
 *  return the range in reverse order, ie:
 *
 *      range(14, 8);  // => [14, 13, 12, 11, 10, 9, 8]
 *
 *  TIPS:
 *  a. create something to collect the output you'll return.
 *  b. you'll need a loop, which one is best?
 *  c. you'll wanna make use of the push() method of Array.
 */
function range(start, end) {
    // YOUR CODE GOES BELOW HERE //
    let arr = [] // arr val to hold array literal
    if (start < end ){ // if start is less than end
        for (let i = start; i <=end; i++ ){ //iterate forward and 
        arr.push(i)//push the values into the arr array
        } 
    }else if ( start > end ){ // else if the start > end,
        for (let j = start; j >= end; j--){ //iterate backwards
            arr.push(j)// push values into array
        }
    }
       return arr


       //var arr - if (start > end for(var i start; i > end -1; i--) arr.push(i); Jelse if (start < end) for(var nun-start; nun arr.push(hun); end 11 )
    // YOUR CODE GOES ABOVE HERE //
}





// DON'T REMOVE THIS CODE //////////////////////////////////////////////////////
if((typeof process !== 'undefined') &&
   (typeof process.versions.node !== 'undefined')) {
    // here, export any references you need for tests //
    module.exports.range = range;
}
