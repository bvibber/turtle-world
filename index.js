/**
 * Demo for Logo interpreter in ES2017.
 * See `readme.md` for details.
 *
 * @file index.js
 * @author Brion Vibber <brion@pobox.com>
 * @license ISC
 */

import {Interpreter, List} from './logo.js';
import {TurtleGraphics} from './turtle.js';

let el = document.getElementById('logo-display');
let elConsole = document.getElementById('logo-console');
let elInput = document.getElementById('logo-input');
let elRun = document.getElementById('logo-run');

let turtle = new TurtleGraphics(el, 640, 480);
let logo = new Interpreter();

function print(className, str) {
    let div = document.createElement('div');
    div.className = className;
    let text = document.createTextNode(str);
    div.appendChild(text);
    elConsole.appendChild(div);
    elConsole.scrollTop = div.offsetTop;
}

elRun.addEventListener('click', function(event) {
    let source = elInput.value;
    elRun.disabled = true;
    elInput.disabled = true;
    print('input', source);
    logo.execute(source)
        .then(() => {
            elInput.disabled = false;
            elRun.disabled = false;
        }).catch((e) => {
            console.log(e);
            print('error', e);
            elRun.disabled = false;
            elInput.disabled = false;
        });
});

let api = {
    // Rebind 'print'
    print: async function(arg, ...args) {
        args.unshift(arg);
        // @fixme correctly flatten any lists
        let str = args.join(' ');

        print('output', str);
    },

    // Turtle commands
    cs: async function() {
        turtle.clearScreen();
    },
    xcor: async function() {
        return turtle.x;
    },
    ycor: async function() {
        return turtle.y;
    },
    pos: async function() {
        return List.of(turtle.x, turtle.y);
    },
    setpos: async function(list) {
        if (!(list instanceof List)) {
            throw new TypeError('list must be a list');
        }
        if (list.isEmpty() || list.tail.isEmpty()) {
            throw new TypeError('list must have two elements');
        }
        let x = Number(list.head);
        let y = Number(list.tail.head);
        turtle.setPos(x, y);
    },
    heading: async function() {
        return turtle.heading;
    },
    seth: async function(val) {
        turtle.heading = Number(val);
    },
    forward: async function(dist) {
        turtle.forward(+dist);
    },
    back: async function(dist) {
        turtle.back(+dist);
    },
    right: async function(deg) {
        turtle.right(+deg);
    },
    left: async function(deg) {
        turtle.left(+deg);
    },
    up: async function() {
        turtle.up();
    },
    down: async function() {
        turtle.down();
    },
    color: async function(color) {
        turtle.color('' + color);
    },
};
logo.globalScope.bindValues(api);

elRun.click();
