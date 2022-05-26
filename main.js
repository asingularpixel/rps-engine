// COULDDO: Put CPU decision logic in a promise, run after showing result, and await
// after choice has been made for slightly snappier UX with larger datasets

// ALSOCOULDDO: Not that bc I have like two days to do this l a u g h   o u t   l o u d

/**
 * Maximum length that a pattern can be.
 */
const maxPatternLength = 5;

/**
 * Chance for random generator to be used. TODO: Obsolete with new engine, delete
 */
const randomChance = 0.05;

const Choice = {
    Rock: 0,
    Paper: 1,
    Scissors: 2
}

/**
 * Scores of how each meta has performed in the game.
 */
let metaEfficacy = [0, 0, 0, 0, 0, 0];

/**
 * What the player has previously played.
 */
let playerHistory = [];

/**
 * All of the detected patterns that the player has.
 */
let playerPatterns = [];

/**
 * The number of matches that have been played in the game.
 */
let matchCounter = 0;

/**
 * The document node that handles the debug text in the top-left corner.
 */
let debug;

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

// min-inclusive, max-exclusive
function randomInt(max, min = 0) {
    return Math.floor(Math.random() * (max - min)) + min;
}

// Handles making a choice
function handleInput(playerInput) {
    let cpuInput;
    
    // Determine the cpu's move
    if (matchCounter > 0) {
        cpuInput = determineCpuMove();
    } else {
        cpuInput = randomInt(3);
    }
    
    // Figure out who won the match
    let matchResult = determineWin(playerInput, cpuInput);
    
    // Handle learning logic if it isn't the first match
    playerHistory.unshift(playerInput);
    cpuHistory.unshift(cpuInput);
    if (matchCounter > 0) {
        let stack = [];
        
        for (let i = 1; i < playerHistory.length && i < maxPatternLength + 1; i++) {
            stack.push(playerHistory[i]);
            
            playerPatterns.push({
                indicator: stack.slice(),
                indication: playerHistory[0],
                playHistory: [matchCounter]
            });
        }
        
        stack = [];
        
        for (let i = 1; i < cpuHistory.length && i < maxPatternLength + 1; i++) {
            stack.push(cpuHistory[i]);
            
            cpuPatterns.push({
                indicator: stack.slice(),
                indication: playerHistory[0],
                playHistory: [matchCounter]
            });
        }
    }
    
    // Resolve a string to describe the match's result
    let output;
    if (matchResult === null) {
        output = "Tie";
    } else if (matchResult === true) {
        output = "They won..";
    } else if (matchResult === false) {
        output = "You won!";
    } else if (matchResult === undefined) {
        console.warn("handleInput: Couldn't resolve win string (determineWin() === undefined)");
        output = "[Error]";
    } else {
        console.warn("handleInput: Couldn't resolve win string (reached fallback)");
        output = "[Error]";
    }
    
    // Tell the user the result of the match
    // TODO: Make UI for this instead
    console.log(`${choiceToString(playerInput)} vs. ${choiceToString(cpuInput)} : ${output}`);
    
    // Increment matchCounter
    matchCounter++;
}

function determineCpuMove() {
    
}

// These are probably just going to get minified into a logic chain in determineCpuMove
// #region Meta Strategies

// "Naive Application"
// Play to beat predicted move
function p0(p) {
    return rotateChoice(p);
}

// "Defeat Second-Guessing"
// Assume your opponent thinks you use {@link p0}
function p1(p) {
    return p;
}

// "Defeat Triple-Guessing"
// Assume your opponent thinks you use {@link p1}
function p2(p) {
    return rotateChoice(p, false);
}

// "Second-Guess Opponent"
// Use your own prediction to predict what they'd do or something like that
function pp0(p) {
    return rotateChoice(p);
}

// This is a guess on how it works because I'm stupid
function pp1(p) {
    return p;
}

// This is also a guess on how it works
function pp2(p) {
    return rotateChoice(p, false);
}

//#endregion Meta Strategies

// #region Prediction Strategies

// "Predict" a completely random thing because sure
function randomPredict() {
    return randomInt(3);
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
 * @param {Array<{indication:Array<Number>, indicator:Number, playHistory:Array<Number>}>} patternArray uhhh the pattern array you silly goose
 * @param {Array<Number>} historyArray i want to perish
 */
function historyPredict(patternArray, historyArray) {
    let winIndex = null;
    let winLength = 0;

    patternArray.forEach((pattern, i) => {
        if (arraysEqual(pattern.indication, historyArray.slice(0, pattern.indication.length))) {
            if (pattern.indication.length > winLength) {
                winIndex = i;
                winLength = pattern.indication.length;
            }
        }
    });
}

// #endregion Prediction Strategies

// #region Utilities
/**
 * "Rotates" choice to be advantageous or disadvantageous
 * @param {number} c Choice to rotate
 * @param {boolean} dir Rotate to advantageous?
 * @returns Rotated choice
 */
function rotateChoice(c, dir) {
    if (dir) {
        // no, I didn't think of modding this, it was from the iocaine source code
        c = (c + 1) % 3;
    } else {
        // no, I didn't think of modding this, it was from the iocaine source code
        c = (c - 1) % 3;
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
    let aChoice = 0;
    let bChoice = 0;
    
    a.playHistory.forEach(function(n) {
        aChoice += n;
    });
    
    b.playHistory.forEach(function(n) {
        bChoice += n;
    });
    
    return (aChoice / a.playHistory.length) - (bChoice / b.playHistory.length);
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
    document.getElementById("select-rock").addEventListener("click", function() {
        handleInput(Choice.Rock);
    });
    
    document.getElementById("select-paper").addEventListener("click", function() {
        handleInput(Choice.Paper);
    });
    
    document.getElementById("select-scissors").addEventListener("click", function() {
        handleInput(Choice.Scissors);
    });
    
    debug = document.getElementById("debug-readout");
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