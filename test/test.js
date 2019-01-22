import {List, Interpreter} from '../src/logo.js';

let assert = require('assert');

async function logoTest(input, output) {
    let logo = new Interpreter();
    let retval;
    logo.globalScope.bindValues({
        testout: async function(arg) {
            retval = arg;
        }
    });
    await logo.execute(input);
    assert.ok(List.equal(retval, output),
        "expected " + String(output) + " but got " + String(retval));
}

describe('Logo', function() {
    describe('#execute()', function() {
        it('should return 32 for "32"', async function() {
            await logoTest("testout 32", 32);
        });
        it('should return "hi" for "hi"', async function() {
            await logoTest(`testout "hi"`, 'hi');
        });
        it('should return [1 2] for "[1 2]"', async function() {
            await logoTest("testout [1 2]", List.of(1, 2));
        });
        it('should return 3 for "sum 1 2"', async function() {
            await logoTest("testout sum 1 2", 3);
        });
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
