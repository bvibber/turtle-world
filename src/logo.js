/**
 * Logo interpreter in ES2017.
 * See `readme.md` for details.
 * 
 * @file logo.js
 * @author Brion Vibber <brion@pobox.com>
 * @license ISC
 */

/**
 * @typedef Atom
 * @type {(boolean|number|string|function)}
 */

/**
 * @typedef LogoValue
 * @type {(Atom|List)}
 */

/**
 * @param {*} val 
 * @returns {boolean}
 */
function isNumber(val) {
    return typeof val === 'number';
}

/**
 * @param {*} val 
 * @returns {boolean}
 */
function isString(val) {
    return typeof val === 'string';
}

let reWord = /^\w[\w\d_-]*/; // ???????????
function isWord(token) {
    return isString(token) && token.match(reWord);
}

/**
 * @param {*} val 
 * @returns {boolean}
 */
function isBoolean(val) {
    return typeof val === 'boolean';
}

/**
 * @param {*} val 
 * @returns {boolean}
 */
function isFunction(val) {
    return typeof val === 'function';
}

/**
 * @param {*} val 
 * @returns {boolean}
 */
function isList(val) {
    return val instanceof List;
}

/**
 * @param {*} val 
 * @returns {boolean}
 */
function isAtom(val) {
    return isFunction(val) || isString(val) || isNumber(val) || isBoolean(val);
}

/**
 * @param {*} val 
 * @returns {boolean}
 */
function isValue(val) {
    return isList(val) || isAtom(val);
}

/**
 * Convenience class for creating lists from front to back.
 * Logo code assumes that list tails are immutable, so the
 * dangerous bits are all wrapped up here.
 *
 * Usage:
 *
 * ```js
 * let builder = new ListBuilder();
 * builder.push('an item');
 * return builder.list;
 * ```
 *
 * Accessing the `list` or `end` properties during mutation
 * is dangerous as the results may change from under you.
 */
export class ListBuilder {
    constructor() {
        this.list = List.empty;
        this.end = this.list;
    }

    /**
     * Append a single value onto the end of the list.
     *
     * Named for familiarity with `Array.prototype.push`.
     * Beware of confusion with the Logo stack-manipulation
     * `push` procedure, which inserts at the start.
     *
     * May change the identity of `this.list`.
     * 
     * @param {*} val 
     */
    push(val) {
        if (this.list.isEmpty()) {
            this.list = new List(val);
            this.end = this.list;
        } else {
            this.end = this.end.tail = new List(val);
        }
    }

    /**
     * Concatenate items from an iterable source
     * onto the end of the list.
     *
     * May change the identity of `this.list`.
     *
     * @param {Iterable} iterable 
     */
    concat(iterable) {
        for (let val of iterable) {
            this.push(val);
        }
    }

    /**
     * Attach an existing list on the tail.
     * Beware this can modify the tail, so only
     * use this if you're being clever.
     *
     * Takes ownership of `list`.
     * May change the identity of `this.list`.
     *
     * @param {List} list 
     */
    attach(list) {
        if (this.list.isEmpty()) {
            this.list = list;
        } else {
            this.end.tail = list;
        }
        this.end = list.end();
    }
}

/**
 * Linked list record -- the core of any good LISP!
 *
 * `List` objects are iterable from JavaScript for
 * convenience, so may be used in `for`-`of` loops
 * or converted to arrays with `Array.from`.
 *
 * You may also create a `List` from any JavaScript
 * iterable such as array with `List.from`.
 *
 * JavaScript code can change the `head` values and
 * `tail` pointers, but this is dangerous as it may
 * break invariant assumptions. Use the `ListBuilder`
 * convenience class for front-to-back construction
 * operations.
 *
 * The tail pointer will always point to a list, but
 * may be the empty list. This means that the empty
 * list has a circular tail reference to itself,
 * so beware.
 */
export class List {
    /**
     * Create a new linked-list record.
     *
     * @param {LogoValue} head
     * @param {List} [tail=List.empty]
     */
    constructor(head, tail=List.empty) {
        if (head === undefined) {
            if (List.empty) {
                throw new TypeError('Only one empty list may be created');
            }
            this.head = this;
            this.tail = this;
        } else {
            this.head = head;
            this.tail = tail;
        }
    }

    /**
     * @returns {boolean}
     */
    isEmpty() {
        return this === List.empty;
    }

    /**
     * @returns {boolean}
     */
    hasTail() {
        return this.tail !== List.empty;
    }

    /**
     * Create an iterator object using the given callback
     * to control the value returned.
     * @param {function} callback - filters the List record cursors into the iterator data values
     * @returns {Generator}
     */
    *iterator(callback) {
        let cursor = this;
        while (!cursor.isEmpty()) {
            // invariant: cursor is always non-empty
            yield callback(cursor);
            cursor = cursor.tail;
        }
    }

    /**
     * Return an iterable over the List record cursors
     * @returns {Generator}
     */
    cursors() {
        return {
            [Symbol.iterator]: () => {
                return this.iterator((cursor) => cursor);
            }
        }
    }

    /**
     * Return an iterator over the contained items
     * @returns {Generator}
     */
    [Symbol.iterator]() {
        return this.iterator((cursor) => cursor.head);
    }

    reverse() {
        // Using tail recursion
        let reverseList = (list, rest) => {
            if (list.isEmpty()) {
                return rest;
            }
            if (!list.hasTail()) {
                return new List(list.head, rest);
            }
            return reverseList(list.tail,
                new List(list.head, rest));
        };
        return reverseList(this, List.empty);
    }

    /**
     * Create a new list using a filter function
     * @param {function} callback 
     */
    filter(callback, thisArg=this) {
        let builder = new ListBuilder();
        for (let cursor of this.cursors()) {
            if (callback.call(thisArg, cursor.head, cursor, this)) {
                builder.push(cursor.head);
            }
        }
        return builder.list;
    }

    /**
     * Create a new list using a mapping function
     * @param {function} callback 
     */
    map(callback, thisArg=this) {
        let builder = new ListBuilder();
        for (let cursor of this.cursors()) {
            let val = callback.call(thisArg, cursor.head, cursor, this);
            builder.push(val);
        }
        return builder.list;
    }

    count() {
        let n = 0;
        for (let _item of this) {
            n++;
        }
        return n;
    }

    // Return the List record at the end
    // if list is empty, will return this
    // invariant: return value has empty tail
    end() {
        let end = this;
        for (let cursor of this.cursors()) {
            end = cursor;
        }
        return end;
    }

    static equal(a, b) {
        if (a === b) {
            return true;
        }
        if (!isList(a) || !isList(b)) {
            return false;
        }
        if (!List.equal(a.head, b.head)) {
            return false;
        }
        return List.equal(a.tail, b.tail);
    }

    /**
     * Create a List from another list, JS array, or other iterable.
     *
     * @param {Iterable} source
     */
    static from(source) {
        let builder = new ListBuilder();
        builder.concat(source);
        return builder.list;
    }

    /**
     * Create a List from the given JS arguments.
     *
     * @param  {...any} args
     */
    static of(...args) {
        return List.from(args);
    }

    /**
     * Create a new List that's a copy of this one.
     */
    clone() {
        return List.from(this);
    }

    static stringify(val, stack=[]) {
        if (isList(val)) {
            // Avoid recursive list references
            if (stack.includes(val)) {
                return '<recursive>';
            }
            stack.push(val);
            let first = true;
            let str = '[';
            for (let item of val) {
                if (first) {
                    first = false;
                } else {
                    str += ', ';
                }
                str += List.stringify(item, stack);
            }
            str += ']';
            stack.pop();
            return str;
        }
        return String(val);
    }

    toString() {
        return List.stringify(this);
    }
}

List.empty = new List();

/**
 * Helper class for state machines running through iterators.
 */
class StateMachine {
    /**
     * Must have handlers for `'start'` and `'end'` states.
     * Handler methods take one parameter, which is either
     * a value from the iterator or `undefined` indicating
     * no more data. Return value is the next state.
     *
     * Failing to return a new state is treated as an error,
     * as is returning a state that has no handler. Final
     * state after end-of-data must be `'end'`.
     *
     * @param {object} handlers 
     */
    constructor(handlers) {
        this.handlers = handlers;
        this.state = 'idle';
    }

    /**
     * Items from the iterable will be fed into the handler
     * methods based on their returned states.
     *
     * @param {Iterable} iterable - source of data to run through
     */
    run(iterable) {
        this.state = 'start';

        for (let item of iterable) {
            let handler = this.handlers[this.state];
            if (!handler) {
                throw new Error('Unexpected state ' + this.state);
            }
            let next = handler.call(this, item);
            if (!next) {
                throw new Error('Unexpected input ' + item + ' in state ' + this.state);
            }
            this.state = next;
            if (this.state === 'end') {
                // Requested an early end!
                break;
            }
        }

        let handler = this.handlers[this.state];
        if (!handler) {
            throw new Error('Unexpected state ' + this.state);
        }
        let newState = handler.call(this, undefined);
        if (!newState) {
            throw new Error('Unexpected end of input in state ' + this.state);
        }
        if (newState !== 'end') {
            throw new Error('Ended in inconsistent state ' + newState);
        }
    }
}

/**
 * Wrapper for variable bindings.
 */
export class Binding {
    /**
     * Create a new binding, with an initial value.
     * @param {LogoVal} [val]
     */
    constructor(val) {
        this.value = val;
    }
}

/**
 * Represents an execution context / activation record / stack frame.
 * A procedure call gets one, but blocks and templates executed on
 * its behalf will reuse the same one.
 *
 * For instance the inner `output`s here return from the procedure,
 * not just the `if` blocks:
 *
 * ```logo
 * to is_big :n
 *   if gt :n 1000 [output true]
 *   if lt :n 1000 [output true]
 *   output false
 * end
 * ```
 */
export class Context {
    constructor() {
        this.output = undefined;
        this.stop = false;
    }
}

export class Scope {
    /**
     * Create a new variable scope with the given parent.
     *
     * @param {Scope} ?parent
     */
    constructor(parent) {
        // Use the prototype chain to 
        this.bindings = Object.create(parent ? parent.bindings : null);
    }

    /**
     * Look up a variable binding and return its value.
     *
     * @param {string} name - variable name to look up
     * @returns {LogoVal} - the bound value
     * @throws {ReferenceError} if not found in current or parent scopes
     */
    get(name) {
        let binding = this.getBinding(name);
        if (binding) {
            return binding.value;
        } else {
            throw new ReferenceError("Undeclared variable " + name);
        }
    }

    set(name, val) {
        let binding = this.getBinding(name);
        if (binding) {
            binding.value = val;
        } else {
            this.bindValue(name, val);
        }
    }

    /**
     * Get the Binding for a given variable in the current or
     * parent scopes.
     *
     * @param {string} name - variable name to look up
     * @returns {Binding|undefined}
     */
    getBinding(name) {
        return this.bindings[name];
    }

    /**
     * Apply given binding to the given variable name in the
     * current scope. Will shadow any parent scope bindings, or
     * replace a binding in current scope.
     *
     * @param {string} name 
     * @param {Binding} binding
     */
    bind(name, binding) {
        this.bindings[name] = binding;
    }

    /**
     * Create a new binding for the given variable name in the
     * current scope. Will shadow any parent scope bindings, or
     * replace a binding in current scope.
     * 
     * Initialize it with the given value.
     *
     * @param {string} name 
     * @param {Binding} binding
     */
    bindValue(name, val) {
        this.bind(name, new Binding(val));
    }

    /**
     * Create multiple bindings
     * @param {object} map - own properties are bound as variables
     */
    bindValues(map) {
        for (let item of Object.keys(map)) {
            this.bindValue(item, map[item]);
        }
    }
}

// Helpers for builtins

async function doMap(data, template, rest, callback) {
    let sources = [data];
    while (rest.length) {
        sources.push(template);
        template = rest.shift();
    }
    let iters = sources.map((source) => {
        return source[Symbol.iterator]()
    });
    for (;;) {
        let allDone = true;
        let anyDone = false;
        let args = iters.map((iter) => {
            let {done, value} = iter.next();
            anyDone = anyDone || done;
            allDone = allDone && done;
            return value;
        });
        if (anyDone) {
            break;
        }
        let val = await this.runTemplate(template, args);
        if (callback) {
            callback(val);
        }
    }
}

// Builtin procedures
let builtins = {
    // Primitive setups
    true: async function() {
        return true;
    },
    false: async function() {
        return false;
    },
    word: async function(a, b, ...rest) {
        return String(a) + String(b) + rest.join();
    },
    list: async function(a, b, ...rest) {
        return new List(a, new List(b, list.from(rest)));
    },
    fput: async function(thing, list) {
        if (!isList(list)) {
            throw new TypeError('list must be a list');
        }
        // uses existing list as tail, fast!
        return new List(thing, list);
    },
    lput: async function(thing, list) {
        if (!isList(list)) {
            throw new TypeError('list must be a list');
        }
        // copies list, inefficient!
        let builder = new ListBuilder();
        builder.concat(list);
        builder.push(thing);
        return builder.list;
    },
    combine: async function(a, b) {
        if (isString(b)) {
            return await builtins.word.call(this, a, b);
        }
        if (isList(b)) {
            return await builtins.fput.call(this, a, b);
        }
        throw new TypeError('second arg must be string or list');
    },
    reverse: async function(list) {
        if (isList(list)) {
            return list.reverse();
        }
        throw new TypeError('list must be a list');
    },

    first: async function(arg) {
        if (isString(arg)) {
            if (arg === '') {
                throw new TypeError('empty string');
            }
            return arg[0];
        }
        if (isList(arg)) {
            if (arg.isEmpty()) {
                throw new TypeError('empty list');
            }
            return arg.head;
        }
        throw new TypeError('must be a string or list');
    },
    last: async function(arg) {
        if (isString(arg)) {
            if (arg === '') {
                throw new TypeError('empty string');
            }
            return arg[arg.length - 1];
        }
        if (isList(arg)) {
            if (arg.isEmpty()) {
                throw new TypeError('empty list');
            }
            let end = arg.end();
            return end.head;
        }
        throw new TypeError('must be a string or list');
    },
    butfirst: async function(arg) {
        if (isString(arg)) {
            if (arg === '') {
                throw new TypeError('empty string');
            }
            return arg.substr(1);
        }
        if (isList(arg)) {
            if (arg.isEmpty()) {
                throw new TypeError('empty list');
            } else {
                // Fast split of immutable list tail!
                return arg.tail;
            }
        }
        throw new TypeError('must be a string or list');
    },
    butlast: async function(arg) {
        if (isString(arg)) {
            if (arg === '') {
                throw new TypeError('empty string');
            }
            return arg.substr(0, -1);
        }
        if (isList(arg)) {
            if (arg.isEmpty()) {
                throw new TypeError('empty list');
            }
            return arg.filter((_item, cursor) => {
                // Exclude the final cursor record
                return cursor.hasTail();
            });
        }
        throw new TypeError('butlast requires a list or string');
    },
    item: async function(index, thing) {
        if (!isNumber(index)) {
            throw new TypeError('index must be a number');
        }
        if (index < 0) {
            throw new TypeError('index must be non-negative');
        }
        if (index !== (index | 0)) {
            throw new TypeError('index must be an integer');
        }
        if (isString(thing)) {
            if (index > thing.length) {
                throw new TypeError('index is beyond string length');
            }
            return thing[index];
        }
        if (isList(thing)) {
            let n = 1;
            for (let item of thing) {
                if (n === index) {
                    return item;
                }
                ++n;
            }
            throw new TypeError('index is beyond list length');
        }
        throw new TypeError('Expected list');
    },
    remove: async function(thing, list) {
        return list.filter((item) => {
            return (thing !== item);
        });
    },

    // Output

    print: async function(arg1, ...args) {
        args.unshift(arg1);
        console.log.apply(console, args.map((arg) => {
            return String(arg);
        }));
    },

    wait: function(frames) {
        return new Promise((resolve, reject) => {
            let ms = (1000 * frames) / 60;
            let id = setTimeout(() => {
                this.onbreak = null;
                resolve();
            }, ms);
            this.onbreak = (reason) => {
                clearTimeout(id);
                reject(reason);
            };
        });
    },

    // Value get/set

    thing: async function(name) {
        if (!isString(name)) {
            throw new TypeError('Invalid variable name');
        }
        let binding = this.currentScope().getBinding(name);
        if (!binding) {
            throw new ReferenceError('Undefined variable ' + name);
        }
        return binding.value;
    },
    make: async function(name, val) {
        if (!isString(name)) {
            throw new TypeError('Invalid variable name');
        }
        this.currentScope().set(name, val);
    },
    push: async function(name, val) {
        let scope = this.currentScope();
        let list = scope.get(name);
        if (!isList(list)) {
            throw new TypeError(name + ' is not a list');
        }
        list = new List(val, list);
        scope.set(list);
    },

    // Functions
    /**
     * Call a function object by reference.
     */
    call: async function(func, ...args) {
        if (typeof func === 'function') {
            return await this.performCall(func, args);
        }
    },

    /**
     * Create a callable function and bind it in the current
     * scope.
     *
     * @param {string} name 
     * @param {array} ...args: zero or more argument names and a list of lists with calls
     */
    to: async function(name, ...args) {
        let parentScope = this.currentScope();
        if (!isString(name)) {
            throw new TypeError('function name must be a string');
        }
        if (args.length < 1) {
            throw new TypeError('function must have a body');
        }
        let body = args.pop();
        let func = this.procedure(parentScope, name, args, body);
        parentScope.bindValue(name, func);
    },

    // Arithmetric
    sum: async function(a, b) {
        return a + b;
    },
    difference: async function(a, b) {
        return a - b;
    },
    product: async function(a, b) {
        return a * b;
    },
    quotient: async function(a, b) {
        return a / b;
    },
    remainder: async function(a, b) {
        return a % b;
    },

    // Predicates
    equalp: async function(a, b) {
        return List.equal(a, b);
    },
    lessp: async function(a, b) {
        return a < b;
    },
    lessequalp: async function(a, b) {
        return a <= b;
    },
    greaterp: async function(a, b) {
        return a > b;
    },
    greaterequalp: async function(a, b) {
        return a >= b;
    },

    // Control structures
    stop: async function() {
        let context = this.currentContext();
        context.stop = true;
    },
    output: async function(arg) {
        let context = this.currentContext();
        context.stop = true;
        context.output = arg;
    },
    run: async function(block) {
        if (!isList(block)) {
            throw new TypeError('block must be a list');
        }
        return await this.evaluate(block);
    },
    runresult: async function(block) {
        if (!isList(block)) {
            throw new TypeError('block must be a list');
        }
        let result = await this.evaluate(block);
        if (result === undefined) {
            return List.empty;
        }
        return List.of(result);
    },
    repeat: async function(times, block) {
        if (!isNumber(times)) {
            throw new TypeError('times must be a number');
        }
        if (!isList(block)) {
            throw new TypeError('block must be a list');
        }
        for (let i = 0; i < times; i++) {
            await this.evaluate(block);
            if (this.currentContext().stop) {
                break;
            }
        }
    },
    forever: async function(block) {
        for (;;) {
            await this.evaluate(block);
            if (this.currentContext().stop) {
                break;
            }
        }
    },
    if: async function(cond, block) {
        if (cond) {
            return await this.evaluate(block);
        }
    },
    ifelse: async function(cond, thenBlock, elseBlock) {
        if (cond) {
            return await this.evaluate(block);
        } else {
            return await this.evaluate(block);
        }
    },

    // Template iteration
    apply: async function(template, inputlist) {
        let inputs = Array.from(inputlist);
        return await this.runTemplate(template, inputs);
    },
    invoke: async function(template, input1, ...inputs) {
        inputs.unshift(input1);
        return await this.runTemplate(template, inputs);
    },
    foreach: async function(data, template, ...rest) {
        await doMap.call(this, data, template, rest);
    },
    map: async function(data, template, ...rest) {
        let builder = new ListBuilder();
        await doMap.call(this, data, template, rest, (val) => {
            builder.push(val);
        });
        return builder.list;
    },
};

// Aliases of builtin procedures and macros
let aliases = {
    get: 'thing',
    set: 'make',
    add: 'sum',
    mul: 'product',
    div: 'quotient',
    sub: 'difference',
    modulo: 'remainder',
};
for (let [alias, original] of Object.entries(aliases)) {
    builtins[alias] = builtins[original];
}

export class Interpreter {
    constructor() {
        this.globalScope = new Scope();
        this.globalScope.bindValues(builtins);
        this.globalContext = new Context();
        this.scopes = [this.globalScope];
        this.contexts = [this.globalContext];

        // Set to true during program execution.
        this.running = false;
        this.breakFlag = false;
        this.paused = false;

        // Sync callback for cancelable async operations
        // exposed through commands.
        this.onbreak = null;
        this.oncontinue = null;

        // Async callback for Logo code evaluation.
        // Is called with the body, current node, and
        // argument values on every command or operation
        // call.
        //
        // Code can trace, or even delay execution.
        this.oncall = null;
        this.onvalue = null;
    }

    currentContext() {
        let contexts = this.contexts;
        let len = contexts.length;
        if (len > 0) {
            return contexts[len - 1];
        }
        return undefined;
    }

    currentScope() {
        let scopes = this.scopes;
        let len = scopes.length;
        if (len > 0) {
            return scopes[len - 1];
        }
        return undefined;
    }

    /**
     * Create a live function object wrapping a Logo
     * procedure definition.
     *
     * @param {Scope} parentScope 
     * @param {string} funcName 
     * @param {Iterable<string>} argNames 
     * @param {Iterable<LogoValue>} body 
     * @returns {function}
     */
    procedure(parentScope, funcName, argNames, body) {
        if (!isString(funcName)) {
            throw new TypeError('function name must be a string');
        }
        for (let name of argNames) {
            if (!isString(name)) {
                throw new TypeError('function argument names must be strings');
            }
        }
        let func = async (...args) => {
            // Locally bind the arguments
            let scope = new Scope(parentScope);
            for (let [index, name] of argNames.entries()) {
                scope.bindValue(name, args[index]);
            }
            let context = new Context();
            this.scopes.push(scope);
            this.contexts.push(context);
            try {
                await this.evaluate(body);
            } finally {
                this.contexts.pop();
                this.scopes.pop();
            }
            return context.output;
        };
        Object.defineProperties(func, {
            length: {
                value: argNames.length,
                writable: false,
                enumerable: false,
                configurable: true,
            },
            name: {
                value: funcName,
                writable: false,
                enumerable: false,
                configurable: true,
            },
        });
        return func;
    }

    tokenize(str) {
        const reSemicolon = /^;/;
        const reSpace = /^[ \t\n\r]/;
        const reNewline = /^[\n\r]/;
        const reColon = /^:/;
        const reQuote = /^"/;
        const reBackslash = /^\\/;
        const reWordStart = /^[\w_]/;
        const reWord = /^[\w_-]/;
        const reDigit = /^[0-9]/;
        const reDot = /^\./;
        const reExponent = /^e/;
        const reSign = /^[-\+]/;
        const reOpenParen = /^\(/;
        const reCloseParen = /^\)/;
        const reOpenBracket = /^\[/;
        const reCloseBracket = /^\]/;

        // sigils
        let tokens = new ListBuilder();
        let token;

        let machine = new StateMachine({
            start: (char) => {
                if (!char) {
                    return 'end';
                }
                if (char.match(reSpace)) {
                    return 'start';
                }
                if (char.match(reSemicolon)) {
                    return 'comment';
                }
                if (char.match(reQuote)) {
                    // "foo" surrounds a string.
                    // note the token value is de-escaped
                    // and contains only an initial quote
                    // like this: "foo
                    token = char;
                    return 'string';
                }
                if (char.match(reColon)) {
                    // :foo is a shortcut for 'get foo'
                    // so it may prefix a word.
                    token = char;
                    return 'word';
                }
                if (char.match(reWordStart)) {
                    token = char;
                    return 'word';
                }
                if (char.match(reSign)) {
                    token = char;
                    return 'numberSign';
                }
                if (char.match(reDigit)) {
                    token = char;
                    return 'numberDigit';
                }
                if (char.match(reOpenParen)) {
                    tokens.push(char);
                    return 'start';
                }
                if (char.match(reCloseParen)) {
                    tokens.push(char);
                    return 'start';
                }
                if (char.match(reCloseParen)) {
                    tokens.push(char);
                    return 'start';
                }
                if (char.match(reOpenBracket)) {
                    tokens.push(char);
                    return 'start';
                }
                if (char.match(reCloseBracket)) {
                    tokens.push(char);
                    return 'start';
                }
            },
            comment: (char) => {
                if (!char) {
                    return 'end';
                }
                if (char.match(reNewline)) {
                    return 'start';
                }
                // Ignore anything else
                return 'comment';
            },
            string: (char) => {
                if (char.match(reQuote)) {
                    // Note the *token* doesn't get a final quote
                    // or contain backslashes.
                    tokens.push(token);
                    return 'start';
                }
                if (char.match(reBackslash)) {
                    return 'stringEscape';
                }
                if (char) {
                    token += char;
                    return 'string';
                }
            },
            stringEscape: (char) => {
                if (char.match(reQuote) || char.match(reBackslash)) {
                    token += char;
                    return 'string';
                }
            },
            word: (char) => {
                if (!char) {
                    tokens.push(token);
                    return 'end';
                }
                if (char === '(' || char === ')' || char === '[' || char === ']') {
                    tokens.push(token);
                    return machine.handlers.start(char);
                }
                if (char.match(reNewline)) {
                    tokens.push(token);
                    return 'start';
                }
                if (char.match(reSpace)) {
                    tokens.push(token);
                    return 'start';
                }
                if (char.match(reWord)) {
                    token += char;
                    return 'word';
                }
            },
            numberSign: (char) => {
                if (char.match(reDigit)) {
                    token += char;
                    return 'numberDigit';
                }
            },
            numberDigit: (char) => {
                if (!char) {
                    tokens.push(token);
                    return 'end';
                }
                if (char.match(reSpace)) {
                    tokens.push(token);
                    return 'start';
                }
                if (char.match(reDigit)) {
                    token += char;
                    return 'numberDigit';
                }
                if (char.match(reDot)) {
                    token += char;
                    return 'numberDot';
                }
                if (char.match(reExponent)) {
                    token += char;
                    return 'numberExponent';
                }
            },
            numberDot: (char) => {
                if (char.match(reDigit)) {
                    token += char;
                    return 'numberFraction';
                }
            },
            numberFraction: (char) => {
                if (char.match(reDigit)) {
                    token += char;
                    return 'numberFraction';
                }
                if (char.match(reExponent)) {
                    token += char;
                    return 'numberExponent';
                }
            },
            numberExponent: (char) => {
                if (char.match(reSign)) {
                    token += char;
                    return 'numberExponentSign';
                }
            },
            numberExponentSign: (char) => {
                if (char.match(reDigit)) {
                    token += char;
                    return 'numberExponentDigit';
                }
            },
            numberExponentDigit: (char) => {
                if (!char) {
                    tokens.push(token);
                    return 'end';
                }
                if (char.match(reSpace)) {
                    tokens.push(token);
                    return 'start';
                }
                if (char.match(reDigit)) {
                    token += char;
                    return 'numberExponentDigit';
                }
            },
            end: (char) => {
                if (!char) {
                    return 'end';
                }
            }
        });

        machine.run(str);

        return tokens.list;
    }

    parse(tokens) {
        const reNumber = /^[0-9-]/;
        let parsed = new ListBuilder();
        let parens = 0;
        let oldState;
        let stack = [];
        let sub;

        function push() {
            stack.push([parsed, sub, parens, oldState]);
            parsed = sub;
            sub = undefined;
            parens = 0;
        }
        function pop() {
            [parsed, sub, parens, oldState] = stack.pop();
        }

        function common(token, state=machine.state) {
            if (token === undefined) {
                throw new SyntaxError('Out of input');
            }
            if (token === '(') {
                parens++;
                parsed.push(token);
                return state;
            }
            if (token === ')') {
                parens--;
                parsed.push(token);
                return state;
            }
            if (token === '[') {
                sub = new ListBuilder();
                oldState = machine.state;
                push();
                return 'block';
            }
            if (token === 'to') {
                /*
                Transform this syntax:

                    to func :arg1 :arg2
                        blah
                    end
                
                Into equivalent of this:

                    (to "func" "arg1" "arg2" [
                        blah
                    ])
                
                */
                parsed.push('(');
                parsed.push('to');
                oldState = machine.state;
                return 'to';
            }

            // Numeric literal
            if (token.match(reNumber)) {
                parsed.push(parseFloat(token));
                return state;
            }

            // A word, string, or such
            parsed.push(token);
            return state;
        }
        let machine = new StateMachine({
            start: (token) => {
                if (!token) {
                    return 'end';
                }
                return common(token);
            },
            block: (token) => {
                if (token === ']') {
                    if (parens) {
                        throw new SyntaxError('Cannot close bracket when parens are open');
                    }
                    if (!stack.length) {
                        throw new SyntaxError('Cannot close non-open bracket');
                    }
                    pop();
                    parsed.push(sub.list);
                    return oldState;
                }
                return common(token);
            },
            to: (token) => {
                // convert the function name into a string
                parsed.push('"' + token);
                return 'toArgs';
            },
            toArgs: (token) => {
                if (token[0] === ':') {
                    // convert the function arg to a string
                    parsed.push('"' + token.substr(1));
                    return 'toArgs';
                }
                // Create a block for the remaining contents
                sub = new ListBuilder();
                push();
                return machine.handlers.toBlock(token);
            },
            toBlock: (token) => {
                if (token === 'end') {
                    let subList = parsed.list;
                    pop();
                    parsed.push(subList);
                    parsed.push(')');
                    return oldState;
                }
                return common(token, 'toBlock');
            },
            end: (token) => {
                if (!token) {
                    return 'end';
                }
            }
        });
        machine.run(tokens);
        return parsed.list;
    }

    /**
     * Check the break flag and perform a procedure call.
     * This operation will be observable asynchronously
     * sometime in the future.
     *
     * @param {function} func 
     * @param {array} args 
     */
    async performCall(func, args, body=undefined, node=undefined) {
        await this.checkBreak();
        if (this.oncall) {
            await this.oncall(func, args, body, node);
        }
        let retval = await func.apply(this, args);
        if (retval !== undefined && this.onvalue) {
            await this.onvalue(retval, body, node);
        }
        return retval;
    }

    async runTemplate(template, args) {
        if (isString(template)) {
            // word -> command
            let binding = this.currentScope().getBinding(template);
            if (!binding) {
                throw new ReferenceError('Unbound template command ' + template);
            }
            let func = binding.value;
            return await this.performCall(func, args);
        }

        if (!isList(template)) {
            throw new TypeError('Template must be command or list');
        }
        if (template.isEmpty()) {
            return undefined;
        }

        let scope = new Scope(this.currentScope());
        if (isList(template.head)) {
            // arg names
            let names = template.head;
            template = template.tail;
            let n = 0;
            for (let name of names) {
                if (n > args.length) {
                    throw new ReferenceError('Not enough arguments given to template');
                }
                scope.bindValue(name, args[n]);
                ++n;
            }
        } else {
            // no arg names
            throw new TypeError('Template must have arguments');
            // todo: question-mark form?
        }
        // todo: 'procedure text form'?

        this.scopes.push(scope);
        try {
            return await this.evaluate(template);
        } finally {
            this.scopes.pop();
        }
    }

    async evaluate(body) {
        let interpreter = this;
        let scope = this.currentScope();
        let context = this.currentContext();
        let retval;
        let iter = body;

        function validateCommand(command) {
            if (!isWord(command)) {
                throw new SyntaxError('Invalid command word: ' + command);
            }
            let binding = scope.getBinding(command);
            if (!binding) {
                throw new TypeError('Unbound function: ' + command);
            }
            let func = binding.value;
            return func;
        }

        async function handleLiteral() {
            let node = iter;
            let value = iter.head;
            iter = iter.tail;
            if (isList(value) || isBoolean(value) || isNumber(value)) {
                if (interpreter.onvalue) {
                    await interpreter.onvalue(value, body, node);
                }
                return value;
            }
            if (!isString(value)) {
                throw new SyntaxError('Unexpected token ' + value);
            }
            let first = value[0];
            let rest = value.substr(1);
            if (first === '"') {
                // String literal
                if (interpreter.onvalue) {
                    await interpreter.onvalue(rest, body, node);
                }
                return value.substr(1);
            }
            if (first === ':') {
                // Variable get
                let val = scope.get(rest);
                if (interpreter.onvalue) {
                    await interpreter.onvalue(val, body, node);
                }
                return val;
            }
            throw new SyntaxError('Unexpected token ' + value);
        }

        async function handleArg() {
            if (iter.head === '(') {
                // Variadic command
                return await handleVariadic();
            }
            if (isWord(iter.head)) {
                return await handleFixed();
            }
            return await handleLiteral();
        }

        async function handleVariadic() {
            // Consume the "("
            iter = iter.tail;

            // Variadic command
            if (iter.isEmpty()) {
                throw new SyntaxError('End of input expecting variadic command');
            }

            let node = iter;
            let command = node.head;
            let func = validateCommand(command);
            let args = [];
            iter = iter.tail;
            while (!context.stop) {
                if (iter.isEmpty()) {
                    throw new SyntaxError('End of input expecting variadic arg');
                }
                if (iter.head === ')') {
                    if (args.length < func.length) {
                        throw new SyntaxError('Not enough args to call ' + func.name);
                    }
                    iter = iter.tail;
                    return await interpreter.performCall(func, args, body, node);
                }
                let retval = await handleArg(iter.head);
                if (retval === undefined) {
                    throw new SyntaxError('Expected output from arg to ' + func.name);
                }
                args.push(retval);
            }
            return undefined;
        }

        async function handleFixed() {
            // Fixed-length command
            let node = iter;
            let command = node.head;
            let func = validateCommand(command);
            let args = [];
            iter = iter.tail;
            while (!context.stop) {
                if (args.length >= func.length) {
                    return await interpreter.performCall(func, args, body, node);
                }
                if (iter.isEmpty()) {
                    throw new SyntaxError('End of input expecting fixed arg');
                }
                let retval = await handleArg(iter.head);
                if (retval === undefined) {
                    throw new SyntaxError('Expected output from arg to ' + func.name);
                }
                args.push(retval);
            }
            return undefined;
        }

        while (!context.stop) {
            if (retval !== undefined) {
                if (iter.isEmpty()) {
                    return retval;
                }
                throw new SyntaxError('Extra instructions after a value-returning expression: ' + iter.head);
            }
            if (iter.isEmpty()) {
                break;
            }
            if (iter.head === '(') {
                retval = await handleVariadic();
                continue;
            }
            if (isWord(iter.head)) {
                retval = await handleFixed();
                continue;
            }
            retval = await handleLiteral();
        }
        return retval;
    }

    // Parse and execute a string in the global context
    async execute(source) {
        if (this.running) {
            // @todo allow pushing it onto a task list
            throw new Error('Logo code is already running');
        }
        let tokens = this.tokenize(source);
        let parsed = this.parse(tokens);
        this.running = true;
        try {
            let retval = await this.evaluate(parsed);
            if (retval !== undefined) {
                throw new SyntaxError('Unhandled output value ' + String(retval));
            }
        } finally {
            // Clean up flags
            this.breakFlag = false;
            this.running = false;
        }
    }

    /**
     * Checks for breaks and pauses
     * Async, as may delay during a pause.
     */
    checkBreak() {
        return new Promise((resolve, reject) => {
            if (this.breakFlag) {
                throw new Error('Break requested');
            }
            if (this.paused) {
                this.oncontinue = () => {
                    resolve();
                };
                this.onbreak = (reason) => {
                    this.oncontinue = null;
                    reject(reason);
                };
            } else {
                resolve();
            }
        });
    }

    pause() {
        if (!this.running) {
            throw new Error('Cannot pause when not running');
        }
        if (this.paused) {
            throw new Error('Already paused');
        }
        this.paused = true;
    }

    continue() {
        if (!this.running) {
            throw new Error('Cannot continue when not running');
        }
        if (!this.paused) {
            throw new Error('Cannot continue when not paused');
        }
        this.paused = false;
        this.oncontinue();
    }

    /**
     * Request a user break of any currently running code.
     * Will throw an exception within the interpreter loop.
     */
    break() {
        if (!this.running) {
            throw new Error('Cannot break when not running');
        }
        if (this.breakFlag) {
            throw new Error('Already breaking');
        }

        // Interpreter loop will check this flag and break
        // out with an internal exception.
        this.breakFlag = true;

        if (this.onbreak) {
            // Async operations may set this callback
            // so we can interrupt them, such as clearing
            // a long-running timeout.
            this.onbreak(new Error('Break requested'));
        }

        if (this.paused) {
            this.continue();
        }
    }
}
