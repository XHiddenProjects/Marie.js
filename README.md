# Marie.js
A JavaScript library for [MARIE-js/MARIE.js](https://github.com/MARIE-js/MARIE.js)

[Online Demo](https://jsfiddle.net/53ybrk9g/)


## Start up
```html
<script src="./marie.min.js"></script>
```
To start up the code
```js
// You do not need to use any configurations
const MARIE = new MarieJS({
  parseTo: 'hexadecimal', // Default parse type
  memorySize: 4096, // Default memory size
  errorLogging: false, // Default error logging
  debug: false, // Default debug mode
  logging: true // Default logging
});
```

## Assemble your instructions
To assemble your instructions, this has to be placed down first before running
```js
const program = [...];
MARIE.assemble(program);
```
## Running your instructions
To run your instructions, use this code
```js
MARIE.run();
```
## Adding program
You can use our methods to render programs without knowing the binary source. **Note: This goes inside the `const program = [...]`**

| Instruction | Function | Prameters | Description |
| ----------- | -------- | --------- | ----------- |
| LOAD()     | `MARIE.ins.LOAD(0)` | Memory position (Number) | Loads value from memory |
| STORE()     | `MARIE.ins.STORE(0)` | Memory position (Number) | Stores value in memory |
| ADD()     | `MARIE.ins.ADD(0)` | Memory position (Number) | Adds value from memory |
| SUBTRACT()     | `MARIE.ins.SUBTRACE(0)` | Memory position (Number) | Subtracts value from memory |
| INPUT()     | `MARIE.ins.INPUT()` | N/A | Renders input for user prompt |
| OUTPUT()     | `MARIE.ins.OUTPUT()` | N/A | Returns the output of the AC|
| HALT()     | `MARIE.ins.HALT()` | N/A | Returns the halt binary |

## Logging
To return logging, which defaulted to true.

```js
const MARIE = new MarieJS({
  logging: true
});

MARIE.getLogging(); //Returns an array of steps in the process
```

## Debugging
To debugging steps, which defaulted to false. **Note: this only works in the console**

```js
const MARIE = new MarieJS({
  debug: true
});
```

## Formatting outputs
To format output values, type
```js
const MARIE = new MarieJS({
  parseTo: 'hexadecimal' // Binary, Decimal, and Octal are also choices.
  // You can also abbreviate these in 3 letters, eg. bin, oct, hex, and dec
});
```

## Error
To enable error logging

```js
const MARIE = new MarieJS({
  errorLogging: true
});

MARIE.getErrors();
```



