///////////// BOOTCAMP CHECKPOINT 1 PRACTICE /////////////

/*
Directions: We are creating a database to track recent films that we have seen. Each movie in this database will be respresented as an object with keys of title, year, director, and cast (the value of cast will be an array of the top 3 billed castmembers). Below is an example of what this movies array could look like.

var movies = [
  {
    title: "Fright Night",
    year: 1985,
    director: "Tom Holland"
    cast: ["William Ragsdale", "Chris Sarandon", "Amanda Bearse"]
  },
  {
    title: "Blue Velvet",
    year: 1986,
    director: "David Lynch"
    cast: ["Kyle Machlachlan", "Laura Dern", "Dennis Hopper"]
  },
  {
    title: "JFK",
    year: 1991,
    director: "Oliver Stone"
    cast: ["Kevin Costner", "Tommy Lee Jones", "Joe Pesci"]
  }
];

 */

// We will initialize our movies array as an empty array to start

// movies array to hold movie objects
var movies = []; 

/////////////////////// PART 1 ///////////////////////////
/*
Directions: Create a factory function called createMovie that takes in parameters of title, year, director, actor1, actor2, actor3. This function should return an object with keys of title, year, director, and cast. The value of cast should be an array populated with the 3 values passed in as actor1, actor2, actor3. Use 3 SEPARATE METHODS to add actor1, actor2, and actor3. Assume that actor1 needs to be FIRST value in the array, actor2 should be second and so on.
- example: createMovie("Fright Night", 1985, "Tom Holland", "William Ragsdale", "Chris Sarandon", "Amanda Bearse") => 
{ 
  title: "Fright Night",
  year: "1985",
  director: "Tom Holland",
  cast: ["William Ragsdale", "Chris Sarandon", "Amanda Bearse"];
}
 */

//createMovie var has a value thats a function with 6 parameters
let createMovie = (title, year, director, actor1, actor2, actor3) => { 
  
  // obj var to hold vale of an obj literal
  let obj = {};
  
    //key => obj.title, value => input value of title paramter 
    obj.title = title;
  
    //key => obj.year, value => input value of year parameter
    obj.year = year;
  
    //key => obj.director, value => input value of director parameter
    obj.director = director;
  
    //key => obj.cast, value => Array
    obj.cast = [];
  
    //key => obj.cast, value => input value of actor1 parameter at the 0th index using .splice(0,0)
    obj.cast.splice(0, 0, actor1);
  
    //key => obj.cast, value => input value of actor2 parameter at the 1st index using .splice(1,0)
    obj.cast.splice(1, 0, actor2);
  
    //key => obj.cast, value => input value of actor3 parameter at the 2nd index using .push(actor3)
    obj.cast.push(actor3);

    //return obj 
    return obj;
};

/////////////////////// PART 2 ///////////////////////////
/*
Directions: Assign the variables movie1, movie2, movie3 to the result of invoking the createMovie function.
- example: var movie4 = createMovie("JFK", "1991", "Oliver Stone", "Kevin Costner", "Tommy Lee Jones", "Joe Pesci").

Feel free to pass in values from any movie you choose. 
 */

var movie1 = createMovie('The Conjuring', 2013, 'James Wan', 'Vera Farmiga', 'Lili Tayloy', 'Ron Livingston');
var movie2 = createMovie('Insidious', 2010, 'James Wan', 'Rose Byrne', 'Patrick Wilson', 'Lin Shaye');
var movie3 = createMovie('Hereditary', 2018, 'Ari Aster', 'Toni Collette', 'Alex Wolff', 'Mily Shapiro');

/////////////////////// PART 3 ///////////////////////////
/*
Directions: Now that movie1, movie2, and movie3 are assigned the values of movie objects, add these movie objects to the movies array created on line 30.
 */

// Add movie1, movie2, movie3 to movies array below here
movies.push(movie1, movie2, movie3);
// Add movie1 movie2, movie3, to movies array above here
console.log(movies)
/////////////////////// PART 4 ///////////////////////////
/*
Directions: Assign the variable titleAndDate to a function that takes in a movie object. This function should return a string of that object's title followed by that object's year in parentheses.
- example: 

var sampleObj = {
    title: "Fright Night",
    year: 1985,
    director: "Tom Holland"
    cast: ["William Ragsdale", "Chris Sarandon", "Amanda Bearse"]
  };

  titleAndDate(sampleObj) => "Fright Night (1985)"
 */

//titleAndDate has a value of a funciton that returns an input objects title/year vals => 'title (year)'
const titleAndDate = movieObj => `${movieObj.title} (${movieObj.year})`;

//dirAndTitle has a val of a func that returns an input objects director/title vals => "director filmed title"
const dirAndTitle = moviesObj => `${moviesObj.director} filmed ${moviesObj.title} `;
console.log(titleAndDate(movie1));
console.log(titleAndDate(movie2));
console.log(titleAndDate(movie3));
console.log(dirAndTitle(movie1));

/////////////////////// PART 5 ///////////////////////////
/*
Directions: Assign the variable reverseCast to a function that takes in a movie object. This function should iterate through the movie object's cast property and return a new array of the original cast array's values reversed.
- example:
 
var sampleObj = {
    title: "Fright Night",
    year: 1985,
    director: "Tom Holland"
    cast: ["William Ragsdale", "Chris Sarandon", "Amanda Bearse"]
  };

  reverseCast(sampleObj) => ["Amanda Bearse", "Chris Sarandon", "William Ragsdale"]

 */
//the language around reverse() is ambigious, I believe it returns a new a array 
const reverseCast = movObj => movObj.cast.reverse()

console.log(reverseCast(movie1))

// reversecast has a val of a func 
const reverseCastt = movieObject => {
  // arr => Array
  let arr = [];
  // movieCast => cast Array
  let movieCast = movieObject.cast;
  // start: last val of cast Array; stop: >= 0; update: decrement
  for (let i = movieCast.length - 1; i >= 0; i-- ){
      // push reversed vals of cast Array in arr Array
     arr.push(movieCast[i])
  }
  //return arr
  return arr.reverse();
}

console.log(reverseCastt(movie1))