var maxPatternLength = 5;
var randomChance = 0.05;
var randomMetaChance = 0.1;
var metaDecayFactor = 1 - (1 / 5);
var Choice;
(function (Choice) {
    Choice[Choice["Rock"] = 0] = "Rock";
    Choice[Choice["Paper"] = 1] = "Paper";
    Choice[Choice["Scissors"] = 2] = "Scissors";
})(Choice || (Choice = {}));
var Outcome;
(function (Outcome) {
    Outcome[Outcome["PlayerWin"] = 0] = "PlayerWin";
    Outcome[Outcome["CpuWin"] = 1] = "CpuWin";
    Outcome[Outcome["Tie"] = 2] = "Tie";
    Outcome[Outcome["Error"] = 3] = "Error";
})(Outcome || (Outcome = {}));
var metaProtocol = [
    p0,
    p1,
    p2,
    pp0,
    pp1,
    pp2
];
var metaEfficacy = [0, 0, 0, 0, 0, 0];
var metaIndex = null;
var playerHistory = [];
var playerPatterns = [];
var cpuHistory = [];
var cpuPatterns = [];
var matchCounter = 0;
var debug;
var outcomeBar;
var jumbotron;
function determineWin(p1, p2) {
    if (p1 == p2) {
        return Outcome.Tie;
    }
    else if (p1 == Choice.Rock && p2 == Choice.Scissors) {
        return Outcome.PlayerWin;
    }
    else if (p2 == Choice.Rock && p1 == Choice.Scissors) {
        return Outcome.CpuWin;
    }
    else if (p2 < p1) {
        return Outcome.PlayerWin;
    }
    else if (p1 < p2) {
        return Outcome.CpuWin;
    }
    console.warn("determineWin: Couldn't resolve game!");
    return Outcome.Error;
}
function randomInt(max, min) {
    if (min === void 0) { min = 0; }
    return Math.floor(Math.random() * (max - min)) + min;
}
function handleInput(playerInput) {
    var cpuInput;
    if (matchCounter > 0) {
        debugMessage("Determining CPU choice... (this might take a second)");
        cpuInput = determineCpuMove();
    }
    else {
        debugMessage("Determining CPU choice... (this won't take a second)");
        cpuInput = randomInt(3);
    }
    var matchResult = determineWin(playerInput, cpuInput);
    playerHistory.unshift(playerInput);
    cpuHistory.unshift(cpuInput);
    if (matchCounter > 0) {
        debugMessage("Taking notes...");
        var stack_1 = [];
        var twinSearch = void 0;
        for (var i = 1; i < playerHistory.length && i < maxPatternLength + 1; i++) {
            stack_1.push(playerHistory[i]);
            twinSearch = playerPatterns.find(function (pattern) {
                return pattern.indicator.length === stack_1.length && arraysEqual(pattern.indicator, stack_1) && playerHistory[0] === pattern.indication;
            });
            if (twinSearch === undefined) {
                playerPatterns.push({
                    indicator: stack_1.slice(),
                    indication: playerHistory[0],
                    playHistory: 1
                });
            }
            else {
                twinSearch.playHistory++;
            }
        }
        stack_1 = [];
        twinSearch = cpuPatterns.find(function (pattern) {
            return pattern.indicator.length === stack_1.length && arraysEqual(pattern.indicator, stack_1) && cpuHistory[0] === pattern.indication;
        });
        if (twinSearch === undefined) {
            for (var i = 1; i < cpuHistory.length && i < maxPatternLength + 1; i++) {
                stack_1.push(cpuHistory[i]);
                cpuPatterns.push({
                    indicator: stack_1.slice(),
                    indication: playerHistory[0],
                    playHistory: 1
                });
            }
        }
        else {
            twinSearch.playHistory++;
        }
        if (matchResult !== Outcome.Tie) {
            matchResult ? metaEfficacy[metaIndex]++ : metaEfficacy[metaIndex]--;
            metaEfficacy.forEach(function (meta) { return meta *= metaDecayFactor; });
        }
    }
    debugMessage("Determining winner...");
    if (matchResult === Outcome.Tie) {
        debugTimeoutMessage("Tie", "Waiting for user input...", 1000);
        displayMessage("".concat(choiceToString(playerInput), " vs. ").concat(choiceToString(cpuInput), "<br>You tied."));
    }
    else if (matchResult === Outcome.CpuWin) {
        debugTimeoutMessage("CPU wins", "Waiting for user input...", 1000);
        displayMessage("".concat(choiceToString(playerInput), " vs. ").concat(choiceToString(cpuInput), "<br>You lost.."));
    }
    else if (matchResult === Outcome.PlayerWin) {
        debugTimeoutMessage("Player wins", "Waiting for user input...", 1000);
        displayMessage("".concat(choiceToString(playerInput), " vs. ").concat(choiceToString(cpuInput), "<br>You won!"));
    }
    else if (matchResult === Outcome.Error) {
        console.warn("handleInput: Couldn't resolve win string (determineWin() === undefined)");
        debugTimeoutMessage("Error occurred", "Waiting for user input...", 1000);
        displayMessage("".concat(choiceToString(playerInput), " vs. ").concat(choiceToString(cpuInput), "<br>Something odd happened."));
    }
    else {
        console.warn("handleInput: Couldn't resolve win string (reached fallback)");
        debugTimeoutMessage("What is even happening right now man", "Waiting for user input...", 2000);
        displayMessage("".concat(choiceToString(playerInput), " vs. ").concat(choiceToString(cpuInput), "<br>Something odd happened."));
        matchResult = undefined;
    }
    pushOutcome(matchResult);
    console.log("".concat(choiceToString(playerInput), " vs. ").concat(choiceToString(cpuInput), " : ").concat(matchResult));
    matchCounter++;
}
function determineCpuMove() {
    var winnerIndex;
    if (Math.random() < randomMetaChance) {
        metaIndex = randomInt(metaEfficacy.length);
    }
    else {
        var winnerValue_1 = 0;
        metaIndex = 0;
        metaEfficacy.forEach(function (n, i) {
            if (winnerValue_1 < n)
                winnerIndex = i;
            winnerValue_1 = n;
        });
    }
    console.log("determineCpuMove: Using meta ".concat(metaIndex, "."));
    return metaProtocol[metaIndex]((Math.random() < randomChance) ? randomPredict : historyPredict);
}
function p0(p) {
    return rotateChoice(p(playerPatterns, playerHistory));
}
function p1(p) {
    return p(playerPatterns, playerHistory);
}
function p2(p) {
    return rotateChoice(p(playerPatterns, playerHistory), false);
}
function pp0(p) {
    return rotateChoice(p(cpuPatterns, cpuHistory));
}
function pp1(p) {
    return p(cpuPatterns, cpuHistory);
}
function pp2(p) {
    return rotateChoice(p(cpuPatterns, cpuHistory), false);
}
function randomPredict() {
    var yep = randomInt(3);
    console.log("randomPredict: Predicted ".concat(yep));
    return yep;
}
function historyPredict(patternArray, historyArray) {
    var winIndex = null;
    var winLength = 0;
    patternArray.forEach(function (pattern, i) {
        if (arraysEqual(pattern.indicator, historyArray.slice(0, pattern.indicator.length))) {
            if (pattern.indicator.length > winLength) {
                winIndex = i;
                winLength = pattern.indicator.length;
            }
        }
    });
    var result = (winIndex === null) ? randomPredict() : patternArray[winIndex].indication;
    console.log("historyPredict: Predicted ".concat(result));
    return result;
}
function rotateChoice(c, dir) {
    if (dir === void 0) { dir = true; }
    if (dir) {
        c = (c + 1) % 3;
    }
    else {
        c--;
        if (c < 0)
            c = 2;
    }
    return c;
}
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
function patternCompare(a, b) {
    var aChoice = a.playHistory;
    var bChoice = b.playHistory;
    return (aChoice / a.playHistory) - (bChoice / b.playHistory);
}
function arraysEqual(a, b) {
    return a.every(function (val, idx) { return val === b[idx]; });
}
function pushOutcome(result) {
    var el = document.createElement("div");
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
function displayMessage(text) {
    jumbotron.innerHTML = text;
}
function debugMessage(text) {
    if (text === void 0) { text = ""; }
    debug.textContent = text;
}
function debugTimeoutMessage(text, afterText, time) {
    if (text === void 0) { text = ""; }
    if (afterText === void 0) { afterText = ""; }
    if (time === void 0) { time = 1000; }
    if (this.timeoutId)
        clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(function () {
        debugMessage(afterText);
    }, time);
    debugMessage(text);
}
window.addEventListener("load", function () {
    outcomeBar = document.getElementById("outcome-bar");
    jumbotron = document.getElementById("jumbotron");
    debug = document.getElementById("debug-readout");
    document.getElementById("select-rock").addEventListener("click", function () {
        handleInput(Choice.Rock);
    });
    document.getElementById("select-paper").addEventListener("click", function () {
        handleInput(Choice.Paper);
    });
    document.getElementById("select-scissors").addEventListener("click", function () {
        handleInput(Choice.Scissors);
    });
    debugTimeoutMessage("JS has taken control!", "Waiting for user input...", 750);
});
document.addEventListener("keydown", function (e) {
    if (e.code == "KeyA" || e.code == "ArrowLeft") {
        handleInput(Choice.Rock);
    }
    else if (e.code == "KeyW" || e.code == "ArrowUp") {
        handleInput(Choice.Paper);
    }
    else if (e.code == "KeyD" || e.code == "ArrowRight") {
        handleInput(Choice.Scissors);
    }
});
