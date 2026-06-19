# Marie.js

A vanilla JavaScript library for simulating the MARIE educational computer architecture in the browser.

[Online Demo](https://jsfiddle.net/tyzLd8jh/)

## Table of contents

- [Start up](#start-up)
- [Configuration](#configuration)
- [Assemble your instructions](#assemble-your-instructions)
- [Running your instructions](#running-your-instructions)
- [Stepping through instructions](#stepping-through-instructions)
- [Adding programs](#adding-programs)
- [Assembly text](#assembly-text)
- [Breakpoints](#breakpoints)
- [Logging](#logging)
- [Debugging](#debugging)
- [Formatting outputs](#formatting-outputs)
- [Inputs](#inputs)
- [Outputs](#outputs)
- [Memory and registers](#memory-and-registers)
- [Resetting](#resetting)
- [State import and export](#state-import-and-export)
- [Errors](#errors)

## Start up

Include Marie.js in your HTML page:

```html
<script src="./marie.min.js"></script>
```

Then create a new MARIE simulator:

```js
const MARIE = new MarieJS();
```

You can also pass configuration options:

```js
const MARIE = new MarieJS({
  parseTo: 'hexadecimal',
  memorySize: 4096,
  errorLogging: false,
  debug: false,
  logging: true,
  wordSize: 16,
  signed: true
});
```

## Configuration

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `parseTo` | String | `hexadecimal` | Output format. Supports `hexadecimal`, `decimal`, `binary`, and `octal`. You can also use `hex`, `dec`, `bin`, or `oct`. |
| `memorySize` | Number | `4096` | Number of memory words. |
| `errorLogging` | Boolean | `false` | Stores errors in the internal error log when enabled. |
| `debug` | Boolean | `false` | Triggers the browser debugger after each instruction update. |
| `logging` | Boolean | `true` | Stores and prints execution logs. |
| `wordSize` | Number | `16` | Number of bits used for word normalization. |
| `signed` | Boolean | `true` | Uses signed two's-complement style values when normalizing numbers. |
| `inputProvider` | Function | `null` | Optional function used by the `INPUT` instruction instead of `prompt()`. |
| `outputHandler` | Function | `null` | Optional function called whenever the `OUTPUT` instruction runs. |

## Assemble your instructions

Use `assemble()` to load an array of numeric instructions and data into memory.

```js
const MARIE = new MarieJS({
  parseTo: 'decimal'
});

MARIE.memory[10] = 7;
MARIE.memory[11] = 3;

const program = [
  MARIE.ins.LOAD(10),
  MARIE.ins.ADD(11),
  MARIE.ins.STORE(12),
  MARIE.ins.OUTPUT(),
  MARIE.ins.HALT()
];

MARIE.assemble(program);
MARIE.run();

console.log(MARIE.getOutputs());
console.log(MARIE.memory[12]);
```

Expected result:

```js
['10']
10
```

You can also place data directly inside the program array:

```js
const MARIE = new MarieJS({
  parseTo: 'decimal'
});

MARIE.assemble([
  MARIE.ins.LOAD(5),
  MARIE.ins.ADD(6),
  MARIE.ins.OUTPUT(),
  MARIE.ins.HALT(),
  0,
  20,
  22
]);

MARIE.run();

console.log(MARIE.getOutputs());
```

Expected result:

```js
['42']
```

You may also choose a starting address:

```js
MARIE.assemble(program, 100);
MARIE.run();
```

## Running your instructions

Run the loaded program with:

```js
MARIE.run();
```

By default, `run()` stops when the program halts, reaches a breakpoint, hits an error, or reaches the maximum step count.

```js
MARIE.run(1000);
```

## Stepping through instructions

Use `step()` to execute one instruction at a time.

```js
MARIE.step();
console.log(MARIE.getRegisters());

MARIE.step();
console.log(MARIE.getRegisters());
```

This is useful for visualizers, debugging, or classroom demonstrations.

## Adding programs

You can use the built-in instruction helpers instead of writing binary or hexadecimal instructions manually.

| Instruction | Function | Parameters | Description |
| --- | --- | --- | --- |
| `LOAD` | `MARIE.ins.LOAD(address)` | Memory address | Loads a value from memory into `AC`. |
| `STORE` | `MARIE.ins.STORE(address)` | Memory address | Stores the value in `AC` into memory. |
| `ADD` | `MARIE.ins.ADD(address)` | Memory address | Adds a memory value to `AC`. |
| `SUBTRACT` | `MARIE.ins.SUBTRACT(address)` | Memory address | Subtracts a memory value from `AC`. |
| `INPUT` | `MARIE.ins.INPUT()` | None | Reads a number from the user or from `inputProvider`. |
| `OUTPUT` | `MARIE.ins.OUTPUT()` | None | Outputs the current value of `AC`. |
| `HALT` | `MARIE.ins.HALT()` | None | Stops the program. |
| `SKIPCOND` | `MARIE.ins.SKIPCOND(condition)` | Condition | Skips the next instruction based on `AC`. |
| `JUMP` | `MARIE.ins.JUMP(address)` | Memory address | Sets `PC` to the selected address. |
| `CLEAR` | `MARIE.ins.CLEAR()` | None | Sets `AC` to `0`. |
| `ADDI` | `MARIE.ins.ADDI(address)` | Pointer address | Adds a value using indirect addressing. |
| `JUMPI` | `MARIE.ins.JUMPI(address)` | Pointer address | Jumps using indirect addressing. |
| `LOADI` | `MARIE.ins.LOADI(address)` | Pointer address | Loads a value using indirect addressing. |
| `STOREI` | `MARIE.ins.STOREI(address)` | Pointer address | Stores a value using indirect addressing. |

### SKIPCOND conditions

`SKIPCOND` supports the common MARIE condition values:

| Condition | Meaning |
| --- | --- |
| `0x000` | Skip next instruction if `AC < 0`. |
| `0x400` | Skip next instruction if `AC === 0`. |
| `0x800` | Skip next instruction if `AC > 0`. |

Example:

```js
const MARIE = new MarieJS({
  parseTo: 'decimal'
});

MARIE.memory[20] = 0;
MARIE.memory[21] = 99;

MARIE.assemble([
  MARIE.ins.LOAD(20),
  MARIE.ins.SKIPCOND(0x400),
  MARIE.ins.LOAD(21),
  MARIE.ins.OUTPUT(),
  MARIE.ins.HALT()
]);

MARIE.run();

console.log(MARIE.getOutputs());
```

Because `AC` is `0`, the `LOAD(21)` instruction is skipped.

## Assembly text

Use `assembleText()` if you want to write MARIE-style assembly as text.

```js
const MARIE = new MarieJS({
  parseTo: 'decimal'
});

MARIE.assembleText(`
  LOAD X
  ADD Y
  STORE Z
  OUTPUT
  HALT

  X, DEC 7
  Y, DEC 3
  Z, DEC 0
`);

MARIE.run();

console.log(MARIE.getOutputs());
```

Expected result:

```js
['10']
```

Supported assembly operations include:

- `LOAD`
- `STORE`
- `ADD`
- `SUBTRACT`
- `SUBT`
- `INPUT`
- `OUTPUT`
- `HALT`
- `SKIPCOND`
- `JUMP`
- `CLEAR`
- `ADDI`
- `JUMPI`
- `LOADI`
- `STOREI`
- `DEC`
- `HEX`

Comments can use `//` or `;`:

```js
MARIE.assembleText(`
  LOAD VALUE  // load the value
  OUTPUT      ; print the value
  HALT

  VALUE, DEC 42
`);
```

## Breakpoints

Breakpoints pause execution when `PC` reaches a selected address.

```js
MARIE.addBreakpoint(2);
MARIE.run();

console.log(MARIE.getRegisters());
```

Remove a breakpoint:

```js
MARIE.removeBreakpoint(2);
```

Clear all breakpoints:

```js
MARIE.clearBreakpoints();
```

Get all breakpoints:

```js
console.log(MARIE.getBreakpoints());
```

## Logging

Logging is enabled by default.

```js
const MARIE = new MarieJS({
  logging: true
});
```

Get the log array:

```js
console.log(MARIE.getLogging());
```

Disable logging:

```js
const MARIE = new MarieJS({
  logging: false
});
```

## Debugging

Enable debugging to trigger the browser debugger during execution.

```js
const MARIE = new MarieJS({
  debug: true
});
```

Open your browser developer tools before running the program.

## Formatting outputs

Use `parseTo` to choose how output values are formatted.

```js
const MARIE = new MarieJS({
  parseTo: 'hexadecimal'
});
```

Supported values:

- `hexadecimal` or `hex`
- `decimal` or `dec`
- `binary` or `bin`
- `octal` or `oct`

Example:

```js
const MARIE = new MarieJS({
  parseTo: 'binary'
});

MARIE.memory[10] = 5;

MARIE.assemble([
  MARIE.ins.LOAD(10),
  MARIE.ins.OUTPUT(),
  MARIE.ins.HALT()
]);

MARIE.run();

console.log(MARIE.getOutputs());
```

Expected result:

```js
['101']
```

## Inputs

By default, `INPUT` uses `prompt()` in the browser.

```js
const MARIE = new MarieJS();

MARIE.assemble([
  MARIE.ins.INPUT(),
  MARIE.ins.OUTPUT(),
  MARIE.ins.HALT()
]);

MARIE.run();
```

You can also provide your own input function:

```js
const MARIE = new MarieJS({
  inputProvider: function () {
    return 42;
  },
  parseTo: 'decimal'
});

MARIE.assemble([
  MARIE.ins.INPUT(),
  MARIE.ins.OUTPUT(),
  MARIE.ins.HALT()
]);

MARIE.run();

console.log(MARIE.getOutputs());
```

Expected result:

```js
['42']
```

## Outputs

Use `getOutputs()` to get an array of program outputs.

```js
console.log(MARIE.getOutputs());
```

You can also provide an output handler:

```js
const outputElement = document.getElementById('output');

const MARIE = new MarieJS({
  parseTo: 'decimal',
  outputHandler: function (formattedValue, rawValue) {
    outputElement.textContent += formattedValue + '\n';
  }
});
```

## Memory and registers

Get a slice of memory:

```js
console.log(MARIE.getMemory(0, 20));
```

Get registers:

```js
console.log(MARIE.getRegisters());
```

Example register output:

```js
{
  AC: 10,
  MQ: 0,
  PC: 4,
  IR: 28672,
  MAR: 4,
  MDR: 0,
  halted: true
}
```

## Resetting

Reset everything:

```js
MARIE.reset();
```

Reset only memory:

```js
MARIE.resetMemory();
```

Reset only registers:

```js
MARIE.resetRegisters();
```

Reset logs, errors, and outputs:

```js
MARIE.resetLogs();
```

## State import and export

Export the current simulator state:

```js
const savedState = MARIE.exportState();
```

Import a saved simulator state:

```js
const restoredMARIE = new MarieJS();
restoredMARIE.importState(savedState);
```

This is useful for saving progress, creating demos, or restoring debugger sessions.

## Errors

Enable error logging:

```js
const MARIE = new MarieJS({
  errorLogging: true
});
```

Get errors:

```js
console.log(MARIE.getErrors());
```

Errors are also printed to the browser console.
