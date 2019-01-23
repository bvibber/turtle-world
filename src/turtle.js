/**
 * Turtle graphics backend for Logo interpreter in ES2017.
 * See `readme.md` for details.
 * 
 * @file turtle.js
 * @author Brion Vibber <brion@pobox.com>
 * @license ISC
 */

 export class TurtleGraphics {
    constructor(el, width, height) {
        let canvas = document.createElement('canvas');
        this.width = canvas.width = +width;
        this.height = canvas.height = +height;
        el.appendChild(canvas);

        this._canvas = canvas;
        this._ctx = canvas.getContext('2d');

        this.x = 0;
        this.y = 0;
        this.theta = 0;
        this.penDown = true;
        this.color = 'black';
    }

    clearScreen() {
        this._ctx.clearRect(0, 0, this.width, this.height);
    }

    get heading() {
        return this.theta;
    }

    set heading(newHeading) {
        this.theta = newHeading % 360;
    }

    setPos(newX, newY) {
        let oldX = this.x;
        let oldY = this.y;

        this.x = newX;
        this.y = newY;

        if (this.penDown) {
            let ctx = this._ctx;
            ctx.beginPath();
            ctx.strokeStyle = this.color;

            // Center and flip the Y coordinate.
            ctx.moveTo(oldX + this.width / 2, this.height / 2 - oldY);
            ctx.lineTo(newX + this.width / 2, this.height / 2 - newY);
            ctx.stroke();
            ctx.closePath();
        }
    }

    forward(dist) {
        let radians = -this.heading * Math.PI / 180 + Math.PI / 2;
        let newX = this.x + dist * Math.cos(radians);
        let newY = this.y + dist * Math.sin(radians);
        this.setPos(newX, newY);
    };

    back(dist) {
        this.forward(-dist);
    }

    left(angle) {
        this.heading -= angle;
    }

    right(angle) {
        this.heading += angle;
    }

    up() {
        this.penDown = false;
    }

    down() {
        this.penDown = true;
    }

    setColor(str) {
        this.color = '' + str;
    }
}
