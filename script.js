// values for "macros"
let timeLeft = 60; // timeLeft in seconds, value should be > 0
let pokemonsPerQuestion = 3;

// labels for document elements, for easier referral in code
const timerDisplay = document.getElementById('countdown-timer');
const pokemonImage = document.getElementById('pokemon-image');
const mcqButtons = document.getElementById('options');
const resultElement = document.getElementById('result');
const tryAgainButton = document.getElementById('reload-button');

const hiScore = document.getElementById('hi-score');
const resetStatsButton = document.getElementById('reset-stats-button');

// game-level vars
let score = 0;
let pokemonsEncountered = 0;

// question-level vars
let mcqOptions = [];
let option_1_name = '';
let option_2_name = '';
let correctPokemonName = ''; // option_3_name

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
		
		// need to "clear the screen" by removing mcqButtons
		// otherwise, user can still submit one last guess, AFTER time is up!
		mcqButtons.innerHTML = '';
		resultElement.textContent = '';
		
		// TO DO? call a backend API, to submit scores for current user, for user stats persistence
		
		// increment the number of games played by one
		let games_played_record = localStorage.getItem('numGamesPlayed');
		games_played_record++;
		localStorage.setItem('numGamesPlayed', games_played_record);
		if (games_played_record > 1) {
			timerDisplay.textContent = 'Time\'s up! You have played ' + games_played_record + ' times';
		} else {
			timerDisplay.textContent = 'Thank you for trying out Pokemon Guessr';
		}
		
		// Instead of storing user stats in a backend db, we can store it client-side (in localStorage)
		let prev_hi_score = localStorage.getItem('gameScore');
		if (score > prev_hi_score) {
			localStorage.setItem('gameScore', score); // store in client-side
			hiScore.textContent = score; // update hi score to be displayed
			resultElement.textContent = "Congratulations! " + score + " is your new high score!"; 
		} else if (score == prev_hi_score) {
			resultElement.textContent = "Not bad... You have equalled your previous high score of " + score + "";
		}

		// unhide/show "Try Again" button
		tryAgainButton.style.display = 'block';

		// unhide/show "reset Stats" button
		resetStatsButton.style.display = 'block';
	}
		
}, 1000); // update every 1000 milliseconds (1 second)

function reloadPage() {
	window.location.reload();
}

function resetStats() {
	localStorage.setItem('numGamesPlayed', 0);
	localStorage.setItem('gameScore', 0);
	reloadPage();
}

// generate a subset of pokemon IDs, from all possible pokemons; no repeats
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

// valid values for "id", range from 1 to 1025, inclusive
async function fetchPokemonName(id) { 
  const apiUrl = "https://pokeapi.co/api/v2/pokemon/" + id;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    const name = data.name;
		
	mcqOptions.push(name);
	//console.log("fpn(): ", id, name); // debug

  } catch (error) {
    console.error("Error fetching Pokémon's name: ", error);
  }
}

async function fetchPokemonImg(id) {
  const apiUrl = "https://pokeapi.co/api/v2/pokemon/" + id;

  try {
		// Step 1 of 3:
    const response = await fetch(apiUrl);
    const data = await response.json();

		// set the value for image src, for the document.element in the FE
		pokemonImage.src = data.sprites.front_default;

		// set the correct answer, to compare with submitted option
		correctPokemonName = data.name;
		console.log("fpi(): ", id, correctPokemonName);

		// add correct answer, to mcqOptions
		mcqOptions.push(correctPokemonName);
  } catch (error) {
    console.error("Error fetching Pokémon image: ", error);
  }
}

async function generateQuestion() {
	mcqButtons.innerHTML = ''; // clear buttons (for mcqOptions) on FE
	mcqOptions.length = 0; // clear array for "mcqOptions"

	console.log("starting 3rd party API calls...");

	let pokemonIds = selectUniqueSubset(1, 1025, pokemonsPerQuestion);

	let id1= pokemonIds.pop();
	let id2= pokemonIds.pop();
	let id3= pokemonIds.pop();

	const promises = [
		fetchPokemonImg(id1), // only "correct" answer, needs to D/L image 
		fetchPokemonName(id2), // rest only needs the name to be "pulled"
		fetchPokemonName(id3) // from 3rd party API
	];
	
	try {
		// wait, for the "previous" bunch of necessary API calls 
		const results = await Promise.all(promises);
		console.log("3rd party API calls were successful!");

		/*
		 * IMPORTANT, we should only call the functions below,
		 * AFTER entire array of promises, ie. "results" has resolved
		 * Spent a long time debugging,
		 * only to finally realize that NOT doing the async part correctly,
		 * was jamming me up...
		 * T_T
		 *
		 * However, there is one advantage of the async approach:
		 * The order of elements in mcqOptions is "randomized"!
		 * This is because the 3 async calls will NOT always resolve in the order
		 *
		 * This also meant that the correct mcq option,
		 * could be in any position, ie. randomized
		 * when presented to the user in the FE!
		 */
		
		// creates a button for each mcq option
		mcqOptions.forEach((option, index) =>
			{
				const button = document.createElement('button');
				button.textContent = option;
				button.addEventListener('click', () =>
					{
						// once user clicks an option,
						// we should remove the availble options,
						// in case they try to click some more; see rate limiting
						mcqButtons.innerHTML = '';
						checkAnswer(index);
					}
				);
				mcqButtons.appendChild(button);
			}
		);	
	} catch (error) {
		console.error("One of the API calls, failed...", error);
	}
}

function checkAnswer(index) {
	//console.log("submitted:", index, mcqOptions[index]);
	let correctFlag = 0;

	if (mcqOptions[index] === correctPokemonName) {
		correctFlag = 1;
		score++;
		resultElement.textContent = "Correct!";
		console.log("Correct!");
		
	} else {
		let feedback = "Wrong... Correct answer is " + correctPokemonName;
		resultElement.textContent = feedback;
		console.log("Wrong... Correct answer is", correctPokemonName);
	}
		
	pokemonsEncountered++;
	updateScoreDisplay();

	// default is 1 second delay, to show result of choice
	// option to vary the delay for correct/wrong submission
	// NOTE. if timeLeft > 0, ie. when timeLeft == 1, it may cause generateQuestion to be called AFTER time runs out...
	if (timeLeft > 2) {
			if (correctFlag) {
				setTimeout(() => {
					resultElement.textContent = "";
					generateQuestion();
				}, 1000);
			} else {
				setTimeout(() => {
					resultElement.textContent = "";
					generateQuestion();
				}, 1000);
			}
		}
}

function updateScoreDisplay() {
	document.getElementById("pokemons-encountered").textContent = pokemonsEncountered;
	document.getElementById("score-display").textContent = score;
}

console.log('Gotta ketchum all!');
hiScore.textContent = localStorage.getItem('gameScore'); // get high score (only show, after 1st game!)

pokemonsEncountered++; 
updateScoreDisplay();

generateQuestion(); // generate the first question

/*
last updated 2026_01_24

changelog

v1, MVP 
v2, added function uniqueNumbers(), to create a list of pokemonIDs, for all players
v3, added a score counter
v4, disable input field for incorrect answer + re-enable input field when 'next-pokemon' button is pressed
v5, added pokemonsEncountered counter
v6, added countdown timer
v7, refactored fetchRandomPokemon() + displayPokemon() into fetchPokemonImg(), fetchPokemonName(), & generateQuestion()
also figured out how to await a bunch of "necessary" API calls, BEFORE calling next function
v8, added dynamic generation of buttons for (currently N == 3) mcqOptions on FE +
complementary checkAnswer() w/ option for variable feedback delay
v9, ensure that AFTER user clicks on an option, removed mcqOptions from FE,
also ensured that after timeOver, mcqOptions are removed, to prevent one last try, that can take forever
v10, added a "try again" button (and its supporting functionality) so that after the time runs out, a user can try again, WITHOUT having to refresh the webpage via the browser
v11, implemented 2 features: (1) tracking of high score and numGamesPlayed, using localStorage; (2) reset stats button
v12, changed "if (timeLeft > 0)" to "if (timeleft > 2)", to avoid undesired scenario of generating question AFTER time runs out. Note. generateQuestion() will only be called AFTER 1 second of delay
*/
