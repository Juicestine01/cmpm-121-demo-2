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
let stickerPreview: StickerPreview | null = null; 
const redoStack: Array<Displayable> = [];
let activeSticker: StickerPreview | null = null;
const stickerOffset = { x: 0, y: 0 };


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
        this.y = y - 5;
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



function getRandomRotation(): number {
    return (Math.random() - 0.5) * Math.PI; 
}

class StickerPreview extends ToolPreview {
    emoji: string;
    rotation: number; 

    constructor(x: number, y: number, emoji: string, rotation: number = 0) {
        super(x, y, 15);
        this.emoji = emoji;
        this.rotation = rotation;
    }

    override display(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.font = "30px Arial";
        ctx.fillText(this.emoji, -15, -5); 
        ctx.restore();
    }
}

const cursor = { isDrawing: false, x: 0, y: 0 };

canvas.addEventListener("mousedown", (e) => {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;

    for (const line of lines) {
        if (line instanceof StickerPreview) {
            const dist = Math.sqrt((line.x - cursor.x) ** 2 + (line.y - cursor.y) ** 2);
            if (dist < line.radius) { 
                activeSticker = line;

                stickerOffset.x = cursor.x - line.x;
                stickerOffset.y = cursor.y - line.y;
                return;
            }
        }
    }

    if (stickerPreview) {
        const placedSticker = new StickerPreview(cursor.x, cursor.y, stickerPreview.emoji, stickerPreview.rotation);
        lines.push(placedSticker);
        stickerPreview = null;

        const event = new CustomEvent("drawing-changed");
        canvas.dispatchEvent(event);
        return;
    }

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
    } else if (activeSticker) {
        activeSticker.x = x - stickerOffset.x;
        activeSticker.y = y - stickerOffset.y;

        const event = new CustomEvent("drawing-changed");
        canvas.dispatchEvent(event);
    } else {
        if (stickerPreview) {
            stickerPreview.setPosition(x, y);
        } else if (!toolPreview) {
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
    activeSticker = null;

    thickOrThin.resetToDefault();

    const event = new CustomEvent("drawing-changed");
    canvas.dispatchEvent(event);
});

canvas.addEventListener("drawing-changed", () => {
    if (ctx != null) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const line of lines) {
            if (line instanceof StickerPreview && line === activeSticker) {
                ctx.save(); 
                ctx.translate(line.x, line.y); 
                line.display(ctx); 
                ctx.restore(); 
            } else {
                line.display(ctx); 
            }
        }

        if (!cursor.isDrawing && toolPreview) {
            toolPreview.display(ctx);
        }
    }
});

canvas.addEventListener("tool-moved", () => {
    if (ctx != null && !cursor.isDrawing) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const line of lines) {
            line.display(ctx);
        }

        if (stickerPreview) {
            stickerPreview.display(ctx);
        } else if (toolPreview) {
            toolPreview.display(ctx);
        }
    }
});

class Button {
    element: HTMLButtonElement;

    constructor(label: string, onClick: () => void) {
        this.element = document.createElement("button");
        this.element.innerHTML = label;
        this.element.addEventListener("click", onClick);
        app.append(this.element);
    }
}

new Button("clear", () => {
    if (ctx != null) {
        while (lines.length > 0) {
            redoStack.push(lines.pop()!); 
        }
        const event = new CustomEvent("drawing-changed");
        canvas.dispatchEvent(event);
    }
});

new Button("undo", () => {
    const lastLine = lines.pop();
    if (lastLine) {
        redoStack.push(lastLine);
        const event = new CustomEvent("drawing-changed");
        canvas.dispatchEvent(event);
    }
});

new Button("redo", () => {
    const lastRedo = redoStack.pop();
    if (lastRedo) {
        lines.push(lastRedo);
        const event = new CustomEvent("drawing-changed");
        canvas.dispatchEvent(event);
    }
});

new Button("thick", () => thickOrThin.setThickness(8));
new Button("thin", () => thickOrThin.setThickness(1));

const stickers = ["🫃", "🍔", "🌭"];

new Button("Custom", () => {
    const text = prompt("Custom sticker here", "😼");
    if (text != null) {
        stickers.push(text);
    }
    const customEmoji = stickers.slice(-1).pop() || "😼";
    const rotation = getRandomRotation();
    toolPreview = null;
    stickerPreview = new StickerPreview(cursor.x, cursor.y, customEmoji, rotation);

    const event = new CustomEvent("tool-moved");
    canvas.dispatchEvent(event);
});

new Button("Export", () => {
    const temp = document.createElement("canvas") as HTMLCanvasElement;
    temp.width = 1024;
    temp.height = 1024;
    const tempCtx = temp.getContext("2d");

    if (tempCtx) {
        tempCtx.fillStyle = "white";
        tempCtx.fillRect(0, 0, temp.width, temp.height);

        const scale = temp.width / canvas.width;
        tempCtx.scale(scale, scale);

        for (const line of lines) {
            line.display(tempCtx);
        }

        tempCtx.shadowBlur = 45 * scale;
        tempCtx.shadowColor = "rgb(220, 20, 157)";
        tempCtx.shadowOffsetX = 0;
        tempCtx.shadowOffsetY = 0;

        tempCtx.scale(1 / scale, 1 / scale);
        tempCtx.lineWidth = 4 * scale;       
        tempCtx.strokeStyle = "rgb(0, 0, 0)";
        tempCtx.strokeRect(0, 0, temp.width, temp.height);

        const downloadLink = document.createElement("a");
        const dataURL = temp.toDataURL("image/png");
        downloadLink.href = dataURL;
        downloadLink.download = "canvas_drawing.png";
        downloadLink.click();
    }
});

stickers.forEach((sticker) => {
    new Button(sticker, () => {
        const rotation = getRandomRotation();
        toolPreview = null;
        stickerPreview = new StickerPreview(cursor.x, cursor.y, sticker, rotation);

        const event = new CustomEvent("tool-moved");
        canvas.dispatchEvent(event);
    });
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

const thickOrThin = new thickness(3);