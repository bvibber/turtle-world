let {List, Interpreter} = require('../src/logo.js');

let assert = require('assert');

async function logoRun(input, procs={}, output=[]) {
    let logo = new Interpreter();
    let retval;
    logo.procedureScope.bindValues(procs);
    logo.procedureScope.bindValues({
        testout: async function(arg) {
            // "testout" command returns value literally
            retval = arg;
        }
    });
    logo.onprint = (str) => {
        // "print" and "show" commands stringify
        output.push(str);
    };
    await logo.execute(input);
    return retval;
}

function logoParse(input, output) {
    let logo = new Interpreter();
    let retval = logo.parse(input);
    assert.ok(List.equal(retval, output),
        "expected " + String(output) + " but got " + String(retval));
}

async function logoTest(input, output, procs={}) {
    let retval = await logoRun(input, procs);
    assert.ok(List.equal(retval, output),
        "expected " + String(output) + " but got " + String(retval));
}

async function logoPrint(input, output, procs={}) {
    let prints = [];
    let retval = await logoRun(input, procs, prints);
    let printed = prints.join('\n');
    assert.ok(List.equal(printed, output),
        "expected " + String(output) + " but got " + String(printed));
}

async function logoTry(input, errorType, procs={}) {
    let retval;
    try {
        retval = await logoRun(input, procs);
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

        it('should parse delimiters and operators', function() {
            logoParse(`ifelse 1<2[print(3+4)/5][print :x+6]`,
                List.of('ifelse', 1, '<', 2,
                    List.of('print', '(', 3, '+', 4, ')', '/', 5),
                    List.of('print', ':x', '+', 6)
                )
            );
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
    describe('Infix operators', function() {
        it('Should add 1 + 2 -> 3', async function() {
            await logoTest('testout 1 + 2', 3);
        });
        it('Should multiply 3 * 4 -> 12', async function() {
            await logoTest('testout 3 * 4', 12);
        });
        it('Should handle 1 * 2 + 3 * 4 -> 14', async function() {
            await logoTest('testout 1 * 2 + 3 * 4', 14);
        });
        it('Should handle paren groupings', async function() {
            await logoTest('testout 48 * (2 + 3)', 240);
        })
        it('Should handle paren groupings 2', async function() {
            await logoTest('testout 48 * (0.3 + 0.2)', 24);
        });
        it('Should get 20 for print (2 + 3) * 4', async function() {
            await logoPrint(`print (2 + 3) * 4`, '20');
        })
        it('Should get 14 for print 2 + 3 * 4', async function() {
            await logoPrint(`print 2 + 3 * 4`, '14');
        })
        it('Precendce: should get 14 for print 3 * 4 + 2', async function() {
            await logoPrint(`print 3 * 4 + 2`, '14');
        })
        it('Precendce: should get 14 for print 3 * 4 + 2', async function() {
            await logoPrint(`print 3 * 4 + 2`, '14');
        })

        it('binary minus', async function() {
            await logoTest(`testout 7 - 1`, 6);
        });
        it('binary minus no space', async function() {
            await logoTest(`testout 7-1`, 6);
        });
        it('negative number minus', async function() {
            await logoTest(`testout product 7 -1`, -7);
        });
        it('unary minus on func', async function() {
            await logoTest(`
            to foo
              output 7
            end
            testout -foo`, -7);
        });
        it('unary minus on num with space', async function() {
            await logoTest(`testout - 3`, -3);
        });
        it('binary and unary minus together', async function() {
            await logoTest(`testout -3 - -2`, -1);
        });
        it('binary vs unary 1', async function() {
            await logoTest(`testout 3 * -4`, -12);
        });
        it('binary vs unary 2', async function() {
            await logoTest(`testout 3 + 4 - 5`, 2);
        });
        it('operator binding test', async function() {
            await logoTest(`
            to y :n
              output :n
            end
            make "x 2
            testout :x * y 3 - 1`, 4);
        });
        it('operator binding test2', async function() {
            await logoTest(`
            make "x 2
            make "a 8
            make "b 9
            testout :x * :a + :b`, 25);
        });
        it('operator binding test3', async function() {
            await logoTest(`
            to y :n
              output :n
            end
            make "x 2
            make "a 8
            make "b 9
            testout :x * y :a + :b`, 34);
        });
    });
    describe('print command', function() {
        it('should print string literals', async function() {
            await logoPrint(`print "a`, 'a');
        });
        it('should print lists without brackets', async function() {
            await logoPrint(`print [a b c]`, 'a b c');
        });
        it('should accept multiple params', async function() {
            await logoPrint(`(print "a [a b c])`, 'a a b c');
        });

        it('should print string literals with escaped chars', async function() {
            await logoPrint(`print "San\\ Francisco`, 'San Francisco');
        });
        it('should print string literals with initial delimiter', async function() {
            await logoPrint(`print "*`, '*');
        });
        it('should fail with string literals with initial delimiter and unescaped further delims', async function() {
            await logoTry(`print "****`, SyntaxError);
        });
        it('should handle quoted words with funky escaping', async function() {
            await logoPrint(`print "(hello\\)`, '(hello)');
        });
        it('should fail on quoted words with wrong funky escaping', async function() {
            await logoTry(`print "(hello)`, SyntaxError);
        });
        it('should fail on quoted word with unescaped bracket', async function() {
            await logoTry(`print "[`, SyntaxError);
        });
        it('should work on quoted word with escaped bracket', async function() {
            await logoPrint(`print "\\[`, '[');
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
        it('should work on or', async function() {
            await logoTest("testout or true true", true);
            await logoTest("testout or true false", true);
            await logoTest("testout or false true", true);
            await logoTest("testout or false false", false);
            await logoTest("testout (or false false true)", true);
            await logoTest("testout (or false false false)", false);
        });
        it('should work on and', async function() {
            await logoTest("testout and true true", true);
            await logoTest("testout and true false", false);
            await logoTest("testout and false true", false);
            await logoTest("testout and false false", false);
            await logoTest("testout (and true true true)", true);
            await logoTest("testout (and true true false)", false);
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
                if greaterp :n 0 [
                    output product :n factorial difference :n 1
                ]
                output 1
            end
            testout factorial 5
            `;
            await logoTest(source, 120);
        });
        it('should work on this thing', async function() {
            let source = `
            to a :n
              output 5
            end
            make "n 10
            testout :n * a :n + 1
            `;
            await logoTest(source, 50);
        });
        it('should work on this thing2', async function() {
            let source = `
            to a :n
              output 5
            end
            make "n 10
            testout :n * a :n - 1
            `;
            await logoTest(source, 50);
        });
        it('should return 120 for infix "factorial 5"', async function() {
            let source = `
            to factorial :n
                if :n > 0 [
                    output :n * factorial :n - 1
                ]
                output 1
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
        it('should not error on 99 bottles of beer', async function() {
            let source = `
            to drink :n
                (print :n [bottles of beer on the wall])
                (print :n [bottles of beer])
                print [take one down, pass it around]
                make "n difference :n 1
                if greaterp :n 0 [
                    (print :n [bottles of beer on the wall])
                    print []
                    drink :n
                ]
            end

            drink 99
            `;
            await logoTest(source, undefined);
        })
    });
    describe('Toplevel stuff checks', function() {
        it('should not allow stop at toplevel', async function() {
            let source = `stop`;
            await logoTry(source, SyntaxError);
        });
        it('should not allow stop at toplevel', async function() {
            let source = `output 42`;
            await logoTry(source, SyntaxError);
        });
    });
    describe('Variable vs procedure namespaces', function() {
        it('should not overwrite a procedure with a var', async function() {
            let source = `
                to becool
                    output "cool
                end
                make "becool "notcool
                testout becool
            `;
            await logoTest(source, 'cool');
        });
        it('should not overwrite a var with a procedure', async function() {
            let source = `
                make "becool "supercool
                to becool
                    output "cool
                end
                testout :becool
            `;
            await logoTest(source, 'supercool');
        });
    });
    describe('Variable scoping', function() {
        it('should treat globals as globals', async function() {
            let source = `
                make "aglobal "global1
                to dostuff
                    make "aglobal "global2
                end
                dostuff
                testout :aglobal
            `;
            await logoTest(source, "global2");
        });
        it('should treat args as locals', async function() {
            let source = `
                make "anarg "global
                to becool :anarg
                    make "anarg "local
                end
                becool "arg
                testout :anarg
            `;
            await logoTest(source, "global");
        });
        it('should create new vars as global by default', async function() {
            let source = `
                to dostuff
                    make "aglobal "global
                end
                dostuff
                testout :aglobal
            `;
            await logoTest(source, "global");
        });
        it('should bind locally with local command', async function() {
            let source = `
                make "avar "global
                to dostuff
                    local "avar
                    make "avar "local
                end
                dostuff
                testout :avar
            `;
            await logoTest(source, "global");
        });
        it('should bind globally with global command', async function() {
            let source = `
                make "avar "global1
                to dostuff :avar
                    global "avar
                    make "avar "global2
                end
                dostuff "arg
                testout :avar
            `;
            await logoTest(source, "global2");
        });
        it('should do dynamic scope: expose locals to subprocedure calls', async function() {
            let source = `
                to proc1
                    local "avar
                    make "avar "local1
                    proc2
                    print :avar
                end
                to proc2
                    print :avar
                    make "avar "local2
                end
                make "avar "global
                proc1
                print :avar
            `;
            await logoPrint(source, 'local1\nlocal2\nglobal');
        });
        it('should not destroy a global value when binding', async function() {
            let source = `
                to proc
                    print :avar
                    local "avar
                    make "avar "local
                    print :avar
                    global "avar
                    print :avar
                end
                make "avar "global
                proc
            `;
            await logoPrint(source, 'global\nlocal\nglobal');
        });
    });
});
