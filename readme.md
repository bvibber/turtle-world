# Turtle World

Turtle World is a Logo interpreter and turtle graphics environment for the web.

**TURTLE WORLD IS INCOMPLETE. USE AT YOUR OWN RISK.**

See [on-web demo page](https://brionv.com/misc/turtle-world/) to try it out so far.

It is intended for use in interactive programming theory demos on the web. Currently it is more or less functional but incomplete. Needs cleanup in the engine, parser, and standard library, and more work on the interactive program flow visualization and debugging.

Currently it requires an ES2017-level browser engine with support for `async`/`await` and modules for direct loading, or without modules for `require` usage through a Node bundler. It can probably be transpiled further to support ES5 (IE 11) but this is not currently a priority.

The Logo engine may be used in Node.js as well without the turtle graphics component.

# Introduction

[Logo](https://en.wikipedia.org/wiki/Logo_(programming_language)) is a LISP-based language, with the primary datatypes:
* linked lists
* words (strings)
* numbers
* booleans

It is best known for its association with "turtle graphics", a drawing metaphor where cursors called "turtles" are virtually driven around the screen with simple commands. It's pretty awesome.

Procedure definitions look something like this:

```
to factorial :n
    if :n > 0 [
        ; Each procedure's argument length is known at
        ; interpretation time, so this is unambiguous.
        ; The - operator binds more tightly to :n than
        ; to the * operator.
        output :n * factorial :n - 1
    ]
    output 1
end
```

## Goals

* Fun "turtle graphics" coding environment for the web
* Logo language interpreter, for that classic 1980s feel
* Introspect and debug code within the web page, for that 2010s feel
* Minimize coupling between the turtle graphics, debugger frontend, and interpreter
* Run well in modern web browser engines (ES2017)
* Few or no dependencies
* Able to run inside an isolated environment such as a sandboxed `<iframe>`

Note that the 4-up style REPL and debugger frontend, and the turtle graphics component, may become their own components separate from the Logo interpreter, with an eye towards providing support for other languages with their own interpreters.

## Non-goals

* Not meant to implement anything performance sensitive
* Don't try to run in super-old browsers (though if transpiling works, great)
* Don't compile to native or Wasm anything

Several design decisions impact performance, such as putting `async`/`await` in several places in the interpreter hot loop. However this is what makes the interpreter pausable on the main thread, which allows for interactive debugging and visualization of code flow in real time or ssllooww mmoottiioonn.

Currently ES2017 is required for modules and `async`/`await`. Transpiling with suitable runtime support may make it possible to run on older browsers, but this is not yet tested. The babel loader is used with Node.js for testing, configured just to do module loading.

# Divergences from traditional Logos

These details may change...

Lists and instruction arguments may span across newlines, which are treated the same as spaces. Closing parentheses and brackets are required.

Variable and procedure names are case-sensitive.

Procedures may be created inside a procedure, but they will still be global.

# Syntax

* comments: start with `;`
* lists: `[` ... `]`
* words: `foo` with no quotes is tokenized to a string, interpreted as a command name in instruction lists
    * a `:` prefix on a word `:foo` marks it as a variable, equivalent to calling `thing "foo"` in execution
    * a `"` prefix on a word `"foo` marks it as a string literal in instruction lists
    * may use `\` as an escape character for spaces and delimiters
    * binary operators are special instruction words
* numbers: floating point, pos or neg, exponents ok
* booleans: use the `true` and `false` operations
* commands: lists that contain sequences of procedure names as words, quoted and numeric literals, and lists
* the special form `to` ... `end` in top-level code creates a procedure

## Operators

Binary operators `-` `+` `*` `/` `<` `>` `=` and the unary operator `-` are available, with relative precedence rules.

Note that operators bind more closely to arguments than you might expect in complex expressions: `print :x * somefunc :a - :b` will run as `print (:x * (somefunc (:a - :b)))` even though `print :x * :a - :b` will run as `print ((:x * :a) - :b)` as you might have expected.

## Accessors

Variable and procedure names are "passed by reference" by quoting their names, as in:

```
; set variable atari to number 400
make "atari 400

; prints 400
print thing "atari
```

To get variable values, the `:` prefix can be used as a shortcut for `thing`:

```
; let's go big
make "atari :atari + 400

; prints 800
print :atari
```

## Scoping

Procedures have a single global namespace.

Variables may be either global, or be local to a running procedure's scope. Arguments to a procedure are counted among its locals.

A particular oddity of Logo is that scoping of locals is dynamic -- each procedure inherits access to the locals of its caller. This is unusual for users of more modern languages, and may lead to confusion when variable names are reused in multiple procedures. But it does allow virtually passing extra arguments down to a sub-call, such as an instruction list passed to another procedure.

Setting an unbound variable value with `make` will create a global, but if the same var name was used in a calling procedure it may unexpectedly be a bound local! To explicitly bind a new local variable (which may safely shadow a caller's local or a global), use the `local` or `global` commands to bind them:

```
to somestuff
  local "a
  make "a [some local stuff]

  ; You can even rebind within a procedure.

  global "a
  make "a [some global stuff]
end
```

## Expressions

Executable expressions are themselves lists, in the form of a name for a procedure call (in a single global namespace) and zero or more argument values, which themselves may be the outputs of procedure calls.

Expressions may be wrapped in parentheses to explicitly demarcate argument list boundaries, or they may be implicitly derived from the declared procedure's number of arguments.

For instance this series of instructions:

```
output product :n factorial difference :n 1
```

runs as would the explicitly demarcated form:

```
(output (product :n (factorial (difference :n 1))))
```

Since it's unknown before execution whether a procedure call will return a value (an "operation") or not (a "command"), this is checked at runtime after execution. If a missing return value was expected as input to another call's argument, this will cause an error.

A series of non-value-returning commands may be chained in the same expression, which is common in turtle graphics:

```
penup back 100 right 10 pendown
repeat 18 [
   forward 200 right 10 back 200 right 10
]
```

## Instruction lists

Some commands and operations take blocks of code as instruction lists, which are interpreted like a procedure body. Usually list literals in source code are used to write instruction lists, but you could create them at runtime through list manipulation procedures.

For instance the `if` command takes a block to execute if the condition is true:

```
if :a = :b [
    print [the same]
]
```

Currently the blocks are executed in the same scope and context as the procedure that called the block-using operation to allow local `output` and `stop` commands:

```
forever [
    dostuff ; may alter vars
    if :a > :b [
        print [greater, now exiting]
        ; We need the value of "a" inside the block
        output :a
    ]
]
```

# Internals

## Execution model

Logo code is presented with a synchronous, single-threaded execution model, but the interpreter and all builtin procedures are implemented as JavaScript `async` functions. Logo commands may thus wait on timers, promises, or other async operations without blocking the event loop.

This also allows control flow to be introspected, visualized, and debugged interactively on the web through a hook system.

## Lists

Lists are implemented as instances of the `List` class.

Lists are proper singly-linked lists. Each `List` record is either empty, or contains a `head` value. Every record has a `tail` pointer, which is either a non-empty list record or the empty list.

Only one instance of an empty list is allowed, exposed as `List.empty`. Beware that `List.empty.tail === List.empty`. Circular references other than the empty identity are forbidden, and may cause things to break.

Modifying a list record's contents is possible from JS code, but currently not exposed to Logo code. In JS code, forward building of lists (which requires modifying the tail pointers) should be done through the ListBuilder class for convenience.

## Procedures

Procedures ("commands" that don't return a value, and "operations" that do return a value) are represented as JavaScript `async function` objects.

For built-ins implemented in JS, the functions represent themselves; user-defined Logo procedures are wrapped in a closure function which calls back into the interpreter.

The number of arguments exposed in the `length` property is used to determine how many arguments to parse, so be careful about using optional parameters and rest parameters.

Note that for the closure definition, the `length` property must be overridden manually based on the declared arguments in the Logo procedure definition, as the JS anonymous function uses a rest arg.

Whether a procedure returns a value or not affects interpretation of Logo instruction lists, so be consistent! An empty `return` or `return undefined` will be counted as not producing output. Any other value will be returned as output.

## Errors

Error conditions are modeled as JS exceptions. Internal code may throw an exception, and this will cause Logo execution to halt and clean up the interpreter stack. It's up to the calling/embedding code to catch and present those exceptions in a useful way.

Currently there is no attempt to make the error messages traditionally Logo-y.

It would be possible to add `throw`/`catch`/`finally` support at the Logo level modeled on UCBLogo, but this has not yet been done.

# Security

Logo code may call any JavaScript function that is bound as a procedure. Variables cannot be called directly however, so passing a function in as a Logo procedure argument will not make it callable from Logo.

There are no limits on memory usage for strings, lists, variable and procedure bindings, etc. It may be possible for Logo code to overuse memory, which may cause a crashed tab or Node process.

It's possible for Logo code to hog the main loop and prevent input, timers etc from running if there are no actual asynchronous operations called during a `repeat` or `forever` loop. Embedders may prevent this by forcing an event-loop bounce with `setTimeout` or `postMessage` in the `oncall` or `onvalue` callbacks.

# Open projects

See [open projects on GitHub](https://github.com/brion/turtle-world/projects/1).

# References

* [Atari Logo reference manual](https://archive.org/details/AtariLOGOReferenceManual)
* [Atari logo web emulator](https://archive.org/details/a8b_cart_Atari_LOGO_1983_Atari)
* [UCBLogo user manual](https://people.eecs.berkeley.edu/~bh/usermanual)
