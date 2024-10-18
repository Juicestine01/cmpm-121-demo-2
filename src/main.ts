import "./style.css";

const APP_NAME = "Justin Xu's App";
const APP_TITLE = "Canvas Game";
const app = document.querySelector<HTMLDivElement>("#app")!;

const title = document.createElement("h1");
title.innerHTML = APP_TITLE

document.title = APP_NAME;
app.innerHTML = APP_NAME;

app.append(title);

const canvas = document.createElement("canvas") as HTMLCanvasElement;
canvas.width = 256;
canvas.height = 256;
const ctx = canvas.getContext("2d");

app.append(canvas)

const lines: Array<Array<{x: number, y: number}>> = [];
let currentLine = null;

const cursor = { isDrawing: false, x: 0, y: 0 }

canvas.addEventListener("mousedown", (e) => {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    cursor.isDrawing = true;

    currentLine = [];
    currentLine.push({ x: cursor.x, y: cursor.y });
    lines.push(currentLine);
});

canvas.addEventListener("mousemove", (e) => {
    if (cursor.isDrawing && ctx != null) {
        ctx.beginPath();
        ctx.moveTo(cursor.x, cursor.y);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
        ctx.closePath();
        cursor.x = e.offsetX;
        cursor.y = e.offsetY;
        currentLine.push({ x: cursor.x, y: cursor.y });

        const event = new CustomEvent("drawing-changed");
        canvas.dispatchEvent(event);
    }
});

canvas.addEventListener("mouseup", (_e) => {
    cursor.isDrawing = false;
    currentLine = null;
});

const clearButton = document.createElement("button");
clearButton.innerHTML = "clear"
app.append(clearButton);
clearButton.addEventListener("click", () => {
    if (ctx != null) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        lines.length = 0;
    }
});

canvas.addEventListener("drawing-changed", () => {
    if (ctx != null) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const line of lines) {
            if (line.length > 1) {
                ctx.beginPath();
                ctx.moveTo(line[0].x, line[0].y);
                for (let i = 1; i < line.length; i++) {
                    ctx.lineTo(line[i].x, line[i].y);
                }
                ctx.stroke();
                ctx.closePath();
                console.log(lines)
            }
        }
    }
});
