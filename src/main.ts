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

const cursor = {isDrawing: false, x: 0, y: 0}

canvas.addEventListener("mousedown", (e) => {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    cursor.isDrawing = true;
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
    }
});

canvas.addEventListener("mouseup", (_e) => {
    cursor.isDrawing = false;
});

const clearButton = document.createElement("button");
clearButton.innerHTML = "clear"
app.append(clearButton);
clearButton.addEventListener("click", () => {
    if (ctx != null) {
        ctx.clearRect(0,0, canvas.width, canvas.height)
    }
})
