/**
 * Part 2
 *
 * In this file, we're going to create some
 * Functions to work with our data created in
 * data.js.
 *
 * See the README for detailed instructions,
 * and read every instruction carefully.
 */

//////////////////////////////////////////////////////////////////////
// Step 1 - Search ///////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

// func with 2 params 
function search(arr, string){
    // iterate over input array
    for (let i = 0; i < arr.length; i++){
        //if key of name strick= string 
        if (arr[i].name === string){
            //return value at its index
            return arr[i]
        } 
    } // else return null
        return null
};

//////////////////////////////////////////////////////////////////////
// Step 2 - Replace //////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

// func to replace with 3 params
function replace(animals, name, replacement){
    //iterare over animals array
    for (let i = 0; i < animals.length; i++ ){
        // if key of name has a value of input name
        if (animals[i].name === name){
            //return the placement Object at that values index
            return animals[i] = replacement
        } 
    }
};


//////////////////////////////////////////////////////////////////////
// Step 3 - Remove ///////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

// remove func with 2 params
function remove(animals, name){
    //iterate over animals 
    for (let i = 0; i < animals.length; i++){
        //if animal name exist
        if(animals[i].name === name){
            //use splice to remove value at its index
             animals.splice(i, 1)
        } 
    }
};


//////////////////////////////////////////////////////////////////////
// Step 4 - Add ///////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

//function add that takes 2 params
function add(animals, animal){
    //check to see if input obj has a key of 'name' with a length > 0
    //check to see if input obj has a key of 'species' with a length > 0
    if(Object.keys(animal.name).length > 0 && Object.keys(animal.species).length > 0 && Object.keys(animal)){}


    //return animals
};

/**
 * You did it! You're all done with Matchy!
 */



//////////////////////////////////////////////////////////////////////
// DON'T REMOVE THIS CODE ////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
var search, replace, remove, add;
if((typeof process !== 'undefined') &&
   (typeof process.versions.node !== 'undefined')) {
    module.exports.search = search || null;
    module.exports.replace = replace || null;
    module.exports.remove = remove || null;
    module.exports.add = add || null;
}
