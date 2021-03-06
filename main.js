// COULDDO: Put CPU decision logic in a promise, run after showing result, and await
// after choice has been made for slightly snappier UX with larger datasets

// ALSOCOULDDO: Not that bc I have like two days to do this l a u g h   o u t   l o u d

// TODO: It randomly got meta 4 at start somehow figure out why please

/**
 * Maximum length that a pattern can be.
 */
const maxPatternLength = 5;

/**
 * Chance for random generator to be used.
 */
const randomChance = 0.05;

/**
 * Chance for the meta selector to pick a random meta. TODO: Move from this to making metaEfficacy the base for random selection instead of just picking highest one
 */
const randomMetaChance = 0.1;

/**
 * The thing that each meta is multiplied all the time to do a cool.
 * I'm pretty sure this is implemented now?
 */
const metaDecayFactor = 1 - (1/5);

/**
 * An "enum" that contains all the choices a player/cpu can make.
 */
const Choice = {
    Rock: 0,
    Paper: 1,
    Scissors: 2
}

/**
 * How to handle each meta-strategy.
 */
const metaProtocol = [
    p0,
    p1,
    p2,
    pp0,
    pp1,
    pp2
];

/**
 * Scores of how each meta has performed in the game.
 */
let metaEfficacy = [0, 0, 0, 0, 0, 0];

/**
 * Index of current meta we are using.
 */
let metaIndex = null;

/**
 * What the player has previously played.
 */
let playerHistory = [];

/**
 * All of the detected patterns that the player has.
 */
let playerPatterns = [];

/**
 * What the cpu has previously played.
 */
 let cpuHistory = [];

 /**
  * All of the detected patterns that the cpu has.
  */
 let cpuPatterns = [];

/**
 * The number of matches that have been played in the game.
 */
let matchCounter = 0;

/**
 * The document node that handles the debug text in the top-left corner.
 */
let debug;

/**
 * The document node that contains the indicators for game outcome history.
 */
let outcomeBar;

/**
 * Giant display text that shows outcome.
 */
let jumbotron;

// false == p1 win
// true  == p2 win
// null  == tie
function determineWin(p1, p2) {
    if (p1 == p2) {
        return null;
    } else if (p1 == Choice.Rock && p2 == Choice.Scissors) {
        return false;
    } else if (p2 == Choice.Rock && p1 == Choice.Scissors) {
        return true;
    } else if (p2 < p1) {
        return false;
    } else if (p1 < p2) {
        return true;
    }
    
    console.warn("determineWin: Couldn't resolve game!");
    return undefined;
}

/**
 * Picks a random integer between the provided values (max-exclusive).
 * @param {Number} max Maximum number (exclusive).
 * @param {Number} min Minimum number (inclusive, defaults to 0).
 */
function randomInt(max, min = 0) {
    return Math.floor(Math.random() * (max - min)) + min;
}

// Handles making a choice
function handleInput(playerInput) {
    let cpuInput;
    
    // Determine the cpu's move if it isn't the first match
    if (matchCounter > 0) {
        debugMessage("Determining CPU choice... (this might take a second)");
        cpuInput = determineCpuMove();
    } else {
        debugMessage("Determining CPU choice... (this won't take a second)");
        cpuInput = randomInt(3);
    }
    
    // Figure out who won the match
    let matchResult = determineWin(playerInput, cpuInput);
    
    // Handle learning logic if it isn't the first match
    playerHistory.unshift(playerInput);
    cpuHistory.unshift(cpuInput);
    if (matchCounter > 0) {
        debugMessage("Taking notes...");
        let stack = [];
        
        for (let i = 1; i < playerHistory.length && i < maxPatternLength + 1; i++) {
            stack.push(playerHistory[i]);

            let twinSearch = playerPatterns.find((pattern) => {
                return pattern.indicator.length === stack.length && arraysEqual(pattern.indicator, stack) && playerHistory[0] === pattern.indication;
            });
            
            if (twinSearch === undefined) {
                playerPatterns.push({
                    /**
                     * The array that defines what to look for.
                     */
                    indicator: stack.slice(),
                    /**
                     * What the pattern means for what's happening next.
                     */
                    indication: playerHistory[0],
                    playHistory: 1
                });
            } else {
                twinSearch.playHistory++;
            }
        }
        
        stack = [];

        twinSearch = cpuPatterns.find((pattern) => {
            return pattern.indicator.length === stack.length && arraysEqual(pattern.indicator, stack) && cpuHistory[0] === pattern.indication;
        });
        
        if (twinSearch === undefined) {
            for (let i = 1; i < cpuHistory.length && i < maxPatternLength + 1; i++) {
                stack.push(cpuHistory[i]);
                
                cpuPatterns.push({
                    indicator: stack.slice(),
                    indication: playerHistory[0],
                    playHistory: 1
                });
            }
        } else {
            twinSearch.playHistory++;
        }

        if (matchResult !== null) {
            matchResult ? metaEfficacy[metaIndex]++ : metaEfficacy[metaIndex]--;
            metaEfficacy.forEach((meta) => meta *= metaDecayFactor);
        }
    }
    
    // Resolve a string to describe the match's result
    debugMessage("Determining winner...");
    if (matchResult === null) {
        debugTimeoutMessage("Tie", "Waiting for user input...", 1000);
        displayMessage(`${choiceToString(playerInput)} vs. ${choiceToString(cpuInput)}<br>You tied.`);
    } else if (matchResult === true) {
        debugTimeoutMessage("CPU wins", "Waiting for user input...", 1000);
        displayMessage(`${choiceToString(playerInput)} vs. ${choiceToString(cpuInput)}<br>You lost..`);
    } else if (matchResult === false) {
        debugTimeoutMessage("Player wins", "Waiting for user input...", 1000);
        displayMessage(`${choiceToString(playerInput)} vs. ${choiceToString(cpuInput)}<br>You won!`);
    } else if (matchResult === undefined) {
        console.warn("handleInput: Couldn't resolve win string (determineWin() === undefined)");
        debugTimeoutMessage("Error occurred", "Waiting for user input...", 1000);
        displayMessage(`${choiceToString(playerInput)} vs. ${choiceToString(cpuInput)}<br>Something odd happened.`);
    } else {
        console.warn("handleInput: Couldn't resolve win string (reached fallback)");
        debugTimeoutMessage("What is even happening right now man", "Waiting for user input...", 2000);
        displayMessage(`${choiceToString(playerInput)} vs. ${choiceToString(cpuInput)}<br>Something odd happened.`);
        matchResult = undefined;
    }

    pushOutcome(matchResult);
    
    // Tell the user the result of the match
    // TODO: Make UI for this instead
    console.log(`${choiceToString(playerInput)} vs. ${choiceToString(cpuInput)} : ${matchResult}`);
    
    // Increment matchCounter
    matchCounter++;
}

function determineCpuMove() {
    // Decide which meta we use
    if (Math.random() < randomMetaChance) {
        metaIndex = randomInt(metaEfficacy.length);
    } else {
        let winnerValue = 0;
        metaIndex = 0;

        metaEfficacy.forEach((n, i) => {
            if (winnerValue < n) winnerIndex = i; winnerValue = n;
        });
    }

    console.log(`determineCpuMove: Using meta ${metaIndex}.`);

    // Decide which predictor we use
    return metaProtocol[metaIndex]((Math.random() < randomChance) ? randomPredict : historyPredict);
}

// #region Meta Strategies

/**
 * "Naive Application"
 * 
 * Play to beat predicted move
 * @param {Function} p Reference to predictor function
 * @returns {Choice.Rock | Choice.Paper | Choice.Scissors} What choice the CPU should make
 */
function p0(p) {
    return rotateChoice(p(playerPatterns, playerHistory));
}


/**
 * "Defeat Second-Guessing"
 * Assume your opponent thinks you use {@link p0}
 * @param {Function} p Reference to predictor function
 * @returns {Choice.Rock | Choice.Paper | Choice.Scissors} What choice the CPU should make
 */
function p1(p) {
    return p(playerPatterns, playerHistory);
}

/**
 * "Defeat Triple-Guessing"
 * Assume your opponent thinks you use {@link p1}
 * @param {Function} p Reference to predictor function
 * @returns {Choice.Rock | Choice.Paper | Choice.Scissors} What choice the CPU should make
 */
function p2(p) {
    return rotateChoice(p(playerPatterns, playerHistory), false);
}

/**
 * "Second-Guess Opponent"
 * Use your own prediction to predict what they'd do or something like that
 * @param {Function} p Reference to predictor function
 * @returns {Choice.Rock | Choice.Paper | Choice.Scissors} What choice the CPU should make
 */
function pp0(p) {
    return rotateChoice(p(cpuPatterns, cpuHistory));
}

/**
 * This is a guess on how it works because I'm stupid
 * @param {Function} p Reference to predictor function
 * @returns {Choice.Rock | Choice.Paper | Choice.Scissors} What choice the CPU should make
 */
function pp1(p) {
    return p(cpuPatterns, cpuHistory);
}

/**
 * This is also a guess on how it works
 * @param {Function} p Reference to predictor function
 * @returns {Choice.Rock | Choice.Paper | Choice.Scissors} What choice the CPU should make
 */
function pp2(p) {
    return rotateChoice(p(cpuPatterns, cpuHistory), false);
}

//#endregion Meta Strategies

// #region Prediction Strategies

// "Predict" a completely random thing because sure
function randomPredict() {
    let yep = randomInt(3);
    console.log(`randomPredict: Predicted ${yep}`);
    return yep;
}

/**
 * Yeah, I'm in DANGER
 * 
 * D - I
 * 
 * A - don't
 * 
 * N - want
 * 
 * G - to
 * 
 * E - do
 * 
 * R - this
 * @param {Array<{indication:Number, indicator:Array<Number>, playHistory:Number}>} patternArray uhhh the pattern array you silly goose
 * @param {Array<Number>} historyArray i want to perish
 */
function historyPredict(patternArray, historyArray) {
    let winIndex = null;
    let winLength = 0;

    patternArray.forEach((pattern, i) => {
        if (arraysEqual(pattern.indicator, historyArray.slice(0, pattern.indicator.length))) {
            if (pattern.indicator.length > winLength) {
                winIndex = i;
                winLength = pattern.indicator.length;
            }
        }
    });

    let result = (winIndex === null) ? randomPredict() : patternArray[winIndex].indication;

    // shut up
    console.log(`historyPredict: Predicted ${result}`);

    return result;
}

// #endregion Prediction Strategies

// #region Utilities
/**
 * "Rotates" choice to be advantageous or disadvantageous
 * @param {number} c Choice to rotate
 * @param {boolean} dir Rotate to advantageous (default = true)?
 * @returns Rotated choice
 */
function rotateChoice(c, dir = true) {
    if (dir) {
        c = (c + 1) % 3;
    } else {
        c--;
        if (c < 0) c = 2;
    }

    return c;
}

/**
 * Returns string representation of passed choice
 * @param {Number} c Choice to parse
 * @returns Choice in string form ([Error] if invalid)
 */
function choiceToString(c) {
    switch (c) {
        case Choice.Paper:
            return "Paper";
        case Choice.Rock:
            return "Rock";
        case Choice.Scissors:
            return "Scissors";
        default:
            console.warn("choiceToString: Couldn't resolve choice [" + c + "] to a string!");
            return "[Error]";
    }
}

// Compare function for the Array.sort() parameters.
function patternCompare(a, b) {
    let aChoice = playHistory;
    let bChoice = playHistory;
    
    return (aChoice / a.playHistory) - (bChoice / b.playHistory);
}

/**
 * oh my god i hate this language that I love
 * @param {Array} a One array
 * @param {Array} b Two array
 * @returns are arrays equal?
 */
function arraysEqual(a, b) {
    return a.every((val, idx) => val === b[idx])
}

/**
 * 
 * @param {Boolean | null | undefined} result Result to push.
 */
function pushOutcome(result) {
    let el = document.createElement("div");
    
    switch (result) {
        case true:
            el.classList.add("loss");
            break;
        case false:
            el.classList.add("win");
            break;
        case null:
            el.classList.add("tie");
            break;
        case undefined:
            el.classList.add("undecided");
            break;
        default:
            el.classList.add("undecided");
            console.warn("pushOutcome: Reached fallback, pushing \"undecided\"");
            break;
    }

    outcomeBar.appendChild(el);
}

/**
 * 
 * @param {String} text Message to display.
 */
function displayMessage(text) {
    jumbotron.innerHTML = text;
}

function debugMessage(text = "") {
    debug.textContent = text;
}

function debugTimeoutMessage(text = "", afterText = "", time = 1000) {
    if (this.timeoutId) clearTimeout(timeoutId);
    
    this.timeoutId = setTimeout(function() {
        debugMessage(afterText);
    }, time);
    
    debugMessage(text);
}
// #endregion Utilities

// Adds event listeners for clicking the buttons
window.addEventListener("load", function() {
    outcomeBar = document.getElementById("outcome-bar");
    jumbotron = document.getElementById("jumbotron");
    debug = document.getElementById("debug-readout");

    document.getElementById("select-rock").addEventListener("click", function() {
        handleInput(Choice.Rock);
    });
    
    document.getElementById("select-paper").addEventListener("click", function() {
        handleInput(Choice.Paper);
    });
    
    document.getElementById("select-scissors").addEventListener("click", function() {
        handleInput(Choice.Scissors);
    });
    
    debugTimeoutMessage("JS has taken control!", "Waiting for user input...", 750);
});

// Take key inputs to stand in for clicking buttons
// (I am very lazy lol)
document.addEventListener("keydown", function(e) {
    if (e.code == "KeyA" || e.code == "ArrowLeft") {
        handleInput(Choice.Rock);
    } else if (e.code == "KeyW" || e.code == "ArrowUp") {
        handleInput(Choice.Paper);
    } else if (e.code == "KeyD" || e.code == "ArrowRight") {
        handleInput(Choice.Scissors);
    }
});