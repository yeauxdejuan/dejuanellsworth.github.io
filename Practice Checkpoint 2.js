//////////// BOOTCAMP CHECKPOINT 2 PRACTICE /////////////

/*
Directions: We are continuing to develop our movie database. Our database currently looks like this:

var movies = [
  {
    title: "Fright Night",
    year: "1985",
    director: "Tom Holland"
    cast: ["William Ragsdale", "Chris Sarandon", "Amanda Bearse"]
  },
  {
    title: "Blue Velvet",
    year: "1986",
    director: "David Lynch"
    cast: ["Kyle Machlachlan", "Laura Dern", "Dennis Hopper"]
  },
  {
    title: "JFK",
    year: "1991",
    director: "Oliver Stone"
    cast: ["Kevin Costner", "Tommy Lee Jones", "Joe Pesci"]
  }
];
 */

var movies = [
    {
      title: "Fright Night",
      year: "1985",
      director: "Tom Holland",
      cast: ["William Ragsdale", "Chris Sarandon", "Amanda Bearse"]
    },
    {
      title: "Blue Velvet",
      year: "1986",
      director: "David Lynch",
      cast: ["Kyle Machlachlan", "Laura Dern", "Dennis Hopper"]
    },
    {
      title: "JFK",
      year: "1991",
      director: "Oliver Stone",
      cast: ["Kevin Costner", "Tommy Lee Jones", "Joe Pesci"]
    }
  ];
  
  ////////////////////// PART 1 ///////////////////////////
  /*
  Directions: Assign the variable findMovie to a function that takes in a parameter of array and title. Array represents an array of objects like our movies array; title represents a movie title to the movie we are searching for. We want to iterate through the input array and if we find the object with the matching title we want to return that movie object. If we do not finding the object with the matching title, we want to return null.
   */
  
  //findMovie func expres with 2 params
  var findMovie = (array, string) => {
    //loop over input array
    for (let i = 0; i < array.length; i++){
      // if array title value value strick= input string
      if(array[i].title === string){
        // return value that meets condition
        return array[i]
        } else {
        //else null
        return null
      } 
    }
  }
  
  //console.log(findMovie(movies, "Fright Night"))
  
  ////////////////////// PART 2 ///////////////////////////
  /*
  Directions: Assign the variable addDecadeProp to a function that takes in parameters of array. This function should iterate through input array (in this case the movies array), and for each object it should add a key of "decade". The function should access the current object's year property to determine what year the film came out. If the film came out in the 90s, the value at the decade prop should be "90s" and so on. For this problem, assume every there are no films that came out AFTER 1999.
   */
  
  // addDecadeProp func express with array param
  var addDecadeProp = (array) => {
    //loop over input array
     for(let i = 0; i < array.length; i++){
       //add key of decade to array
       array[i]['decade'] = ''
       //if array title value > 1989
       if(array[i].year > 1989){
         //redeclare decade value to 90s
         array[i].decade = '90s'
       }
       
     }
      //return array
       return array
   }
  //console.log(addDecadeProp(movies))
  
  ////////////////////// PART 3 ///////////////////////////
  /*
  Directions: Assign the variable addMovieProp to a function that takes in parameters of obj, key, and value. Obj represents an object that we are going to add a new key/value pair to; key represents the new key we are going to add to this object; value represents the value we are going to attach to this key.
  - example: addMovieProp(movies[1], "oscarNoms", "Best Director") => 
  {
      title: "Blue Velvet",
      year: "1986",
      director: "David Lynch",
      cast: ["Kyle Machlachlan", "Laura Dern", "Dennis Hopper"],
      oscarNoms: "Best Director"
    }
   */

  // addMovieProp func express with 3 params
  var addMovieProp = (obj, key, value) => {
    //use bracket notation to take an input obj
    //assign input key to input value
    obj[key] = value
    //return obj
    return obj
  }
    console.log(addMovieProp(movies[1], 'oscarNoms', 'Best Director'))
  
  ////////////////////// EXTRA ///////////////////////////
  /*
  Directions: This problem is almost exactly the same as the problem #2, EXCEPT you need to provide for movies that came out after 1999. For instance, if a movie's year was 2005, the value for decade should be "2000s"; if the movie came out in 2015, the value for decade should be "2010s".
   */
  
  var addDecadeExtra = (array) => {
     for(let i = 0; i < array.length; i++){
       array[i]['decade'] = ''
       
       if(array[i].year > 1989 ){
         array[i].decade = '90s'
       } else if(array[i].year > 2000){
         array[i].decade = '2000s'
       }
     }
       return array
   }