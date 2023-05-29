// #!/usr/bin/env node

'use strict';

var customers = require('./data/customers.json');
var _ = require('underbar');

/**
 * 1. Import your lodown module using the require() method,
 *    using the string , or whatever
 *    name with which you published your npm lodown project.
 *
 * 2. Solve all problems as outlined in the README.
 *
 * 3. We started the first one for you as an example! Make the rest in that style.
 *
 * 4. To test your work, run the following command in your terminal:
 *
 *    npm start --prefix ./<YOUR_GITHUB_FOLDER>
 *
 *    IMPORTANT: Make sure you replace <YOUR_GITHUB_FOLDER with your actual github folder name that is in your workspace.
 */


var maleCount = (array) => {
  let arr = []
 const males = array.filter((gender) => {
      if(gender.gender === 'male' ){
          arr.push(gender)
        return gender
      }
  })

  return males.length
}
//console.log(maleCount(customer))

var femaleCount = (array) => {

  const females = array.reduce(
      (accum, curr) => accum.concat(curr), [])
      .filter(item => item.gender === 'female').length

 return females

};
// console.log(femaleCount(customer))



var oldestCustomer = (array) => {
// const to hold a func that maps over input array an returns array of ages



const agesArray = array.map((age) => {
   return age.age

})
// call Math.max on agesArray to store max age in max variable 
let max = Math.max(...agesArray)


// const to hold func value that will iterate over input array to 
const oldest = array.filter(cust => {
 //compare max var to ages prop and return the prop
  if(cust.age === max){
    let name = cust.name
    return name
  }
})
//return oldest property of name value
return oldest[0].name  
}

//console.log(oldestCustomer(customer))


var youngestCustomer = (array) => {
// const to hold a func that maps over input array an returns array of ages
const agesArray = array.map((age) => {
 return age.age

})
// call Math.min on agesArray to store max age in max variable 
let min = Math.min(...agesArray)

// const to hold func value that will iterate over input array to 
const youngest = array.filter(cust => {
 //compare max var to ages prop and return the prop
  if(cust.age === min){
   let name = cust.name
    return name
  }
})
//return youngest property of name value
return youngest[0].name  
}

//console.log(youngestCustomer(customer))


var averageBalance = array =>  {

const balanceString = array.map( (a) => a.balance)
  
   let onlyBalance = balanceString.join(' ').replaceAll(/,/g, '')
    
    let numsArray = onlyBalance.replaceAll('$', '').split(' ')
   // console.log(numsArray)

    let nums = numsArray.map( nums => parseFloat(nums))
   // console.log(nums)
    
    const balanceSum = nums.reduce( (acc, curr) => acc + curr / nums.length, 0) 
    return balanceSum
}
// console.log(averageBalance(customer))

var firstLetterCount = (array, letter) => {
//name func express to hold an array of customer names
const names = array.map(cust => cust.name)
 //first func express to reduce over names array to count return an object     of with keys matching 0th index  of the names array of strings
const first = names.reduce((acc, curr) => {
      // assign current value to the oth index of the current name 
     var firstChar = curr[0];
    // if a letter exist 
    if(acc[firstChar]){
      //increment letter by one every time its represented 
      acc[firstChar]++
      // else
    } else {
      //assign number value to 1
      acc[firstChar] = 1
    }
    

   // return acc
  return acc
  
  
} ,{})
   // if the letter exist toUpperCase, return that letter toUppercase ,
  //return 0, this returns an insensitive
  return first[letter.toUpperCase()] ? first[letter.toUpperCase()] : 0




}
// console.log(firstLetterCount(customer, 'd'))

var friendFirstLetterCount = (array, client, letter) =>  {

  //iterate over input array
  const cust = array.filter( person => {
    // if client excist on name property
    if(person.name === client){
    //return person
    return person

      //console.log(cust)
    }});
    // var to hold the value of friends value of the  <client>
    let friendsFromObj = cust[0].friends 

    //map only the name property client property
    const friendVals = friendsFromObj.map(names => names.name)
   // console.log(friendVals)
    
    const onlyFans = friendVals.reduce( (acc, curr) => {
      //assign current value to only the oth index from current string
      let firstLetter = curr[0]
      
      // if the bank has a first letter
      if(acc[firstLetter]){
        //increment plus 1
        acc[firstLetter]++
      } else {
        // else value = 1
        acc[firstLetter] = 1

      }
      return acc
     
    },{})

return onlyFans[letter.toUpperCase()]

}
//console.log(friendFirstLetterCount(customer, 'Doris Smith', 'B' ))

var friendsCount = (array, name) => {

  const names = array.reduce((acc, customer) => {
    const friends = customer.friends
    
    const hasFriend = friends.some(friend => friend.name === name)
    
    if(hasFriend){ acc.push(customer.name)
    }
    return acc
  }, [])
  return names;

}
//console.log(friendsCount(customer,'Buckner Kennedy'))



var topThreeTags = (array) => {
//output array
let output = []
//an array to hold all tags from objects in input array
let tags = array.map( a => a.tags)
//map set to value of obj literal
var tagMap = {}
 // for each item in the tags array
//iterate and assign the tags to a key 
// assign the value of keys to the count of the key or tag count =0
let each = array.forEach( function( item ){
 item.tags.forEach( function( tag ){
    tagMap[ tag ] = ( tagMap[ tag ] || 0 ) + 1;
 })
});
// create an array from the tagmap
let sortedArr = Object.keys(tagMap)
  //map the values to an array
  .map(s => [s, tagMap[s]])
  //sort values based on count
  .sort((a, b) => a[1] - b[1]);
//slice the last three values from map array
  output = sortedArr.slice(-3);
   
//console.log(sortedArr)
  
//return an array of the values at thier index 
return [output[0][0], output[1][0], output[2][0]]
    
}
// console.log(topThreeTags(customer))

var genderCount = (array) =>  {
//reduce over the input array to return an object 
let genderObj = array.reduce((acc, curr) => {
      //assign gender to the current value of the gender 
    let genderVal = curr.gender
    // if gender exist
    if(acc[genderVal]){
      //count gender plus 1
      acc[genderVal]++
      //else
    } else {
      //assign gender to value of 1
      acc[genderVal] = 1
    }
  //return accum
    return acc
  },{})      

return genderObj
}

//console.log(genderCount(customer))


    

//////////////////////////////////////////////////////////////////////
// DON'T REMOVE THIS CODE ////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

// here, export any references you need for tests //
module.exports.maleCount = maleCount;
module.exports.femaleCount = femaleCount;
module.exports.oldestCustomer = oldestCustomer;
module.exports.youngestCustomer = youngestCustomer;
module.exports.averageBalance = averageBalance;
module.exports.firstLetterCount = firstLetterCount;
module.exports.friendFirstLetterCount = friendFirstLetterCount;
module.exports.friendsCount = friendsCount;
module.exports.topThreeTags = topThreeTags;
module.exports.genderCount = genderCount;