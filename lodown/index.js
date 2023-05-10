'use strict';

// YOU KNOW WHAT TO DO //

/**
 * identity: designed to resolve to a unchanged value
 * @param {any input} value
 * @returns value unchanged
 */

_.identity = (value) => {
    //return value
    return value;
}
module.exports.identity = identity;

/**
 * typeOf: designed to resolve to a string of the input value
 * @param {any data type} value 
 * @returns a string of the input data type
 */


_.typeOf = (value) => {

    /* assign dataType to hold the value of input data type when invoked with the Object.prototype.toString.call
        OUTPUT => [object 'type of data type']
        Object.prototype.toString.call(new Boolean(true)) => [object boolean]
        the objective to is exctract 'boolean' from that return value at the 'space'+1 and ']' using substring and indexOf functions 
  
    */
    let dataType = Object.prototype.toString.call(value) 
  
    let typeofData = 
      dataType.substring(
      dataType.indexOf(' ') + 1,
      dataType.indexOf(']'))
  
      return typeofData.toLowerCase()
      };
      module.exports.typeOf = typeOf;

/**
 * first: validates array status, checks if number exists or greater than array length 
 * @param {*} array : to hold input array for comparision 
 * @param {*} number: values to return from array
 * @returns returns the first element of an array or object
 */
      _.first =  (array, number) => {
        //if array is an array || number is < 0
        if (!Array.isArray(array) || number < 0){
            //return []
             return []
        // else if number doesnt exist || number === NaN
        } else if((!number) || number === NaN){
            return array[0]
        } 
        //if number exist
        if (number){
            //splice the array with the input value of number
            array.splice(number)
        }
        // return array
        return array
    }

    module.exports.first = first;

/**
 * last: validates array status, checks if number exists or greater than array length
 * @param {*} array : to hold input array for comparision 
 * @param {*} number: values to return from array
 * @returns last <number>'s from array
 */

     _.last = (array, number) => {
        // if number is greater than arrays length
        if (number > array.length){
            //return array
            return array
        }
         //if array is an array || number is < 0
        if (!Array.isArray(array) || number < 0){
            //return []
            return []
            // else if number doesnt exist or number value is NaN
            } else if((!number) || number === NaN){
                // return last value in array
            return array[array.length - 1]
    
            } else if(number){
                //else return array at the inout number
            return array.splice(1,number)
            }      
    }
    module.exports.last = last;

/**
 * indexOf: desigend to validate if <input> is an array, 
 * @param {*} array: input array 
 * @param {*} value: position on array to return from <input>
 * @returns return  <value> 
 */

    _.indexOf = (array, value) => {
        //if anarray exist
        if(array){
            //return the the index of the input value 
            return array.indexOf(value)
        } else {
            //else return -1
            return - 1
        }
    }
    module.exports.indexOf = indexOf;

/**
 * conatins: design to validate if <value> exist in <array>
 * @param {*} array: input array to be assessed
 * @param {*} value: value being used for comparison from <array>
 * @returns <value> from <array>
 */

    _.contains = (array, value) => {
   
        return _.indexOf(array, value) !== -1 ? true  : false     
         
      }
      module.exports.contains = contains;

/**
 * each: Designed to loop over a collection, Array or Object, and applies the action Function to each value in the collection.
 * @param {Array or Object} collection: The collection over which to iterate.
 * @param {Function} action: The Function to be applied to each value in the 
 * collection
 */
function each(collection, action) {
    if(Array.isArray(collection)) {
        for(var i = 0; i < collection.length; i++) {
            action(collection[i], i, collection);
        }
    } else {
        for (var key in collection) {
            action(collection[key], key, collection);
        }
    }
}
module.exports.each = each;

/**
 * unique: designed to return a copy of input array
 * @param {*} array 
 * @returns 
 */
_.unique = (array) => {
    // create var to hold value of an array, that spreads in a new collection of the input value
    var uniqueArray = [...new Set(array)]

        return uniqueArray

    }
module.exports.unique = unique;


/**
 * filter: designed to compare an array and function and return values of func call
 * @param {*} array: input array iterated over 
 * @param {*} func: func call acted on array elements, index,
 * @returns 
 */

_.filter = (array, func) => {
   
 
     // for loop access to values in an array
    for(let i = 0; i < array.length; i++){
        //if a func call the element, index, and array returns true
        if(func(array[i], i, array )){
        
             return [...array[i]]
            }
        }
      
    }
    module.exports.filter = filter;

    /**
     * 
     * @param {*} array 
     * @param {*} func 
     * @param {*} seed 
     * @returns 
     */

    _.reduce = function(array, func, seed){
        // let array = [1, 2, 3, 4];
        /*
        let func = function(accumulator, current){ // accumulator = 1  current = 2
        // code to accumulate value
        return accumulator + current; // 1 + 3
        }   
         */
        // let seed;
        let result;
        // determine if seed was not passed in
        if (seed === undefined){
            // use first element of array as seed
            result = array[0]; // result = 1
            for (let i = 1; i < array.length; i++){ 
                // reassign result to func invocation
                result = func(result, array[i], i, array);
                
            }
        } else { // else it was
            result = seed; // result = 0
            for (let i = 0; i < array.length; i++){ // 
                // reassign result to func invocation
                result = func(result, array[i], i, array);
            }
        }
        return result;
      }
      module.exports.reduce = reduce;
/**
 * 
 * @param {*} array 
 * @param {*} func 
 * @returns 
 */


      _.reject = (array, func) => {
   
        let arr = [];
                // for loop access to values in an array
                for(let i = 0; i < array.length; i++){
                    //if a func call the element, index, and array returns true
                    if(!func(array[i], i, array )){
                        //push those valis into new array
                        arr.push(array[i])
                }
            }
          
        //return new array
        return arr
        }
        module.exports.reject = reject
    
    
    
    