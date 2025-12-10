let timeLeft = 120; // timeLeft in seconds, should be > 0
let maxPokemonsPerGame = 100; // valid values, should range from 1 to 1025

const countdownInterval = setInterval( () => {
  // Calculate minutes and seconds
  const minutes = Math.floor(timeLeft / 60);
  let seconds = timeLeft % 60;

  // Format seconds to always have two digits (e.g., 05 instead of 5)
  seconds = seconds < 10 ? '0' + seconds : seconds;

  // Update the display
  timerDisplay.textContent = `${minutes}:${seconds}`;

	timeLeft--;

	if (timeLeft < 0) {
		clearInterval(countdownInterval); // stop the countdown timer
		timerDisplay.textContent = 'Time\'s up!';
		// TODO, render next view for game, eg. show who won/lose/draw
		// For now, I just "block" the player from entering input/click submit
		guessInput.disabled = true;
		mySubmitButton.disabled = true;

		// tested and found that if I stayed at an incorrect answer state,
		// BEFORE the timer finished, I could continue to click 'Next Pokemon' button!
		nextPokemonButton.disabled = true;  
	}
		
}, 1000); // update every 1000 milliseconds (1 second)


// generate a list (subset) of pokemons from all possible pokemons
// no repeats
function selectUniqueSubset(min, max, subsetSize) {
  // 1. Create an Array of the Range
  const rangeArray = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  // 2. Shuffle the Array (Fisher-Yates algo)
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  const shuffledArray = shuffleArray(rangeArray);

  // 3. Extract the Subset
  return shuffledArray.slice(0, subsetSize);
} 

// uniqueNumbers contains the ID numbers of N = subsetSize of pokemons, for current game
// to be "injected" into each client's front-end,
// eg. for remote / multiplayer play modes
const uniqueNumbers = selectUniqueSubset(1, 1025, maxPokemonsPerGame); // currently set to 100
//console.log(uniqueNumbers);

/*
 * to do / need to fix?
 * or just hardcode subsetSize = 1025, and include an easter egg / secret msg
 * if a player actually goes thru all 1025 pokemons in a single game?
 *
 * Possible error emerges when,
 * a player manages to pop off all the elements from uniqueNumbers array
 * in fetchRandomPokemon()
 */


// for shorter/more convenient variable referral, in code
const pokemonImage = document.getElementById('pokemon-image');
const guessInput = document.getElementById('guess-input');
const message = document.getElementById('message');
const mySubmitButton = document.getElementById("submit-guess");
const nextPokemonButton = document.getElementById('next-pokemon');
const timerDisplay = document.getElementById('countdown-timer');


let correctPokemonName = ''; // global, so can be shared by fetchRandomPokemon() & show-name/hintMsg
let score = 0;
let pokemonsEncountered = 0;

/*
 * to check whether game is working:
 * open console, to see NAME of currently displayed pokemon
 *
 * to "switch off" this "debug" mode,
 * comment out the line, console.log(data.name), in fetchRandomPokemon()
 *
 * to double-confirm names, visit bulbapedia
 * https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_National_Pok%C3%A9dex_number
 */
async function fetchRandomPokemon() {
	
	const randomId = uniqueNumbers.pop(); // get last element uniqueNumbers array 
	//console.log(randomId);
  const apiUrl = "https://pokeapi.co/api/v2/pokemon/" + randomId;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    displayPokemon(data);
    correctPokemonName = data.name.toLowerCase();
    
    console.log(data.name); // for debugging only, pls do NOT use to cheat!
    
  } catch (error) {
    console.error('Error fetching Pokémon:', error);
    message.textContent = 'Failed to load a Pokémon. Please try again.';
  }
}

function displayPokemon(data) {
  const imageUrl = data.sprites.front_default;
  pokemonImage.src = imageUrl;
  guessInput.value = '';
  message.textContent = '';
}

// 2 functions to update stats & display the updated stats in web page
// purely client-side!
function updateScoreDisplay() {
	document.getElementById("score-display").textContent = score;
	document.getElementById("pokemons-encountered").textContent = pokemonsEncountered;
}

function increaseScore(points) {
	score += points;
	pokemonsEncountered++;
	updateScoreDisplay();
}

function checkGuess() {
  const userGuess = guessInput.value.toLowerCase();
  if (userGuess === correctPokemonName) {
    message.textContent = 'Correct! You got it.'; // will probably flash past too quickly, hard for most people to see

    increaseScore(1); // increment score by 1

    fetchRandomPokemon();

	} else {
		/*
		 * Player has to manually click "next pokemon button" to proceed
		 * This is intentional
		 * So that player can take their time to learn, ie. match picture to name
		 */
		message.textContent = userGuess + ' is incorrect! The correct answer is: ' + correctPokemonName;

		increaseScore(0); // increment score by zero

		/*
		 * block player from either: (
		 * 1) altering their entered input, or
		 * 2) resubmitting their input
		 *
		 * Previously, it WAS possible for a player to alter their previous answer, and/or click submit, again and again... 
		 */
		guessInput.disabled = true;
		mySubmitButton.disabled = true; 

		// reveal the "Next Pokemon" button
		nextPokemonButton.style.display = 'inline'; 
  }
}

mySubmitButton.addEventListener('click', checkGuess);
nextPokemonButton.addEventListener('click', () => {

	// re-enable input field, and submit button
	guessInput.disabled = false;
	mySubmitButton.disabled = false;

	// hide the "Next Pokemon" button
  nextPokemonButton.style.display = 'none';

  fetchRandomPokemon();
});

// Run the game for the first time
fetchRandomPokemon();
console.log('Gotta ketchum all!')

/*
last updated 2025_12_09

changelog

v1, MVP 
v2, added function uniqueNumbers(), to create a list of pokemonIDs, for all players
v3, added a score counter
v4, disable input field for incorrect answer + re-enable input field when 'next-pokemon' button is pressed
v5, added pokemonsEncountered counter
v6, added countdown timer
*/
