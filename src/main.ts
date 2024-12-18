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

function dispatchCanvasEvent(eventName: string) {
    canvas.dispatchEvent(new Event(eventName));
  }

const state = {
    lines: [] as Displayable[],
    redoStack: [] as Displayable[],
    cursor: { isDrawing: false, x: 0, y: 0 },
    currentLine: null as lineOrPoint | null,
    toolPreview: null as ToolPreview | null,
    stickerPreview: null as StickerPreview | null,
    activeSticker: null as StickerPreview | null,
    stickerOffset: { x: 0, y: 0 },
  };
  


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


canvas.addEventListener("mousedown", (e) => {
    state.cursor.x = e.offsetX;
    state.cursor.y = e.offsetY;

    for (const line of state.lines) {
        if (line instanceof StickerPreview) {
            const dist = Math.sqrt((line.x - state.cursor.x) ** 2 + (line.y - state.cursor.y) ** 2);
            if (dist < line.radius) { 
                state.activeSticker = line;

                state.stickerOffset.x = state.cursor.x - line.x;
                state.stickerOffset.y = state.cursor.y - line.y;
                return;
            }
        }
    }

    if (state.stickerPreview) {
        const placedSticker = new StickerPreview(state.cursor.x, state.cursor.y, state.stickerPreview.emoji, state.stickerPreview.rotation);
        state.lines.push(placedSticker);
        state.stickerPreview = null;

        dispatchCanvasEvent("drawing-changed");
        return;
    }

    state.cursor.isDrawing = true;
    state.currentLine = new lineOrPoint([], thickOrThin.getThickness());
    state.currentLine.addPoint(state.cursor.x, state.cursor.y);
    state.redoStack.splice(0, state.redoStack.length);
    state.lines.push(state.currentLine);

    dispatchCanvasEvent("drawing-changed");
});


canvas.addEventListener("mousemove", (e) => {
    const x = e.offsetX;
    const y = e.offsetY;

    if (state.cursor.isDrawing && ctx != null) {
        ctx.beginPath();
        ctx.moveTo(state.cursor.x, state.cursor.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.closePath();
        state.cursor.x = x;
        state.cursor.y = y;
        state.currentLine?.addPoint(state.cursor.x, state.cursor.y);
        dispatchCanvasEvent("drawing-changed");
    } else if (state.activeSticker) {
        state.activeSticker.x = x - state.stickerOffset.x;
        state.activeSticker.y = y - state.stickerOffset.y;
        dispatchCanvasEvent("drawing-changed");
    } else {
        if (state.stickerPreview) {
            state.stickerPreview.setPosition(x, y);
        } else if (!state.toolPreview) {
            state.toolPreview = new ToolPreview(x, y, thickOrThin.getThickness() / 2);
        } else {
            state.toolPreview.setPosition(x, y);
            state.toolPreview.setRadius(thickOrThin.getThickness() / 2);
        }
        dispatchCanvasEvent("tool-moved");
    }
});

canvas.addEventListener("mouseup", (_e) => {
    state.cursor.isDrawing = false;
    state.currentLine = null;
    state.activeSticker = null;

    thickOrThin.resetToDefault();

    dispatchCanvasEvent("drawing-changed");
});

canvas.addEventListener("drawing-changed", () => {
    if (ctx != null) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const line of state.lines) {
            if (line instanceof StickerPreview && line === state.activeSticker) {
                ctx.save(); 
                ctx.translate(line.x, line.y); 
                line.display(ctx); 
                ctx.restore(); 
            } else {
                line.display(ctx); 
            }
        }

        if (!state.cursor.isDrawing && state.toolPreview) {
            state.toolPreview.display(ctx);
        }
    }
});

canvas.addEventListener("tool-moved", () => {
    if (ctx != null && !state.cursor.isDrawing) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const line of state.lines) {
            line.display(ctx);
        }

        if (state.stickerPreview) {
            state.stickerPreview.display(ctx);
        } else if (state.toolPreview) {
            state.toolPreview.display(ctx);
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
        while (state.lines.length > 0) {
            state.redoStack.push(state.lines.pop()!); 
        }
        dispatchCanvasEvent("drawing-changed");
    }
});

new Button("undo", () => {
    const lastLine = state.lines.pop();
    if (lastLine) {
        state.redoStack.push(lastLine);
        dispatchCanvasEvent("drawing-changed");
    }
});

new Button("redo", () => {
    const lastRedo = state.redoStack.pop();
    if (lastRedo) {
        state.lines.push(lastRedo);
        dispatchCanvasEvent("drawing-changed");
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
    state.toolPreview = null;
    state.stickerPreview = new StickerPreview(state.cursor.x, state.cursor.y, customEmoji, rotation);

    dispatchCanvasEvent("tool-moved");
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

        for (const line of state.lines) {
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
        state.toolPreview = null;
        state.stickerPreview = new StickerPreview(state.cursor.x, state.cursor.y, sticker, rotation);

        dispatchCanvasEvent("tool-moved");
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