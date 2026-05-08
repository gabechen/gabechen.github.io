const BLANK = "_";

const examples = {
    flip: {
        title: "Flip Bits",
        tape: "1011010_",
        head: 0,
        state: "q0",
        transitions: {
            "q0|1": { write: "0", move: "R", next: "q0" },
            "q0|0": { write: "1", move: "R", next: "q0" },
            "q0|_": { write: "_", move: "N", next: "halt" }
        }
    },
    parity: {
        title: "Parity Checker",
        tape: "101101_",
        head: 0,
        state: "even",
        transitions: {
            "even|0": { write: "0", move: "R", next: "even" },
            "even|1": { write: "1", move: "R", next: "odd" },
            "even|_": { write: "E", move: "N", next: "halt" },
            "odd|0": { write: "0", move: "R", next: "odd" },
            "odd|1": { write: "1", move: "R", next: "even" },
            "odd|_": { write: "O", move: "N", next: "halt" }
        }
    },
    increment: {
        title: "Binary Incrementer",
        tape: "10111_",
        head: 0,
        state: "seek",
        transitions: {
            "seek|0": { write: "0", move: "R", next: "seek" },
            "seek|1": { write: "1", move: "R", next: "seek" },
            "seek|_": { write: "_", move: "L", next: "carry" },
            "carry|1": { write: "0", move: "L", next: "carry" },
            "carry|0": { write: "1", move: "N", next: "halt" },
            "carry|_": { write: "1", move: "N", next: "halt" }
        }
    },
    erase: {
        title: "Erase Tape",
        tape: "110101_",
        head: 0,
        state: "erase",
        transitions: {
            "erase|0": { write: "_", move: "R", next: "erase" },
            "erase|1": { write: "_", move: "R", next: "erase" },
            "erase|_": { write: "_", move: "N", next: "halt" }
        }
    }
};

class TuringMachine {
    constructor(config) {
        this.load(config);
    }

    load(config) {
        this.initial = normalizeConfig(config);
        this.tape = [...this.initial.tape];
        this.head = this.initial.head;
        this.state = this.initial.state;
        this.transitions = cloneTransitions(this.initial.transitions);
        this.steps = 0;
        this.status = "Ready";
    }

    reset() {
        this.load(this.initial);
    }

    step() {
        if (this.state === "halt") {
            this.status = "Halted";
            return false;
        }

        const symbol = this.tape[this.head] || BLANK;
        const currentState = this.state;
        const rule = this.transitions[keyFor(currentState, symbol)];

        if (!rule) {
            this.state = "halt";
            this.status = `No rule for delta(${currentState}, ${symbol})`;
            return false;
        }

        this.tape[this.head] = cleanSymbol(rule.write);

        if (rule.move === "L") {
            this.head -= 1;
        } else if (rule.move === "R") {
            this.head += 1;
        }

        if (this.head < 0) {
            this.tape.unshift(BLANK);
            this.head = 0;
        } else if (this.head >= this.tape.length) {
            this.tape.push(BLANK);
        }

        this.state = rule.next;
        this.steps += 1;
        this.status = this.state === "halt" ? "Halted" : "Running";
        return this.state !== "halt";
    }
}

function normalizeConfig(config) {
    return {
        tape: Array.isArray(config.tape) ? config.tape.map(cleanSymbol) : [...config.tape].map(cleanSymbol),
        head: Number.isInteger(config.head) ? config.head : 0,
        state: config.state || "q0",
        transitions: cloneTransitions(config.transitions || {})
    };
}

function cloneTransitions(transitions) {
    return Object.fromEntries(
        Object.entries(transitions).map(([key, rule]) => [
            key,
            {
                write: cleanSymbol(rule.write),
                move: ["L", "R", "N"].includes(rule.move) ? rule.move : "N",
                next: rule.next || "halt"
            }
        ])
    );
}

function cleanSymbol(symbol) {
    return String(symbol || BLANK).trim().charAt(0) || BLANK;
}

function keyFor(state, symbol) {
    return `${state}|${symbol}`;
}

function parseKey(key) {
    const separator = key.lastIndexOf("|");
    return {
        state: key.slice(0, separator),
        read: key.slice(separator + 1)
    };
}

function createController(options) {
    const machine = new TuringMachine(options.config);
    let timer = null;

    const elements = {
        tape: document.getElementById("tapeDisplay"),
        state: document.getElementById("currentState"),
        steps: document.getElementById("stepCount"),
        status: document.getElementById("machineStatus"),
        head: document.getElementById("headPosition"),
        tableBody: document.querySelector("#transitionTable tbody")
    };

    function render() {
        elements.tape.innerHTML = "";
        machine.tape.forEach((symbol, index) => {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.textContent = symbol;
            if (index === machine.head) {
                cell.classList.add("head");
            }

            if (options.editable) {
                cell.contentEditable = "true";
                cell.setAttribute("aria-label", `Tape cell ${index}`);
                cell.addEventListener("blur", () => {
                    machine.tape[index] = cleanSymbol(cell.textContent);
                    render();
                });
                cell.addEventListener("keydown", (event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        cell.blur();
                    }
                });
            }

            elements.tape.appendChild(cell);
        });

        elements.state.textContent = machine.state;
        elements.steps.textContent = machine.steps;
        elements.status.textContent = machine.status;
        if (elements.head) {
            elements.head.textContent = machine.head;
        }
        renderTable();
    }

    function renderTable() {
        if (!elements.tableBody) return;
        elements.tableBody.innerHTML = "";

        Object.entries(machine.transitions)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([key, rule]) => {
                const parsed = parseKey(key);
                const row = document.createElement("tr");
                [parsed.state, parsed.read, rule.write, rule.move, rule.next].forEach((value) => {
                    const cell = document.createElement("td");
                    cell.textContent = value;
                    row.appendChild(cell);
                });
                elements.tableBody.appendChild(row);
            });
    }

    function pause() {
        window.clearInterval(timer);
        timer = null;
        if (machine.state !== "halt") {
            machine.status = machine.steps === 0 ? "Ready" : "Paused";
        }
        render();
    }

    function stepOnce() {
        window.clearInterval(timer);
        timer = null;
        machine.step();
        render();
    }

    function run() {
        if (timer) return;
        machine.status = "Running";
        render();
        timer = window.setInterval(() => {
            const canContinue = machine.step();
            render();
            if (!canContinue) {
                pause();
            }
        }, options.speed || 420);
    }

    function reset() {
        pause();
        machine.reset();
        render();
    }

    function loadExample(exampleKey) {
        const example = examples[exampleKey];
        if (!example) return;
        pause();
        machine.load(example);
        render();
    }

    function addTransition(rule) {
        const read = cleanSymbol(rule.read);
        machine.transitions[keyFor(rule.state, read)] = {
            write: cleanSymbol(rule.write),
            move: rule.move,
            next: rule.next
        };
        machine.initial.transitions = cloneTransitions(machine.transitions);
        render();
    }

    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");
        if (!button) return;

        const action = button.dataset.action;
        if (action === "step") stepOnce();
        if (action === "run") run();
        if (action === "pause") pause();
        if (action === "reset") reset();
        if (action === "add-cell") {
            machine.tape.push(BLANK);
            machine.initial.tape.push(BLANK);
            render();
        }
        if (action === "clear-transitions") {
            pause();
            machine.transitions = {};
            machine.initial.transitions = {};
            machine.status = "Rules cleared";
            render();
        }
    });

    const selector = document.getElementById("exampleSelector");
    if (selector) {
        selector.addEventListener("change", (event) => loadExample(event.target.value));
    }

    const form = document.getElementById("transitionForm");
    if (form) {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            addTransition({
                state: document.getElementById("currentStateInput").value.trim(),
                read: document.getElementById("readSymbolInput").value.trim(),
                write: document.getElementById("writeSymbolInput").value.trim(),
                move: document.getElementById("directionInput").value,
                next: document.getElementById("nextStateInput").value.trim()
            });
            form.reset();
            document.getElementById("currentStateInput").value = "q0";
            document.getElementById("nextStateInput").value = "q0";
        });
    }

    render();
    return { machine, render, reset, loadExample };
}

document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;

    if (page === "home") {
        createController({
            config: examples.flip,
            speed: 520,
            editable: false
        });
    }

    if (page === "designer") {
        createController({
            config: examples.increment,
            speed: 420,
            editable: true
        });
    }
});
