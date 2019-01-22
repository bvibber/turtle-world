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
            await logoTest(`testout "hi"`, 'hi');
        });
        it('should return "hi there" for "hi there"', async function() {
            await logoTest(`testout "hi there"`, 'hi there');
        });
        it('should return [1 2] for "[1 2]"', async function() {
            await logoTest("testout [1 2]", List.of(1, 2));
        });
    });
    describe("Standard library", function() {
        it('should return true for "true"', async function() {
            await logoTest("testout true", true);
        });
        it('should return false for "false"', async function() {
            await logoTest("testout false", false);
        });
        it('should return 3 for "sum 1 2"', async function() {
            await logoTest("testout sum 1 2", 3);
        });
        it('should return -1 for "sum 1 2"', async function() {
            await logoTest("testout sum 1 2", 3);
        });
    });
    describe("Procedure samples", function() {
        it('should return 120 for "factorial 5"', async function() {
            let source = `
            to factorial :n
                if gt :n 1 [
                    output product :n factorial difference :n 1
                ]
                if eq :n 1 [
                    output 1
                ]
                output 0
            end
            testout factorial 5
            `;
            await logoTest(source, 120);
        });
    });
});
