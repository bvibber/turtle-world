# Turtle World

Turtle World is a Logo interpreter and turtle graphics environment for the web.

**TURTLE WORLD IS INCOMPLETE. USE AT YOUR OWN RISK.**

It is intended for use in interactive programming theory demos on the web. Currently it is more or less functional but incomplete. Needs cleanup in the engine, parser, and standard library, and to have hooks added to support interactive program flow visualization and debugging.

Currently it requires an ES2017-level browser engine with support for `async`/`await`, but does not require native modules using the bundling via ParcelJS. It can probably be transpiled to support ES5 (IE 11) but this is not currently a priority.

The Logo engine may be used in Node.js as well without the turtle graphics component.

# Introduction

[Logo](https://en.wikipedia.org/wiki/Logo_(programming_language)) is a LISP-based language, with the primary datatypes:
* linked lists
* words (strings)
* numbers
* booleans

Procedure definitions look something like this:

```
to factorial :n
    ; No infix operators currently.
    ; Use the prefix commands for comparisons and arithmetic.
    if gt :n 1 [
        ; Each procedure's argument length is known at
        ; interpretation time, so this is unambiguous.
        output mul :n factorial sub :n 1
    ]
    if eq :n 1 [
        output 1
    ]
    output 0
end
```

# Divergences from traditional Logos

These details may change...

"Word" symbols currently must be made of word-like characters. Classic Logos allow all kinds of weird chars.

Quoted strings use double-quote characters both before and after the string, as is more common in today's languages. Thus use `print "Hello, World!"` rather than `print ["Hello, "World!]` or `make "year" 2019` rather than `make "year 1983`.

Infix operators are not yet implemented. Use procedure operations like `sum` and `product` for arithmetic.

Variables and procedures share a common namespace.

# Execution model

The interpreter and all builtin procedures are implemented as JavaScript `async` functions. Logo commands may thus wait on timers, promises, or other async operations without blocking the event loop.

This also allows control flow to be introspected, visualized, and debugged interactively on the web through a hook system. (Hook system not yet implemented.)

# Lists

Lists are implemented as instances of the `List` class.

Lists are proper singly-linked lists. Each `List` record is either empty, or contains a `head` value. Every record has a `tail` pointer, which is either a non-empty list record or the empty list.

Only one instance of an empty list is allowed, exposed as `List.empty`. Beware that `List.empty.tail === List.empty`. Circular references other than the empty identity are forbidden, and may cause things to break.

Modifying a list record's contents is possible from JS code, but currently not exposed to Logo code. In JS code, forward building of lists (which requires modifying the tail pointers) should be done through the ListBuilder class for convenience.

# Procedures

Procedures ("commands" that don't return a value, and "operations" that do return a value) are represented as JavaScript `async function` objects.

For built-ins implemented in JS, the functions represent themselves; user-defined Logo procedures are wrapped in a closure function which calls back into the interpreter.

The number of arguments exposed in the `length` property is used to determine how many arguments to parse, so be careful about using optional parameters and rest parameters.

Note that for the closure definition, the `length` property must be overridden manually based on the declared arguments in the Logo procedure definition, as the JS anonymous function uses a rest arg.

Whether a procedure returns a value or not affects interpretation of Logo instruction lists, so be consistent! An empty `return` or `return undefined` will be counted as not producing output. Any other value will be returned as output.

# Syntax

* comments: start with `;`
* lists: `[` ... `]`
* words: `foo` with no quotes is tokenized to a string, interpreted as a command name in instruction lists
* quoted strings: `"foo"` or `"foo bar"` (must include closing quote)
* numbers: floating point, pos or neg, exponents ok
* booleans: use the `true` and `false` operations
* commands: lists that contain sequences of procedure names as words, quoted and numeric literals, and lists

Variable and procedure names are "passed by reference" by quoting their names, as in:

```
; set variable "atari" to number 400
make "atari" 400

; prints 400
print get "atari"
```

To get variable values, a shortcut `:` prefix can be used as a shortcut like `get`:
```
; let's go big
make "atari" sum :atari 400

; prints 800
print :atari
```

Executable expressions are themselves lists, in the form of a name for a procedure call (looked up in current or lexical parent scope) and zero or more argument values, which themselves may be the outputs of procedure calls.

For instance this series of instructions:

```
output mul :n factorial sub :n 1
```

runs as would the explicitly demarcated form:

```
(output (mul :n (factorial (sub :n 1))))
```

