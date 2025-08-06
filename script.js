
let tape = ["1", "0", "1", "1", "0"];
let head = 1;
let state = "q0";

const transitions = {
    "q0_1": ["q0", "0", "R"],
    "q0_0": ["q0", "1", "R"],
    "q0__": ["q1", "_", "L"],
    "q1_1": ["q1", "0", "L"],
    "q1_0": ["q1", "1", "L"],
    "q1__": ["q0", "_", "R"]
};

function renderTape() {
    const container = document.getElementById("tapeDisplay");
    container.innerHTML = "";
    tape.forEach((symbol, i) => {
        const cell = document.createElement("div");
        cell.textContent = symbol;
        if (i === head) cell.classList.add("head");
        container.appendChild(cell);
    });
    document.getElementById("currentState").textContent = state;
}

function step() {
    if (state === "halt") return;

    const symbol = tape[head] || "_";
    const key = `${state}_${symbol}`;
    const rule = transitions[key];

    if (!rule) {
        state = "halt";
        return;
    }

    const [newState, write, move] = rule;
    tape[head] = write;
    head += move === "R" ? 1 : -1;
    if (head < 0) {
        tape.unshift("_");
        head = 0;
    } else if (head >= tape.length) {
        tape.push("_");
    }
    state = newState;
    renderTape();
}

function reset() {
    tape = ["1", "0", "1", "1", "0"];
    head = 1;
    state = "q0";
    renderTape();
}

document.addEventListener("DOMContentLoaded", renderTape);
