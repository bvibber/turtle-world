import {List, Interpreter} from '../src/logo.js';

let assert = require('assert');

async function logoRun(input, globals={}) {
    let logo = new Interpreter();
    let retval;
    logo.globalScope.bindValues(globals);
    logo.globalScope.bindValues({
        testout: async function(arg) {
            retval = arg;
        }
    });
    await logo.execute(input);
    return retval;
}

function logoParse(input, output) {
    let logo = new Interpreter();
    let retval = logo.parse(input);
    assert.ok(List.equal(retval, output),
        "expected " + String(output) + " but got " + String(retval));
}

async function logoTest(input, output, globals={}) {
    let retval = await logoRun(input, globals);
    assert.ok(List.equal(retval, output),
        "expected " + String(output) + " but got " + String(retval));
}

async function logoTry(input, errorType, globals={}) {
    let retval;
    try {
        retval = await logoRun(input, globals);
    } catch (e) {
        assert.ok(e instanceof errorType, "expected " + errorType.name + " but threw " + e);
        return;
    }
    assert.ok(false, "expected " + errorType.name + " but got " + String(retval));
}

describe('Logo', function() {
    describe('Parsing', function() {
        it('should parse an empty input', function() {
            logoParse("", List.of());
        });

        it('should parse an empty input with comment', function() {
            logoParse(';testing', List.of());
        });
        it('should parse a comment followed by a word line', function() {
            logoParse(';testing\nword', List.of('word'));
        });

        it('should parse a word input', function() {
            logoParse("word", List.of('word'));
        });
        it('should parse a numeric input', function() {
            logoParse("1983", List.of(1983));
        });
        it('should parse a negative numeric input', function() {
            logoParse("-273", List.of(-273));
        });
        it('should parse a fractional numeric input', function() {
            logoParse("98.6", List.of(98.6));
        });
        it('should parse a exponential numeric input', function() {
            logoParse("1e20", List.of(1e20));
        });
        it('should parse a negative exponential numeric input', function() {
            logoParse("1e-20", List.of(1e-20));
        });
        it('should parse a positive exponential numeric input', function() {
            logoParse("1e+20", List.of(1e+20));
        });
        it('should parse a frac exponential numeric input', function() {
            logoParse("1.5e20", List.of(1.5e20));
        });
        it('should parse a frac negative exponential numeric input', function() {
            logoParse("1.5e-20", List.of(1.5e-20));
        });
        it('should parse a frac positive exponential numeric input', function() {
            logoParse("1.5e+20", List.of(1.5e+20));
        });

        it('should parse two words', function() {
            logoParse("first second", List.of("first", "second"));
        });
        it('should parse an empty list', function() {
            logoParse("[]", List.of(List.of()));
        });
        it('should parse a list with stuff', function() {
            logoParse(`outside1 [inside1 inside2] outside2`,
                List.of('outside1', List.of('inside1', 'inside2'), 'outside2'));
        });
    });

    describe('Command/argument parsing', function() {
        it('should throw given a value with no command', async function() {
            await logoTry("32", SyntaxError);
        });

        it('should work given a command with no args', async function() {
            await logoTest("testcmd", undefined, {
                testcmd: async function() {}
            });
        });
        it('should work given a command with one arg', async function() {
            await logoTest("testcmd 1", undefined, {
                testcmd: async function(arg) {}
            });
        });
        it('should work given a command with two args', async function() {
            await logoTest("testcmd 1 2", undefined, {
                testcmd: async function(arg1, arg2) {}
            });
        });
        it('should throw given too few args', async function() {
            await logoTry("testcmd", SyntaxError, {
                testcmd: async function(arg) {}
            });
        });
        it('should throw given too many args', async function() {
            await logoTry("testcmd 1 2", SyntaxError, {
                testcmd: async function(arg) {}
            });
        });
        it('should throw given too few args in parens', async function() {
            await logoTry("(testcmd)", SyntaxError, {
                testcmd: async function(arg) {}
            });
        });
        it('should work given expected args in parens', async function() {
            await logoTest("(testcmd 1)", undefined, {
                testcmd: async function(arg) {}
            });
        });
        it('should work given extra args in parens', async function() {
            await logoTest("(testcmd 1 2)", undefined, {
                testcmd: async function(arg) {}
            });
        });
    });
    describe("Literal parsing", function() {
        it('should return 32 for "32"', async function() {
            await logoTest("testout 32", 32);
        });
        it('should return -32 for "-32"', async function() {
            await logoTest("testout -32", -32);
        });
        it('should return -1.4e-32 for "-1.4e-32"', async function() {
            await logoTest("testout -1.4e-32", -1.4e-32);
        });
        it('should return "hi" for "hi"', async function() {
            await logoTest(`testout "hi`, 'hi');
        });
        it('should return "hi there" for "hi\\ there', async function() {
            await logoTest(`testout "hi\\ there`, 'hi there');
        });
        it('should return [1 2] for "[1 2]"', async function() {
            await logoTest("testout [1 2]", List.of(1, 2));
        });
    });
    describe("Accessors", function() {
        it('should throw on : get of undefined variable', async function() {
            await logoTry(`testout :n`, ReferenceError);
        });
        it('should throw on thing get of undefined variable', async function() {
            await logoTry(`testout thing "n`, ReferenceError);
        });
        it('should throw on thing get of int', async function() {
            await logoTry(`testout thing 32`, TypeError);
        });
        it('should throw on thing get of list', async function() {
            await logoTry(`testout thing []`, TypeError);
        });
        it('should work on : get of defined variable', async function() {
            await logoTest(`make "n 32 testout :n`, 32);
        });
        it('should work on thing get of defined variable', async function() {
            await logoTest(`make "n 32 testout thing "n`, 32);
        });
    });
    describe("Standard library", function() {
        // booleans
        it('should return true for: true', async function() {
            await logoTest("testout true", true);
        });
        it('should return false for: false', async function() {
            await logoTest("testout false", false);
        });

        // math
        it('should return 5 for: sum 2 3', async function() {
            await logoTest("testout sum 2 3", 5);
        });
        it('should return -1 for: difference 2 3', async function() {
            await logoTest("testout difference 2 3", -1);
        });
        it('should return 6 for: product 2 3', async function() {
            await logoTest("testout product 2 3", 6);
        });
        it('should return 2/3 for: quotient 2 3', async function() {
            await logoTest("testout quotient 2 3", 2/3);
        });

        // equality
        it('should return true for: equalp 7 7', async function() {
            await logoTest(`testout equalp 7 7`, true);
        });
        it('should return true for: equalp "7 "7', async function() {
            await logoTest(`testout equalp "7 "7`, true);
        });
        it('should return true for: equalp [7] [7]', async function() {
            await logoTest(`testout equalp [7] [7]`, true);
        });
        it('should return false for: equalp 7 23', async function() {
            await logoTest(`testout equalp 7 23`, false);
        });
        it('should return false for: equalp 7 "7', async function() {
            await logoTest(`testout equalp 7 "7`, false);
        });
        it('should return false for: equalp [7] ["7]', async function() {
            await logoTest(`testout equalp [7] ["7]`, false);
        });

        // item selection
        it('should return first item for item 1', async function() {
            await logoTest(`testout item 1 [a]`, "a");
        });
        it('should return first item for item 1 of 2', async function() {
            await logoTest(`testout item 1 [a b]`, "a");
        });
        it('should return second item for item 2 of 2', async function() {
            await logoTest(`testout item 2 [a b]`, "b");
        });
    });
    describe("Blocks and meta-execution", function() {
        it('should run code inside if true', async function() {
            await logoTest(`testout "initial if true [testout "block\\ ran]`, 'block ran');
        });
        it('should not run code inside if false', async function() {
            await logoTest(`testout "initial if false [testout "block\\ ran]`, 'initial');
        });
        it('should pass return values from block to if', async function() {
            await logoTest(`testout if true [sum 1 2]`, 3);
        });
        it('should pass literal values from block to if', async function() {
            await logoTest(`testout if true [3]`, 3);
        });
        it('should throw on a block with multiple operations/literals', async function() {
            await logoTry(`testout if true [1 2 3]`, SyntaxError);
        });
    });
    describe("Procedure samples", function() {
        it('should return 120 for "factorial 5"', async function() {
            let source = `
            to factorial :n
                if greaterp :n 1 [
                    output product :n factorial difference :n 1
                ]
                if equalp :n 1 [
                    output 1
                ]
                output 0
            end
            testout factorial 5
            `;
            await logoTest(source, 120);
        });
        it('should return no output and no error for 12 days of xmas', async function() {
            let source = `
            to day_of_xmas :day
                (print [On day] :day [of X\\-mas, my true love gave to me])
                make "gifts reverse [
                    [partridge in a pear tree]
                    [turtle doves]
                    [French hens]
                    [calling birds]
                    [gold rings]
                    [geese a-laying]
                    [swans a-swimming]
                    [maids a-milking]
                    [ladies dancing]
                    [lords a-leaping]
                    [pipers piping]
                    [drummers drumming]
                ]
                make "n 12
                repeat 12 [
                    if lessp :n sum :day 1 [
                    (print :n first :gifts)
                    ]
                    make "gifts butfirst :gifts
                    make "n difference :n 1
                ]
            end

            make "day 1
            repeat 12 [
                day_of_xmas :day
                make "day sum :day 1
            ]
            `;
            await logoTest(source, undefined);
        });
    });
});
