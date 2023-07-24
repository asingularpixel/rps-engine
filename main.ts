// COULDDO: Put CPU decision logic in a promise, run after showing result, and await
// after choice has been made for slightly snappier UX with larger datasets

// TODO: It randomly got meta 4 at start somehow figure out why please (wait hold on isn't there a chance to randomly select one?? tf was i on when i wrote this?)

// TODO: Rewrite documentation to be more professional / not nonsensical and lazy

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
 * All the choices a player/cpu can make.
 */
enum Choice {
    Rock,
    Paper,
    Scissors
}

/**
 * All possible outcomes for a match.
 */
enum Outcome {
    PlayerWin,
    CpuWin,
    Tie,
    Error
}

/**
 * How to handle each meta-strategy.
 */

const metaProtocol : Function[] = [
    p0,
    p1,
    p2,
    pp0,
    pp1,
    pp2
];

/**
 * A detected pattern of a series of moves played in the past.
 */
interface Pattern {
    /**
     * The preceding pattern that indicates a move.
     */
    indicator : number[],

    /**
     * The move the pattern indicates will occur.
     */
    indication : number,

    /**
     * A number showing how relevant the pattern is
     * @todo Make this name better
     */
    playHistory : number
}

/**
 * Scores of how each meta has performed in the game.
 */
let metaEfficacy : number[] = [0, 0, 0, 0, 0, 0];

/**
 * Index of current meta we are using.
 */
let metaIndex : number | null = null;

/**
 * What the player has previously played.
 */
let playerHistory : Choice[] = [];

/**
 * All of the detected patterns that the player has.
 */
let playerPatterns : Pattern[] = [];

/**
 * What the cpu has previously played.
 */
 let cpuHistory : Choice[] = [];

 /**
  * All of the detected patterns that the cpu has.
  */
 let cpuPatterns : Pattern[] = [];

/**
 * The number of matches that have been played in the game.
 */
let matchCounter : number = 0;

/**
 * The document node that handles the debug text in the top-left corner.
 */
let debug : HTMLSpanElement;

/**
 * The document node that contains the indicators for game outcome history.
 */
// FIXME: Defining as HTMLDivElement breaks things
let outcomeBar : HTMLElement;

/**
 * Giant display text that shows outcome.
 */
let jumbotron : HTMLSpanElement;

// false == p1 win
// true  == p2 win
// null  == tie
function determineWin(p1 : Choice, p2 : Choice) : Outcome {
    if (p1 == p2) {
        return Outcome.Tie;
    } else if (p1 == Choice.Rock && p2 == Choice.Scissors) {
        return Outcome.PlayerWin;
    } else if (p2 == Choice.Rock && p1 == Choice.Scissors) {
        return Outcome.CpuWin;
    } else if (p2 < p1) {
        return Outcome.PlayerWin;
    } else if (p1 < p2) {
        return Outcome.CpuWin;
    }
    
    console.warn("determineWin: Couldn't resolve game!");
    return Outcome.Error;
}

/**
 * Picks a random integer between the provided values (max-exclusive).
 * @param max Maximum number (exclusive).
 * @param min Minimum number (inclusive, defaults to 0).
 */
function randomInt(max : number, min : number = 0) {
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
        let twinSearch;
        
        for (let i = 1; i < playerHistory.length && i < maxPatternLength + 1; i++) {
            stack.push(playerHistory[i]);

            twinSearch = playerPatterns.find((pattern) => {
                return pattern.indicator.length === stack.length && arraysEqual(pattern.indicator, stack) && playerHistory[0] === pattern.indication;
            });
            
            if (twinSearch === undefined) {
                playerPatterns.push({
                    indicator: stack.slice(),
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

        if (matchResult !== Outcome.Tie) {
            matchResult ? metaEfficacy[metaIndex]++ : metaEfficacy[metaIndex]--;
            metaEfficacy.forEach((meta) => meta *= metaDecayFactor);
        }
    }
    
    // Resolve a string to describe the match's result
    // TODO: Make this a switch-case, or better, reduce repeated code
    debugMessage("Determining winner...");
    if (matchResult === Outcome.Tie) {
        debugTimeoutMessage("Tie", "Waiting for user input...", 1000);
        displayMessage(`${choiceToString(playerInput)} vs. ${choiceToString(cpuInput)}<br>You tied.`);
    } else if (matchResult === Outcome.CpuWin) {
        debugTimeoutMessage("CPU wins", "Waiting for user input...", 1000);
        displayMessage(`${choiceToString(playerInput)} vs. ${choiceToString(cpuInput)}<br>You lost..`);
    } else if (matchResult === Outcome.PlayerWin) {
        debugTimeoutMessage("Player wins", "Waiting for user input...", 1000);
        displayMessage(`${choiceToString(playerInput)} vs. ${choiceToString(cpuInput)}<br>You won!`);
    } else if (matchResult === Outcome.Error) {
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
    let winnerIndex;

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
 * @param p Reference to predictor function
 * @returns What choice the CPU should make
 */
function p0(p : Function) : Choice {
    return rotateChoice(p(playerPatterns, playerHistory));
}

/**
 * "Defeat Second-Guessing"
 * Assume your opponent thinks you use {@link p0}
 * @param p Reference to predictor function
 * @returns What choice the CPU should make
 */
function p1(p: Function) : Choice {
    return p(playerPatterns, playerHistory);
}

/**
 * "Defeat Triple-Guessing"
 * Assume your opponent thinks you use {@link p1}
 * @param p Reference to predictor function
 * @returns What choice the CPU should make
 */
function p2(p: Function) : Choice {
    return rotateChoice(p(playerPatterns, playerHistory), false);
}

/**
 * "Second-Guess Opponent"
 * Use your own prediction to predict what they'd do or something like that
 * @param p Reference to predictor function
 * @returns What choice the CPU should make
 */
function pp0(p: Function) : Choice {
    return rotateChoice(p(cpuPatterns, cpuHistory));
}

/**
 * This is a guess on how it works because I'm stupid
 * @param p Reference to predictor function
 * @returns What choice the CPU should make
 */
function pp1(p: Function) : Choice {
    return p(cpuPatterns, cpuHistory);
}

/**
 * This is also a guess on how it works
 * @param p Reference to predictor function
 * @returns What choice the CPU should make
 */
function pp2(p: Function) : Choice {
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
 * @param patternArray uhhh the pattern array you silly goose
 * @param historyArray i want to perish
 */
function historyPredict(patternArray : Pattern[], historyArray : Choice[]) {
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
 * @param c Choice to rotate
 * @param dir Rotate to advantageous (default = true)?
 * @returns Rotated choice
 */
function rotateChoice(c : number, dir = true) {
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
 * @param c Choice to parse
 * @returns Choice in string form ([Error] if invalid)
 */
function choiceToString(c : Choice) {
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
function patternCompare(a : Pattern, b : Pattern) {
    let aChoice = a.playHistory;
    let bChoice = b.playHistory;
    
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
 * Push a new element to the outcome bar signaling the outcome of a match.
 * @param result Result to push.
 */
function pushOutcome(result : Outcome) {
    let el = document.createElement("div");
    
    switch (result) {
        case Outcome.CpuWin:
            el.classList.add("loss");
            break;
        case Outcome.PlayerWin:
            el.classList.add("win");
            break;
        case Outcome.Tie:
            el.classList.add("tie");
            break;
        case Outcome.Error:
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
 * @param text Message to display.
 */
function displayMessage(text : string) {
    jumbotron.innerHTML = text;
}

function debugMessage(text = "") {
    debug.textContent = text;
}

function debugTimeoutMessage(text = "", afterText = "", time = 1000) {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    
    this.timeoutId = setTimeout(() => {
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

    document.getElementById("select-rock").addEventListener("click", () => {
        handleInput(Choice.Rock);
    });
    
    document.getElementById("select-paper").addEventListener("click", () => {
        handleInput(Choice.Paper);
    });
    
    document.getElementById("select-scissors").addEventListener("click", () => {
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