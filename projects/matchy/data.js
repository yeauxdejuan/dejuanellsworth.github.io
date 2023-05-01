/**
 * Part 1
 *
 * In this file, we're going to practice
 * creating and accessing data structues.
 *
 * See the README for detailed instructions,
 * and read every instruction carefully.
 */

//////////////////////////////////////////////////////////////////////
// Step 1 - Object Creation //////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

// asiignned a var named animal to an obj literal 

var animal = {};

//use dot notation to add species 
animal.species = 'Dog';


//use bracket  to add name key with name value
animal['name'] = 'Chicageuax';

// use either noation to give obj a key of noises
animal.noises = ['Barks!'];

//print animal obj to console
console.log(animal)

//////////////////////////////////////////////////////////////////////
// Step 2 - Array Creation ///////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

//create an array named noises assigned to an empty array
 var noises = [];

 //use bracket notation to give noises it's first el
 noises[0] = 'Bark';

 //use array function to add another noises to end of the array
 noises.push('Growl');

 //add an an element at the beggining of the array
 noises.unshift('Whimper');

 //add another element to the end of the array
 noises[3] = 'Yawn';

 //log the length og noises 
 console.log(noises.length)

 //log the last element in noises
 console.log(noises[noises.length - 1]);

 //log the entire array
 console.log(noises);




//////////////////////////////////////////////////////////////////////
// Step 3 - Combining Step 1 and 2 ///////////////////////////////////
//////////////////////////////////////////////////////////////////////

//using bracket syntx, add noises array to the value of the noises key
animal['noises'] = noises

//add another noise to noise array
animal.noises.splice(0, 0, 'Loud Barks');

//log animal
console.log(animal);


/* *******************************************************************
 * Step 4 - Review
 *
 * 1. What are the different ways you can access properties on objects?
 *  // Object.keys()
 * 2. What are the different ways of accessing elements on arrays?
 *
 * *******************************************************************
 */

/* *******************************************************************
 * Step 5 - Take a Break!
 *
 * It's super important to give your brain and yourself
 * a rest when you can! Grab a drink and have a think!
 * For like 10 minutes, then, BACK TO WORK! :)
 * *******************************************************************
 */

//////////////////////////////////////////////////////////////////////
// Step 6 - A Collection of Animals //////////////////////////////////
//////////////////////////////////////////////////////////////////////

//assign var named animals assigned to empty array
var animals = [];

//push animals into animals 
animals.push(animal);

//log animals
consolelog(animals);

//assign duck to var data
var duck = { species: 'duck', name: 'Jerome', noises: ['quack', 'honk', 'sneeze', 'woosh'] }

//push duck to animals
animals.push(duck);

//////////////////////////////////////////////////////////////////////
// Step 7 - Making Friends ///////////////////////////////////////////
//////////////////////////////////////////////////////////////////////



/**
 * Nice work! You're done Part 1. Pat yourself on the back and
 * move onto Part 2 in the file called "functions.js"
 */



//////////////////////////////////////////////////////////////////////
// DON'T REMOVE THIS CODE ////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
var animal, noises, animals, friends, getRandom;
if((typeof process !== 'undefined') &&
   (typeof process.versions.node !== 'undefined')) {
     module.exports.animal = animal || null;
     module.exports.noises = noises || null;
     module.exports.animals = animals || null;
     module.exports.friends = friends || null;
     module.exports.getRandom = getRandom || null;
}