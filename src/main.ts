import "./style.css";

const APP_NAME = "Justin Xu's App";
const APP_TITLE = "Canvas Game"
const app = document.querySelector<HTMLDivElement>("#app")!;

const title = document.createElement("h1");
title.innerHTML = APP_TITLE

document.title = APP_NAME;
app.innerHTML = APP_NAME;

const canvas = document.createElement("canvas") as HTMLCanvasElement;
canvas.width = 256
canvas.height = 256
const ctx = canvas.getContext("2d");

if (ctx != null) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 256, 256);
}

app.append(title)
app.append(canvas)
