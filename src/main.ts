import "./style.css";

const APP_NAME = "Justin Xu's App";
const APP_TITLE = "Canvas Game";
const app = document.querySelector<HTMLDivElement>("#app")!;

const title = document.createElement("h1");
title.innerHTML = APP_TITLE;

document.title = APP_NAME;
app.innerHTML = APP_NAME;

app.append(title);

const canvas = document.createElement("canvas") as HTMLCanvasElement;
canvas.width = 256;
canvas.height = 256;
const ctx = canvas.getContext("2d");

app.append(canvas);

const lines: Array<Displayable> = [];
let currentLine: lineOrPoint | null = null;
let toolPreview: ToolPreview | null = null;
const redoStack: Array<Displayable> = [];

interface Displayable {
    display(ctx: CanvasRenderingContext2D): void;
}

class lineOrPoint implements Displayable {
    points: Array<{ x: number, y: number }>;
    lineThickness: number;

    constructor(points: Array<{ x: number, y: number }> = [], lineThickness: number) {
        this.points = points;
        this.lineThickness = lineThickness;
    }

    addPoint(x: number, y: number) {
        this.points.push({ x, y });
    }

    display(ctx: CanvasRenderingContext2D) {
        if (this.points.length > 1) {
            ctx.beginPath();
            ctx.lineWidth = this.lineThickness;
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            ctx.stroke();
            ctx.closePath();
        }
    }
}

// Tool Preview class to render a circle at the mouse location
class ToolPreview implements Displayable {
    x: number;
    y: number;
    radius: number;

    constructor(x: number, y: number, radius: number) {
        this.x = x;
        this.y = y;
        this.radius = radius;
    }

    setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    setRadius(radius: number) {
        this.radius = radius;
    }

    display(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.closePath();
    }
}

const cursor = { isDrawing: false, x: 0, y: 0 };

canvas.addEventListener("mousedown", (e) => {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    cursor.isDrawing = true;

    currentLine = new lineOrPoint([], thickOrThin.getThickness());
    currentLine.addPoint(cursor.x, cursor.y);
    redoStack.splice(0, redoStack.length);
    lines.push(currentLine);

    const event = new CustomEvent("drawing-changed");
    canvas.dispatchEvent(event);
});

canvas.addEventListener("mousemove", (e) => {
    const x = e.offsetX;
    const y = e.offsetY;

    if (cursor.isDrawing && ctx != null) {
        ctx.beginPath();
        ctx.moveTo(cursor.x, cursor.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.closePath();
        cursor.x = x;
        cursor.y = y;
        currentLine?.addPoint(cursor.x, cursor.y);

        const event = new CustomEvent("drawing-changed");
        canvas.dispatchEvent(event);
    } else {
        // Update tool preview position and fire the event
        if (!toolPreview) {
            toolPreview = new ToolPreview(x, y, thickOrThin.getThickness() / 2);
        } else {
            toolPreview.setPosition(x, y);
            toolPreview.setRadius(thickOrThin.getThickness() / 2);
        }
        const event = new CustomEvent("tool-moved");
        canvas.dispatchEvent(event);
    }
});

canvas.addEventListener("mouseup", (_e) => {
    cursor.isDrawing = false;
    currentLine = null;

    thickOrThin.resetToDefault();

    const event = new CustomEvent("drawing-changed");
    canvas.dispatchEvent(event);
});

const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
app.append(clearButton);
clearButton.addEventListener("click", () => {
    if (ctx != null) {
        lines.splice(0, lines.length);
        const event = new CustomEvent("drawing-changed");
        canvas.dispatchEvent(event);
    }
});

canvas.addEventListener("drawing-changed", () => {
    if (ctx != null) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const line of lines) {
            line.display(ctx);
        }

        if (!cursor.isDrawing && toolPreview) {
            toolPreview.display(ctx);
        }
    }
});

canvas.addEventListener("tool-moved", () => {
    if (ctx != null && !cursor.isDrawing && toolPreview) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const line of lines) {
            line.display(ctx);
        }

        toolPreview.display(ctx);
    }
});

const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
app.append(undoButton);
undoButton.addEventListener("click", () => {
    const lastLine = lines.pop();
    if (lastLine) {
        redoStack.push(lastLine);
        const event = new CustomEvent("drawing-changed");
        canvas.dispatchEvent(event);
    }
});

const redoButton = document.createElement("button");
redoButton.innerHTML = "redo";
app.append(redoButton);
redoButton.addEventListener("click", () => {
    const lastRedo = redoStack.pop();
    if (lastRedo) {
        lines.push(lastRedo);
        const event = new CustomEvent("drawing-changed");
        canvas.dispatchEvent(event);
    }
});

class thickness {
    lineThickness: number;
    defaultThickness: number;

    constructor(defaultThickness: number) {
        this.lineThickness = defaultThickness;
        this.defaultThickness = defaultThickness;
    }

    setThickness(newThickness: number) {
        this.lineThickness = newThickness;
    }

    getThickness(): number {
        return this.lineThickness;
    }

    resetToDefault() {
        this.lineThickness = this.defaultThickness;
    }
}

let thickOrThin = new thickness(3);

const thickButton = document.createElement("button");
thickButton.innerHTML = "thick";
app.append(thickButton);
thickButton.addEventListener("click", () => {
    thickOrThin.setThickness(8);
});

const thinButton = document.createElement("button");
thinButton.innerHTML = "thin";
app.append(thinButton);
thinButton.addEventListener("click", () => {
    thickOrThin.setThickness(1);
});
