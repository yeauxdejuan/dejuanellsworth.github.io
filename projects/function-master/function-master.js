//////////////////////////////////////////////////////////////////////
// Function 1 - Object Values ////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

function objectValues(object) {
    //use Object.values prototype to access values of an obj
    return Object.values(object);
} 

//////////////////////////////////////////////////////////////////////
// Function 2 - Keys to String ///////////////////////////////////////
//////////////////////////////////////////////////////////////////////

function keysToString(object) {
    //use Object.keys prototype to access an obj keys, 
    //use join() array function to return them as strings with a space
       return Object.keys(object).join(' ')
}

//////////////////////////////////////////////////////////////////////
// Function 3 - Values to String /////////////////////////////////////
//////////////////////////////////////////////////////////////////////

function valuesToString(object) {
    var values = Object.values(object)
    var arr = []
    for (let i = 0; i < values.length; i++){
      if(typeof values[i] === 'string'){
         arr.push(values[i])
      }
    } 
  return arr.join(' ')
}


//////////////////////////////////////////////////////////////////////
// Function 4 - Array or Object //////////////////////////////////////
//////////////////////////////////////////////////////////////////////

function arrayOrObject(collection) {
    // if Array.isArray returns an 'array'
    if (Array.isArray(collection)){ 
        return 'array'
        // if collection is an object
      } else if (collection.constructor.name === "Object"){ 
        return 'object' 
      }   
}

//////////////////////////////////////////////////////////////////////
// Function 5 - Capitalize Word //////////////////////////////////////
//////////////////////////////////////////////////////////////////////

function capitalizeWord(string) {
    //return string at 0th index to upper case and slice to remiaining chars back to it 
    return string.charAt(0).toUpperCase() + string.slice(1);
}

//////////////////////////////////////////////////////////////////////
// Function 6 - Capitalize All Words /////////////////////////////////
//////////////////////////////////////////////////////////////////////

function capitalizeAllWords(string) {
    //strings = string string.split at the space 
   let strings = string.split(' ')
   //loop start: 0;  stop: strings.length; update: i++
    for (let i = 0; i < strings.length; i++){
        // values in strings at 0th index to upper case 
     strings[i] = strings[i].charAt(0).toUpperCase() + strings[i].slice(1);
}
     return strings.join(' ')
}

//////////////////////////////////////////////////////////////////////
// Function 7 - Welcome Message //////////////////////////////////////
//////////////////////////////////////////////////////////////////////

function welcomeMessage(object) {
    // for of loop over input obj
    for (let keys in object){
        //if obj has a name key
        if(keys === 'name'){
        // assign value with upper case to upperVal var
            let upperVal = object[keys].charAt(0).toUpperCase() + object[keys].slice(1);
            //return 'welcome upperVal!'
            return `Welcome ${upperVal}!`
        }
    }
}
//////////////////////////////////////////////////////////////////////
// Function 8 - Profile Info /////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

function profileInfo(object) {
    // for in loop to access keys and values of input object
    for (let keys in object){
        // value var to hold value of object values
        var value = object[keys]
        //if keys strick= name
        if (keys === 'name'){
            //name var to hold value of key property with it's 1st letter caplitalized 
            var name = value.charAt(0).toUpperCase() + value.slice(1) 
            //else if keys strick= species
            } else if (keys === 'species'){
            //name var to hold value of key property with it's 1st letter caplitalized 
            var species = value.charAt(0).toUpperCase() + value.slice(1)
        // return name + is a + species     
        return `${name} is a ${species}`
       }
     }
   }

//////////////////////////////////////////////////////////////////////
// Function 9 - Maybe Noises /////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

function maybeNoises(object) {

    //loop over input obj
    for (var keys in object){
        //if object has a noises array
        if(keys === 'noises'){
            // values house our values of the input obj
            let values = object[keys];
            // assess if input object key of noises has an array as a value 
            if(Array.isArray(values) ){
                //assess if that array has a length greater 0
                if (values.length > 0){
                    // return values joined with space 
                    return values.join(' ')
                }
            }
        }
    }
    // return 'there are no noises' otherwise 
    return 'there are no noises'
}

//////////////////////////////////////////////////////////////////////
// Function 10 - Has Words ///////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

function hasWord(string, word) {
    // if a string includes an input word 
    if(string.includes(word)){
        //return true 
        return true
        //else
    } else {
        // return false
        return false
    }
}

//////////////////////////////////////////////////////////////////////
// Function 11 - Add Friend //////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

function addFriend (name, object) {

        // loop over input obj
        for (let keys in object){
            // if obj has a friends key
            if (keys === 'friends'){
                // push name into its array 
                object[keys].push(name)
            }
        }
        // return input object with name added to friends array
        return object
}

//////////////////////////////////////////////////////////////////////
// Function 12 - Is Friend ///////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

function isFriend(name, object) {
    //iterate over input object
    for (let keys in object){
        // if keys strick= 'friends'
        if (keys === 'friends'){
            // values house the values friends 
            let values = object[keys];
            // loop over values array
            for (let i = 0; i < values.length; i++){
                // if vlaues[i] strick= name
                if(values[i] === name){
                    //return true 
                    return true  
                }
            }
            
        }
    }// else return false
    return false
}

//////////////////////////////////////////////////////////////////////
// Function 13 - Non-Friends /////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

function nonFriends(name, arr){
    var nameArr = [];
    var notFriends = [];
    var current = null;
    //iterate over input array
    for(var i = 0; i < arr.length; i++){
      //if name key strick= input name
        if(arr[i].name === name ){
          // reassign current to name values
            current = arr[i];
        }else{
          //else push name key values into name arr
            nameArr.push(arr[i].name);
        }
    }
    // input values results to null
    if(current === null){
      //return name
        return nameArr;
    }
    //iterate over resulting names
    for(var i = 0; i < nameArr.length; i++){
      //if current values of friends in the name array 
        if(current.friends.indexOf(nameArr[i]) == -1){
          //push values into not friends arr
            notFriends.push(nameArr[i]);
        }
    }
  //return notFriends
    return notFriends;
}

//////////////////////////////////////////////////////////////////////
// Function 14 - Update Object ///////////////////////////////////////
//////////////////////////////////////////////////////////////////////


function updateObject(object, key, value) {

    // iterate over input object and validate key, if key exist, modify its value with input value, else add key and value 

    if(object.hasOwnProperty(key)){
      object[key] = value 
    } else if(!object.hasOwnProperty(key)){
      object[key] = value
    }

    // return object
    return object
}

//////////////////////////////////////////////////////////////////////
// Function 15 - Remove Properties ///////////////////////////////////
//////////////////////////////////////////////////////////////////////

function removeProperties(object, array) {

    //given an input object and an array of strings, remove object keys that match string values of input array

    //iterate over input array to gain access to values
    for (let i = 0; i < array.length; i++){
        // if array values exist as object keys
     if(object.hasOwnProperty(array[i])){
       delete  object.hasOwnProperty(array[i]) 
     }
     
    }
       return object



}

//////////////////////////////////////////////////////////////////////
// Function 16 - Dedup ///////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

function dedup(array) {
    if (array.length > 0) {
        var result = [];

        array.forEach(function (elem) {
            if (result.indexOf(elem) === -1) {
                result.push(elem);
            }
        });

        return result;
    }
}



    // let arr = []
    // for (let i = 0; i < array.length; i++){
    //     if(array[i].includes(array[i])){
    //         delete array[i]
    //     } else {
    //         return arr.push(array[i])
    //     }
    // }
   
//////////////////////////////////////////////////////////////////////
// DON'T REMOVE THIS CODE ////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

if((typeof process !== 'undefined') &&
   (typeof process.versions.node !== 'undefined')) {
    // here, export any references you need for tests //
    module.exports.objectValues = objectValues;
    module.exports.keysToString = keysToString;
    module.exports.valuesToString = valuesToString;
    module.exports.arrayOrObject = arrayOrObject;
    module.exports.capitalizeWord = capitalizeWord;
    module.exports.capitalizeAllWords = capitalizeAllWords;
    module.exports.welcomeMessage = welcomeMessage;
    module.exports.profileInfo = profileInfo;
    module.exports.maybeNoises = maybeNoises;
    module.exports.hasWord = hasWord;
    module.exports.addFriend = addFriend;
    module.exports.isFriend = isFriend;
    module.exports.nonFriends = nonFriends;
    module.exports.updateObject = updateObject;
    module.exports.removeProperties = removeProperties;
    module.exports.dedup = dedup;
}