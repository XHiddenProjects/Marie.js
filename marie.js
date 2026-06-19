/**
 * MarieJS - A JavaScript implementation of the MARIE architecture
 * @version 2.0.0
 * @license MIT
 * @description A JavaScript implementation of the MARIE educational architecture with assembler, debugger, stepping, breakpoints, and state import/export.
 * @author XHiddenProjects
 * @date 2026-06-19
 * @see https://github.com/XHiddenProjects/Marie.js
 */

class MarieJS {
  /**
   * Creates an instance of the MarieJS class.
   *
   * @param {Object} config Configuration object.
   * @param {'hexadecimal'|'decimal'|'binary'|'octal'} [config.parseTo='hexadecimal'] Output parse type.
   * @param {number} [config.memorySize=4096] Number of memory words.
   * @param {boolean} [config.errorLogging=false] Enable error collection.
   * @param {boolean} [config.debug=false] Trigger debugger after each PC update.
   * @param {boolean} [config.logging=true] Enable operation logging.
   * @param {number} [config.wordSize=16] Word size in bits.
   * @param {boolean} [config.signed=true] Treat arithmetic values as signed two's-complement.
   * @param {Function} [config.inputProvider] Function used by INPUT instruction.
   * @param {Function} [config.outputHandler] Function called by OUTPUT instruction.
   */
  constructor(config = {}) {
    this.config = {
      parseTo: 'hexadecimal',
      memorySize: 4096,
      errorLogging: false,
      debug: false,
      logging: true,
      wordSize: 16,
      signed: true,
      inputProvider: null,
      outputHandler: null
    };

    Object.assign(this.config, config);

    this.memory = new Array(this.config.memorySize).fill(0);
    this.breakpoints = new Set();
    this.outputs = [];
    this.logging = [];
    this.errors = [];

    this.resetRegisters();
  }

  /** Instruction builders. */
  ins = {
    LOAD:     (pos) => (0x1 << 12) | (pos & 0x0FFF),
    STORE:    (pos) => (0x2 << 12) | (pos & 0x0FFF),
    ADD:      (pos) => (0x3 << 12) | (pos & 0x0FFF),
    SUBTRACT: (pos) => (0x4 << 12) | (pos & 0x0FFF),
    INPUT:    ()    => (0x5 << 12),
    OUTPUT:   ()    => (0x6 << 12),
    HALT:     ()    => (0x7 << 12),
    SKIPCOND: (cond) => (0x8 << 12) | (cond & 0x0FFF),
    JUMP:     (pos) => (0x9 << 12) | (pos & 0x0FFF),
    CLEAR:    ()    => (0xA << 12),
    ADDI:     (pos) => (0xB << 12) | (pos & 0x0FFF),
    JUMPI:    (pos) => (0xC << 12) | (pos & 0x0FFF),
    LOADI:    (pos) => (0xD << 12) | (pos & 0x0FFF),
    STOREI:   (pos) => (0xE << 12) | (pos & 0x0FFF)
  };

  /** Convert a number to the configured output base. */
  parse(input) {
    const type = String(this.config.parseTo).toLowerCase().substring(0, 3);
    const value = Number(input);

    if (Number.isNaN(value)) return 'NaN';
    if (type === 'dec') return value.toString(10);
    if (type === 'bin') return value.toString(2);
    if (type === 'oct') return value.toString(8);
    return value.toString(16).toUpperCase();
  }

  /** Clears registers only. */
  resetRegisters() {
    this.AC = 0;
    this.MQ = 0;
    this.PC = 0;
    this.IR = 0;
    this.MAR = 0;
    this.MDR = 0;
    this.halted = false;
  }

  /** Clears memory only. */
  resetMemory() {
    this.memory = new Array(this.config.memorySize).fill(0);
  }

  /** Clears logs, errors, and outputs. */
  resetLogs() {
    this.logging = [];
    this.errors = [];
    this.outputs = [];
  }

  /** Fully resets the simulator. */
  reset() {
    this.resetMemory();
    this.resetRegisters();
    this.resetLogs();
    this.breakpoints.clear();
  }

  #log(message) {
    if (this.config.logging) this.logging.push(message);
    if (this.config.logging) console.log(message);
  }

  #error(context, message) {
    const full = `Error (${context}): ${message}`;
    if (this.config.errorLogging) this.errors.push(full);
    console.error(full);
    return false;
  }

  #isValidAddress(addr) {
    return Number.isInteger(addr) && addr >= 0 && addr < this.memory.length;
  }

  #validateAddress(addr, context) {
    if (!this.#isValidAddress(addr)) {
      return this.#error(context, `Address ${addr} is out of bounds`);
    }
    return true;
  }

  #normalize(value) {
    const bits = this.config.wordSize;
    const mask = (1 << bits) - 1;

    // JavaScript bitwise operations are signed 32-bit, so handle 32-bit separately if needed.
    if (bits >= 31) return Number(value);

    let normalized = Number(value) & mask;
    if (this.config.signed) {
      const signBit = 1 << (bits - 1);
      if (normalized & signBit) normalized -= (1 << bits);
    }
    return normalized;
  }

  #load(addr) {
    if (!this.#validateAddress(addr, 'Load')) return false;
    this.MAR = addr;
    this.MDR = this.memory[this.MAR];
    this.AC = this.#normalize(this.MDR);
    this.#log(`Load: AC=${this.AC}`);
    return true;
  }

  #store(addr) {
    if (!this.#validateAddress(addr, 'Store')) return false;
    this.MAR = addr;
    this.memory[this.MAR] = this.#normalize(this.AC);
    this.#log(`Store: Memory[${this.MAR}]=${this.memory[this.MAR]}`);
    return true;
  }

  #add(addr) {
    if (!this.#validateAddress(addr, 'Add')) return false;
    this.MAR = addr;
    this.MDR = this.memory[this.MAR];
    this.AC = this.#normalize(this.AC + this.MDR);
    this.#log(`Add: AC=${this.AC}`);
    return true;
  }

  #subtract(addr) {
    if (!this.#validateAddress(addr, 'Subtract')) return false;
    this.MAR = addr;
    this.MDR = this.memory[this.MAR];
    this.AC = this.#normalize(this.AC - this.MDR);
    this.#log(`Subtract: AC=${this.AC}`);
    return true;
  }

  #input() {
    let input;

    if (typeof this.config.inputProvider === 'function') {
      input = this.config.inputProvider();
    } else if (typeof prompt !== 'undefined') {
      input = prompt('Enter a number: ');
    } else {
      return this.#error('Input', 'No inputProvider configured and prompt() is unavailable');
    }

    const value = parseInt(input, 10);
    if (Number.isNaN(value)) return this.#error('Input', `Invalid input ${input}`);

    this.AC = this.#normalize(value);
    this.#log(`Input: AC=${this.AC}`);
    return true;
  }

  #output() {
    const value = this.parse(this.AC);
    this.outputs.push(value);
    if (typeof this.config.outputHandler === 'function') {
      this.config.outputHandler(value, this.AC);
    }
    this.#log(`Output: AC=${value}`);
    return true;
  }

  #jump(addr) {
    if (!this.#validateAddress(addr, 'Jump')) return false;
    this.PC = addr;
    this.#log(`Jump: PC=${this.PC}`);
    return 'jumped';
  }

  #skipcond(condition) {
    // MARIE convention: 000 means AC < 0, 400 means AC == 0, 800 means AC > 0.
    const cond = condition & 0x0FFF;
    let shouldSkip = false;

    if (cond === 0x000) shouldSkip = this.AC < 0;
    else if (cond === 0x400) shouldSkip = this.AC === 0;
    else if (cond === 0x800) shouldSkip = this.AC > 0;
    else return this.#error('Skipcond', `Unsupported condition ${condition}`);

    if (shouldSkip) this.PC += 1;
    this.#log(`Skipcond ${cond.toString(16).toUpperCase()}: ${shouldSkip ? 'skipped' : 'not skipped'}`);
    return true;
  }

  #clear() {
    this.AC = 0;
    this.#log('Clear: AC=0');
    return true;
  }

  #addIndirect(addr) {
    if (!this.#validateAddress(addr, 'AddI')) return false;
    const indirectAddr = this.memory[addr];
    if (!this.#validateAddress(indirectAddr, 'AddI')) return false;
    return this.#add(indirectAddr);
  }

  #jumpIndirect(addr) {
    if (!this.#validateAddress(addr, 'JumpI')) return false;
    const indirectAddr = this.memory[addr];
    return this.#jump(indirectAddr);
  }

  #loadIndirect(addr) {
    if (!this.#validateAddress(addr, 'LoadI')) return false;
    const indirectAddr = this.memory[addr];
    return this.#load(indirectAddr);
  }

  #storeIndirect(addr) {
    if (!this.#validateAddress(addr, 'StoreI')) return false;
    const indirectAddr = this.memory[addr];
    return this.#store(indirectAddr);
  }

  #fetch() {
    if (!this.#validateAddress(this.PC, 'Fetch')) return false;
    this.MAR = this.PC;
    this.IR = this.memory[this.MAR];
    this.#log(`Fetch: PC=${this.PC}, IR=${this.IR}`);
    return this.IR;
  }

  #decode(instruction) {
    if (!Number.isInteger(instruction)) {
      this.#error('Decode', `Invalid instruction ${instruction}`);
      return null;
    }

    const opcode = (instruction >> 12) & 0xF;
    const address = instruction & 0x0FFF;
    return { opcode, address };
  }

  #exec(instruction) {
    const decoded = this.#decode(instruction);
    if (!decoded) return false;

    switch (decoded.opcode) {
      case 0x1: return this.#load(decoded.address);
      case 0x2: return this.#store(decoded.address);
      case 0x3: return this.#add(decoded.address);
      case 0x4: return this.#subtract(decoded.address);
      case 0x5: return this.#input();
      case 0x6: return this.#output();
      case 0x7:
        this.halted = true;
        this.#log('Program halted');
        return false;
      case 0x8: return this.#skipcond(decoded.address);
      case 0x9: return this.#jump(decoded.address);
      case 0xA: return this.#clear();
      case 0xB: return this.#addIndirect(decoded.address);
      case 0xC: return this.#jumpIndirect(decoded.address);
      case 0xD: return this.#loadIndirect(decoded.address);
      case 0xE: return this.#storeIndirect(decoded.address);
      default:
        return this.#error('Exec', `Unknown opcode ${decoded.opcode}`);
    }
  }

  #update(execResult) {
    if (execResult !== 'jumped' && !this.halted) this.PC += 1;
    if (this.config.debug) debugger;
  }

  /** Executes one instruction and returns false when halted or errored. */
  step() {
    if (this.halted) return false;
    if (this.breakpoints.has(this.PC)) {
      this.#log(`Breakpoint hit at address ${this.PC}`);
      return 'breakpoint';
    }

    const instruction = this.#fetch();
    if (instruction === false) return false;

    const result = this.#exec(instruction);
    if (result === false) return false;

    this.#update(result);
    return true;
  }

  /** Runs until HALT, error, breakpoint, or maxSteps. */
  run(maxSteps = 100000) {
    let steps = 0;

    while (!this.halted && steps < maxSteps) {
      const result = this.step();
      if (result === false || result === 'breakpoint') break;
      steps += 1;
    }

    if (steps >= maxSteps) {
      this.#error('Run', `Maximum step count ${maxSteps} reached`);
    }

    return this.getRegisters();
  }

  /** Loads numeric instructions/data into memory. */
  assemble(programs, startAddress = 0) {
    if (!Array.isArray(programs)) {
      throw new Error('Programs should be an array');
    }
    if (!this.#validateAddress(startAddress, 'Assemble')) return false;

    const assembled = [...programs];
    if (!assembled.includes(this.ins.HALT())) assembled.push(this.ins.HALT());

    for (let i = 0; i < assembled.length; i++) {
      const addr = startAddress + i;
      if (!this.#validateAddress(addr, 'Assemble')) return false;
      this.memory[addr] = this.#normalize(assembled[i]);
    }

    this.PC = startAddress;
    return true;
  }

  /**
   * Assembles MARIE-like assembly text.
   * Supports labels, DEC, HEX, LOAD, STORE, ADD, SUBTRACT/SUBT, INPUT, OUTPUT, HALT,
   * SKIPCOND, JUMP, CLEAR, ADDI, JUMPI, LOADI, STOREI.
   */
  assembleText(source, startAddress = 0) {
    if (typeof source !== 'string') throw new Error('Source should be a string');

    const lines = source
      .split(/\r?\n/)
      .map(line => line.replace(/\/\/.*$|;.*$/g, '').trim())
      .filter(Boolean);

    const labels = new Map();
    const parsed = [];
    let address = startAddress;

    for (const line of lines) {
      let working = line;
      const labelMatch = working.match(/^([A-Za-z_]\w*)\s*,\s*(.*)$/);

      if (labelMatch) {
        labels.set(labelMatch[1].toUpperCase(), address);
        working = labelMatch[2].trim();
      }

      if (working) {
        parsed.push({ address, text: working });
        address += 1;
      }
    }

    const program = parsed.map(({ text }) => {
      const [rawOp, rawOperand] = text.split(/\s+/, 2);
      const op = rawOp.toUpperCase();
      const operandText = rawOperand ? rawOperand.trim() : undefined;

      const resolve = (value) => {
        if (value === undefined) return 0;
        const upper = value.toUpperCase();
        if (labels.has(upper)) return labels.get(upper);
        if (/^-?0X[0-9A-F]+$/i.test(value)) return parseInt(value, 16);
        if (/^-?[0-9]+$/.test(value)) return parseInt(value, 10);
        throw new Error(`Unknown label or value: ${value}`);
      };

      switch (op) {
        case 'DEC': return this.#normalize(parseInt(operandText, 10));
        case 'HEX': return this.#normalize(parseInt(operandText, 16));
        case 'LOAD': return this.ins.LOAD(resolve(operandText));
        case 'STORE': return this.ins.STORE(resolve(operandText));
        case 'ADD': return this.ins.ADD(resolve(operandText));
        case 'SUBTRACT':
        case 'SUBT': return this.ins.SUBTRACT(resolve(operandText));
        case 'INPUT': return this.ins.INPUT();
        case 'OUTPUT': return this.ins.OUTPUT();
        case 'HALT': return this.ins.HALT();
        case 'SKIPCOND': return this.ins.SKIPCOND(resolve(operandText));
        case 'JUMP': return this.ins.JUMP(resolve(operandText));
        case 'CLEAR': return this.ins.CLEAR();
        case 'ADDI': return this.ins.ADDI(resolve(operandText));
        case 'JUMPI': return this.ins.JUMPI(resolve(operandText));
        case 'LOADI': return this.ins.LOADI(resolve(operandText));
        case 'STOREI': return this.ins.STOREI(resolve(operandText));
        default: throw new Error(`Unknown operation: ${op}`);
      }
    });

    return this.assemble(program, startAddress);
  }

  addBreakpoint(addr) {
    if (!this.#validateAddress(addr, 'Breakpoint')) return false;
    this.breakpoints.add(addr);
    return true;
  }

  removeBreakpoint(addr) {
    return this.breakpoints.delete(addr);
  }

  clearBreakpoints() {
    this.breakpoints.clear();
  }

  getBreakpoints() {
    return [...this.breakpoints];
  }

  getMemory(start = 0, end = this.memory.length) {
    return this.memory.slice(start, end);
  }

  getRegisters() {
    return {
      AC: this.AC,
      MQ: this.MQ,
      PC: this.PC,
      IR: this.IR,
      MAR: this.MAR,
      MDR: this.MDR,
      halted: this.halted
    };
  }

  getLogging() {
    return [...this.logging];
  }

  getErrors() {
    return this.errors.map(err => String(err).trim());
  }

  getOutputs() {
    return [...this.outputs];
  }

  exportState() {
    return {
      config: { ...this.config },
      memory: [...this.memory],
      registers: this.getRegisters(),
      logging: [...this.logging],
      errors: [...this.errors],
      outputs: [...this.outputs],
      breakpoints: [...this.breakpoints]
    };
  }

  importState(state) {
    if (!state || typeof state !== 'object') throw new Error('Invalid state object');

    if (state.config) Object.assign(this.config, state.config);
    if (state.memory) this.memory = [...state.memory];

    const r = state.registers || {};
    this.AC = r.AC ?? 0;
    this.MQ = r.MQ ?? 0;
    this.PC = r.PC ?? 0;
    this.IR = r.IR ?? 0;
    this.MAR = r.MAR ?? 0;
    this.MDR = r.MDR ?? 0;
    this.halted = r.halted ?? false;

    this.logging = [...(state.logging || [])];
    this.errors = [...(state.errors || [])];
    this.outputs = [...(state.outputs || [])];
    this.breakpoints = new Set(state.breakpoints || []);

    return true;
  }
}


