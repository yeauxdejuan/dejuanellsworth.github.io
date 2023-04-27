// #!/usr/bin/env node

'use strict';

/**
 * 4: Contact List
 * 
 *  a. Create a factory Function called makeContact(id, nameFirst, nameLast) 
 *     that returns a contact object.
 *     
 *          ex: makeContact(1, 'Max', 'Gaudin'); // => {id: 1, nameFirst: 'Max', nameLast: 'Gaudin'}
 *     
 *  b. Create a factory Function called makeContactList that returns an Object 
 *     that manages contacts. The contact-list object should have the following methods:
 *       
 *      1. length(): returns the number of contacts within the list.
 *      2. addContact(contact): takes a contact object to be added to the 
 *         contact-list.
 *      3. findContact(fullName): takes a full-name String, like 'Max Gaudin', and 
 *         returns the contact object if found in the contacts-list, or, 
 *         undefined if the fullName does not match any contacts in the list.
 *      4. removeContact(contact): takes a contact object to be removed from 
 *         the contact-list.
 *      5. add a printAllContactNames() Function to your makeContactList() factory. The printAllContactNames() Function should 
 *         return a String formated with all the full-names of the separated 
 *         with a line-break, like so:
 *          
 *         myContacts.printAllContactNames(); // => Max Gaudin
 *                                                  John Fraboni
 *                                                  Kaelyn Chresfield
 *          
 *          WARNING: To pass this test, the LAST full name should have NO
 *          new-line character added after it!
 */

// YOUR CODE GOES BELOW HERE //
function makeContact(id, nameFirst, nameLast) {
    return {// return obj
        id: id,// id key with value of id input value(param)
        nameFirst: nameFirst, //nameFirst key with nameFirst input value(param)
        nameLast: nameLast //lastName key with nameLast input value(param)
    };
} 


function makeContactList() {
    /*
     * You need something here to hold contacts. See length api for a hint:
     */
    var contacts = [] // contacts = array literal to apply array methods
    return {
        // we implemented the length api for you //
        length: function() {
            return contacts.length;

            },

        addContact: contact => contacts.push(contact), //addContact func to push contact into contacs array
        

        findContact: function (fullName) {
            for (let i = 0; i < contacts.length; i++){//iterte over contacts array
                if (fullName === contacts[i]['nameFirst'] + ' ' + contacts[i]['nameLast']){ // on iteration, if nameFirst and nameLast strick= fullName input
                    return contacts[i]// return iterable values
                } else {
                    return undefined 
                }
            }
        },

        removeContact: function(contact) {
            for (let i = 0; i < contacts.length; i++){
                if (contacts[i] === contact){ // on iteration, if inout value matches contact list
                    return contacts.splice(i, 1) //remove contact at its index
                }
            }
        },

        printAllContactNames: function(){
            let arr = []; 

            for (let i = 0; i < contacts.length; i++){ //iterate over contacts array

             let fullNames = contacts[i]['nameFirst'] + ' ' + contacts[i]['nameLast'] //assign nameFirst value + ' ' + nameLast value to fullName var
                arr.push(fullNames) //push fullNames into array 
              }

              return arr.join('\n')// return array joined with line break   
        }

    }
}




// YOUR CODE GOES ABOVE HERE //




// DON'T REMOVE THIS CODE //////////////////////////////////////////////////////
if((typeof process !== 'undefined') &&
(typeof process.versions.node !== 'undefined')) {
    // here, export any references you need for tests //
    module.exports.makeContact = makeContact;
    module.exports.makeContactList = makeContactList;
}
