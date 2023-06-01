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
 * first: validates array status, checks if number exists or greater than 0 or NaN, if number exist splice array at <number>
 * @param {*} array : to hold input array for comparision 
 * @param {*} number: values to return from array
 * @returns returns the first <number> of elements of an array
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
 * last: validates array status, checks if number exists or greater than 0 or NaN, if number exist splice array at <number>
 * @param {*} array : to hold input array for comparision 
 * @param {*} number: values to return from end of arrayarray
 * @returns returns last <number>'s from input array
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
 * _.indexOf: desigend to validate if <value> is in array (===) 
 * @param {*} array: input array 
 * @param {*} value: possible element in array to return 
 * @returns return index of element at first occurence from <array> or -1 if value not found
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
 * _.conatins: design to validate if <value> exist in <array> or not
 * @param {*} array: array of elements
 * @param {*} value: value being used for comparison from <array>
 * @returns returns true if value exist in array, false otherwise
 */

    _.contains = (array, value) => {
   
        return _.indexOf(array, value) !== -1 ? true  : false     
         
      };
      module.exports.contains = contains;

/**
 * _.each: Designed to loop over a collection, Array or Object, and applies the action Function to each value in the collection.
 * @param {Array or Object} collection: The collection over which to iterate.
 * @param {Function} action: The Function to be applied to each value in the 
 * collection
 */
_.each = (collection, func) => {

    if(Array.isArray(collection)){
        for(let i = 0; i < collection.length; i++){
           func(collection[i], i, collection)
        } 
    } else {
        for(let key in collection){
            func(collection[key], key, collection)
        }
        
    }
};
module.exports.each = each;

/**
 * unique: designed to return a copy of non duplicated elements from <array>
 * @param {*} array : input array assessed for dups
 * @returns new array that's a copy of input array without dups
 */
_.unique = (array) => {
    // create var to hold value of an array, that spreads in a new collection of the input value
    var uniqueArray = [...new Set(array)]

        return uniqueArray

    }
module.exports.unique = unique;


/**
 * filter: designed to iterate over <array> and identify if the <func> call of values, index, array are true
 * @param {*} array: input array iterated over 
 * @param {*} func: callback function applied to each value of array
 * @returns : new array of truthy values from calback
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
 * _.reject: designed to iterate over input array and apply a callback function to determine if values meet a condition
 * @param {*} array : input array to be iterated over
 * @param {*} func  : callback function applied to array elements 
 * @returns : new array of falsey values from callback
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
    


 /**
 * _.parition: designed to iterate over input array and applies a callback function to each element to assess if condition is met or not
 * @param {*} array : input array
 * @param {*} func : callback applied to array elemts 
 * @returns returns twos arrays, one of truthy values and one of falsey values from input array
 */
        _.partition = (array, func) => {
            let truthy = [];//array to hold true values
            let falsey = [];//array to hold false values
        
            // iterate over input array
            for(let i = 0; i < array.length; i++){
                //if the func of array values resolves to true 
                if(func(array[i], i, array)){
                    // push true values into truthy
                    truthy.push(array[i])
                 } else {
                    //push false values into falsey 
                    falsey.push(array[i])
                }
             }  // return truthy and falsey arrays within an array
                return [truthy, falsey]
        }
        module.exports.partition = partition;    
        
 /**
 * _.map: validate if collection is array or object, iterate over collection and push values into new collection
 * @param {*} collection: Array or object iterated over 
  * @param {*} func: applied to collection, elements, and index.  
 * @returns return value of func call on a collection to a new array
 */
        
        _.map = (collection, func) => {
            //array to hold return value of array and object values
            let newArray = []
            //if collection is an array
            if(Array.isArray(collection)){
                //iterate over collection
                for (let i = 0; i < collection.length; i++){
                    //push value func call of array values, index, and collection 
                   newArray.push(func(collection[i], i, collection))
                    } 
                    // else if collection is an object
                    } else if(collection.constructor.name === 'Object'){
        
                        // loop over collection
                        for( let keys in collection ){
                        //push collection values, keys, and collection into newArray
                         newArray.push(func(collection[keys], keys, collection))
                    }
            }
            //return newArray
            return newArray
        }
        module.exports.map = map;


/**
 * pluck: design to iterate over an array of objects and to extract specified <property> values 
 * @param {*} array : holding array of objects 
 * @param {*} property : values from properties pushed into to new array
 * @returns new array of object values from <property> input 
 */
_.pluck = (array, property) => {
    // array to hold return values
    let arr = [];
        //iterate over unput array
        for(let i = 0; i < array.length; i++){  

            let obj = array[i];

            //push the result of _.map func into new array
            arr.push((obj[property]));
        }
        //return arr
        return arr;
}   
module.exports.pluck = pluck;


/**
 * _.every: Designed to iterate over a collection, test all elements and will return false when an 
 * element doesnt meet condition and true when all elements meets a condition 
 * @param {*} collection : object or an array
 * @param {*} func : called on input collection 
 * @returns True, if every element in a collection meets condition and false otherwise
 */

_.every = (collection, func) => {

    
    let check = func || _.identity;

    if (collection.length === 0) {
        return true;
    }
    return _.reduce(collection,  (prev, next) => {
        if (!prev) {
            return false;
        } else {
            return check(next) ? true : false;
        }
    }, true);
};
module.exports.every = every;

    


/**
 * _.some: Design to iterate over a collection and verifies if at least one of the values in a collection meets condition 
 * @param {*} collection: an array or object
 * @param {*} func: applied to elements of true conditions 
 * @returns Returns true if one of the elements of the array meets a condition(stopping iteration) and returns false 
 * when no elements meets condition 
 */


 _.some = function(collection, func) { 

 //init result to an array literal
    let result = [];
    //create counter
    let count = 0;
 //false counter
     let falseCount = 0;
 //create a boolean flag
     let resultCheck = true;
      
    if (!func) {
    for (let k = 0; k < collection.length; k++) {
     if (collection[k] == true) {
          return true;
     } else {
         return false;
  }
    }
    }
      
  //use a conditional to sort collection into objects and arrays 
     if (Array.isArray(collection) === true) { //if collection is an array
    //create a for loop to iterate through the array
     for (let i = 0; i < collection.length; i++) {
    //if col. is array, call func with the element, index, and the col. Push the result into result
         result.push(func(collection[i], i, collection));
            //add to count
             count += 1;
             console.log(count)
    }
     //else if it is an object
        } else { 
    //create a for in loop to iterate through the object
    for (let key in collection) {
    //if col. is object, call func with the value, it's key, and the col.
         result.push(func(collection[key], key, collection));
               count += 1;
    }
        }
      
    for (let j = 0; j < result.length; j++) {
        if (result[j] === false) {
          falseCount += 1;
    }
      
     if (falseCount === result.length) {
     resultCheck = false;
    }
      }
           return resultCheck;
       
      }
 module.exports.some = some;



 /**
  * _.reduce: design to iterate over an input array, implement seed value if no seed exist, and apply a callback 
  * func to the result, elemets, index and the array
  * @param {*} array: collection to iterated over and callback applied to elementd
  * @param {*} func: called on each elements of input array
  * @param {*} seed: used to initialize values to be returned 
  * @returns : accumulates a single return values to return  
  */


_.reduce = function(array, func, seed){
   
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
  module.exports.reduce = this.reduce;
  
  
  

  /**
   * _.extend: designed to copy key/value pairs from one object to another or multiple into a single object
   * @param {*} obj :input object(s) to copy properties to
   * @returns returns the result of passing object properties from one or multiple objects to a single object   
   */
  
  _.extend = function(obj) {
      _.each(arguments, function(extendObj) {
          for (var key in extendObj)
              obj[key] = extendObj[key];
      });
      return obj;
  };
  module.exports.extend = extend;


    