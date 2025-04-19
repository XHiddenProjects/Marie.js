class MarieJS{
    /**
     * Creates an instance of the MarieJS class
     * @param {Object} config Configuration object
     */
    constructor(config={}){
        
        this.config = {
            parseTo: 'hexadecimal', // Default parse type
            memorySize: 4096, // Default memory size
            errorLogging: false, // Default error logging
            debug: false, // Default debug mode
            logging: true // Default logging
        };

        this.logging = []; // Initialize logging array
        
        
        Object.assign(this.config, config);

        // Initiate memory, registers, and program counters
        this.memory = new Array(this.config.memorySize).fill(0); // Memory with 4096 bytes
        this.AC = 0; // Accumulator register (12-bit)
        this.MQ = 0; // Multiplier/Quotient register (12-bit)
        this.PC = 0; // Program Counter (holds the address of the next instruction)
        this.IR = 0; // Instruction Register
        this.MAR = 0; // Memory Address Register
        this.MDR = 0; // Memory Data Register

        /**
        * Parse the input based on the type
        * @param {Number} input Input to parse
        * @returns {Number} Parsed input
        */
        this.parse = function(input){
            const type = this.config.parseTo.toLowerCase().substring(0, 3);
            if(type=='hex')
                return input.toString(16).toUpperCase();
            else if(type=='dec')
                return input.toString(10);
            else if(type=='bin')
                return input.toString(2);
            else if(type=='oct')
                return input.toString(8);
            else
                return input.toString(16).toUpperCase();
        }
    }
    /**
     * Load data from memory into the AC
     * @param {Number} addr Address
     */
    #load(addr){
        if(this.config.errorLogging && (addr < 0 || addr >= this.memory.length) || isNaN(addr)){
            // Log error if address is out of bounds
            console.error(`Error: Address ${addr} is out of bounds`);
            return false;
        }
        this.MAR = addr;
        this.MDR = this.memory[this.MAR];
        this.AC = this.MDR;
        if(this.config.logging)
            this.logging.push(`Load: AC=${this.AC}`);
        
    }
    /**
     * Store data from the AC into memory
     * @param {Number} addr Address
     */
    #store(addr){
        if(this.config.errorLogging && (addr < 0 || addr >= this.memory.length) || isNaN(addr)){
            // Log error if address is out of bounds
            console.error(`Error: Address ${addr} is out of bounds`);
            return false;
        }
        this.MAR = addr;
        this.memory[this.MAR] = this.AC;
        if(this.config.logging)
            this.logging.push(`Store: Memory[${this.MAR}] = ${this.AC}`);
    }
    /**
     * Add data from memory to the AC
     * @param {Number} addr Address
     */
    #add(addr){
        if(this.config.errorLogging && (addr < 0 || addr >= this.memory.length) || isNaN(addr)){
            // Log error if address is out of bounds
            console.error(`Error: Address ${addr} is out of bounds`);
            return false;
        }
        this.MAR = addr;
        this.MDR = this.memory[this.MAR];
        this.AC+=this.MDR;
        if(this.config.logging)
            this.logging.push(`Add: AC = ${this.AC}`);
    }
    #subtract(addr){
        if(this.config.errorLogging && (addr < 0 || addr >= this.memory.length) || isNaN(addr)){
            // Log error if address is out of bounds
            console.error(`Error: Address ${addr} is out of bounds`);
            return false;
        }
        this.MAR = addr;
        this.MDR = this.memory[this.MAR];
        this.AC-=this.MDR;
        if(this.config.logging)
            this.logging.push(`Subtract: AC = ${this.AC}`);
    }
    #input(){
        const input = prompt("Enter a number: ");
        this.AC = parseInt(input);
        if(this.config.errorLogging&&isNaN(this.AC)){
            console.error(`Error: Invalid input ${input}`);
            return false;
        }
        if(this.config.logging)
            this.logging.push(`Input: AC = ${this.AC}`);
    }
    #output(){
        if(this.config.errorLogging && (this.AC < 0 || this.AC >= this.memory.length) || isNaN(this.AC)){
            // Log error if address is out of bounds
            console.error(`Error: Address ${this.AC} is out of bounds`);
            return false;
        }
        if(this.config.logging)
            this.logging.push(`Output: AC = ${this.parse(this.AC)}`);
    }
    /**
     * Fetches the Instruction Register
     * @returns {Number} Instruction Register
     */
    #fetch(){
        if(this.config.errorLogging && (this.PC < 0 || this.PC >= this.memory.length) || isNaN(this.PC)){
            // Log error if address is out of bounds
            console.error(`Error: Address ${this.PC} is out of bounds`);
            return false;
        }
        this.MAR = this.PC;
        this.IR = this.memory[this.MAR];
        return this.IR;
    }
    /**
     * Execute the instructions
     * @param {Number} instruction Instruction values
     */
    #exec(instruction){
        if(this.config.errorLogging && (instruction < 0 || instruction >= this.memory.length) || isNaN(instruction)){
            // Log error if address is out of bounds
            console.error(`Error: Instruction ${instruction} is out of bounds`);
            return false;
        }
        const decode = this.#decode(instruction);
        if(decode.opcode==1) //Load
            return this.#load(decode.address);
        else if(decode.opcode==2) //Store
            return this.#store(decode.address);
        else if(decode.opcode==3) //Add
            return this.#add(decode.address);
        else if(decode.opcode==4) //Subtract
            return this.#subtract(decode.address);
        else if(decode.opcode==5) //Input
            return this.#input();
        else if(decode.opcode==6) //Output
            return this.#output();
    }
    /**
     * Decodes the instruction
     * @param {Number} instruction Instruction to decode
     * @returns {{opcode:Number,address:Number}} Opcode and address
     */
    #decode(instruction){
        if(this.config.errorLogging && (instruction < 0 || instruction >= this.memory.length) || isNaN(instruction)){
            // Log error if address is out of bounds
            console.error(`Error: Instruction ${instruction} is out of bounds`);
            return;
        }
        const opcode = instruction >> 8; // Extract the upper 4 bits for the opcode
        const address = instruction & 0xFF; // Extract the lower 8 bits for the address
        return { opcode, address };
    }
    /**
     * Updates the PC
     */
    #update(){
        this.PC += 1;
        if (this.config.debug) {
            debugger;
        }
    }
    /**
     * Execute the programs
     */
    run(){
        while(true){
            if(this.config.errorLogging && (this.PC < 0 || this.PC >= this.memory.length) || isNaN(this.PC)){
                // Log error if address is out of bounds
                console.error(`Error: Address ${this.PC} is out of bounds`);
                break;
            }
            const instruction = this.#fetch();
            if(this.#exec(instruction)===false) break;
            this.#update();
            if(instruction==0b111100000000){
                console.log(`Program halted`);
                break;
            }
        }
    }
    /**
     * Initiate the program
     * @param {Number[]} programs Programs to run
     */
    init(programs){
        if(!Array.isArray(programs)){
            throw new Error("Programs should be an array");
        }
        if(!programs.includes(0b111100000000)) programs.push(0b111100000000); // Add halt instruction if not present
        for(const program in programs) {
            this.memory[program] = programs[program];
        }
    }
    /**
     * Returns the current state of the memory
     * @returns {Number[]} Memory
     */
    getMemory(){
        if(this.config.errorLogging && (this.memory < 0 || this.memory >= this.memory.length) || isNaN(this.memory)){
            // Log error if address is out of bounds
            console.error(`Error: Memory ${this.memory} is out of bounds`);
            return;
        }
        return this.memory;
    }
    /**
     * Returns the current state of the registers
     * @returns {Object} Registers
     */
    getRegisters(){
        return {
            AC: this.AC,
            MQ: this.MQ,
            PC: this.PC,
            IR: this.IR,
            MAR: this.MAR,
            MDR: this.MDR
        };
    }
    
    ins = {
        /**
         * Load instruction
         * @param {Number} pos Memory position
         * @returns {Number} Instruction
         */
        LOAD: (pos) => {
            const opcode = 0b0001; // Opcode for LOAD
            const instruction = (opcode << 8) | (pos & 0xFF); // Combine opcode and address
            return instruction;
        },
        /**
         * Store instruction
         * @param {Number} pos Memory position
         * @returns {Number} Instruction
         */
        STORE: (pos) => {
            const opcode = 0b0010; // Opcode for STORE
            const instruction = (opcode << 8) | (pos & 0xFF); // Combine opcode and address
            return instruction;
        },
        /**
         * Add instruction
         * @param {Number} pos Memory position
         * @returns {Number} Instruction
         */
        ADD: (pos) => {
            const opcode = 0b0011; // Opcode for ADD
            const instruction = (opcode << 8) | (pos & 0xFF); // Combine opcode and address
            return instruction;
        },
        /**
         * Subtract instruction
         * @param {Number} pos Memory position
         * @returns {Number} Instruction
         */
        SUBTRACT: (pos) => {
            const opcode = 0b0100; // Opcode for SUBTRACT
            const instruction = (opcode << 8) | (pos & 0xFF); // Combine opcode and address
            return instruction;
        },
        /**
         * Input instruction
         * @returns {Number} Instruction
         */
        INPUT: () => {
            const opcode = 0b0101; // Opcode for INPUT
            const instruction = (opcode << 8); // No address needed
            return instruction;
        },
        /**
         * Output instruction
         * @returns {Number} Instruction
         */
        OUTPUT: () => {
            const opcode = 0b0110; // Opcode for OUTPUT
            const instruction = (opcode << 8); // No address needed
            return instruction;
        },
        /**
         * Halt instruction
         * @returns {Number} Instruction
         */
        HALT: () => {
            const opcode = 0b1111; // Opcode for HALT
            const instruction = (opcode << 8); // No address needed
            return instruction;
        }
    };
    /**
     * Get the current state of the logging
     * @returns {String[]} Logging array
     */
    getLogging(){
        return this.logging;
    }
}