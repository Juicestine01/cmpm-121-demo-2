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
let stickerPreview: StickerPreview | null = null; // New sticker preview
const redoStack: Array<Displayable> = [];
let activeSticker: StickerPreview | null = null;
let stickerOffset = { x: 0, y: 0 };


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

// Sticker preview class to render an emoji at the mouse location
class StickerPreview extends ToolPreview {
    emoji: string;

    constructor(x: number, y: number, emoji: string) {
        super(x, y, 15); // default radius for stickers
        this.emoji = emoji;
    }

    override display(ctx: CanvasRenderingContext2D) {
        ctx.font = "30px Arial";
        ctx.fillText(this.emoji, this.x - 15, this.y + 10);
    }
}

const cursor = { isDrawing: false, x: 0, y: 0 };

canvas.addEventListener("mousedown", (e) => {
    cursor.x = e.offsetX;
    cursor.y = e.offsetY;

    // Check if clicking on a sticker
    for (const line of lines) {
        if (line instanceof StickerPreview) {
            const dist = Math.sqrt((line.x - cursor.x) ** 2 + (line.y - cursor.y) ** 2);
            if (dist < line.radius) { // Assuming radius represents the clickable area
                activeSticker = line;
                
                // Calculate offset between cursor and sticker center
                stickerOffset.x = cursor.x - line.x;
                stickerOffset.y = cursor.y - line.y;
                return;
            }
        }
    }

    // If no sticker is selected, proceed with other drawing or placing new stickers
    if (stickerPreview) {
        // Place the sticker if stickerPreview is active
        const placedSticker = new StickerPreview(cursor.x, cursor.y, stickerPreview.emoji);
        lines.push(placedSticker);
        stickerPreview = null;
        
        const event = new CustomEvent("drawing-changed");
        canvas.dispatchEvent(event);
        return;
    }

    // Standard line drawing behavior
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
        // Update active sticker position with offset to keep it at the cursor tip
        activeSticker.x = x - stickerOffset.x;
        activeSticker.y = y - stickerOffset.y;

        // Trigger canvas update for live repositioning preview
        const event = new CustomEvent("drawing-changed");
        canvas.dispatchEvent(event);
    } else {
        // Update tool or sticker preview position and fire the event
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
    activeSticker = null; // Reset active sticker after drag

    thickOrThin.resetToDefault();

    const event = new CustomEvent("drawing-changed");
    canvas.dispatchEvent(event);
});

canvas.addEventListener("drawing-changed", () => {
    if (ctx != null) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const line of lines) {
            // Check if the line is a StickerPreview instance to access x and y properties
            if (line instanceof StickerPreview && line === activeSticker) {
                ctx.save(); // Save the context state
                ctx.translate(line.x, line.y); // Move context to the sticker's new position
                line.display(ctx); // Display the sticker at the translated position
                ctx.restore(); // Restore context to its original state
            } else {
                line.display(ctx); // Draw other elements normally
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

// Button class for consistent button creation
class Button {
    element: HTMLButtonElement;

    constructor(label: string, onClick: () => void) {
        this.element = document.createElement("button");
        this.element.innerHTML = label;
        this.element.addEventListener("click", onClick);
        app.append(this.element);
    }
}

// Clear, undo, and redo buttons
new Button("clear", () => {
    if (ctx != null) {
        lines.splice(0, lines.length);
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

// Stickers array and buttons
const stickers = ["🫃", "🍔", "🌭"];

new Button("Custom", () => {
    const text = prompt("Custom sticker here", "😼")
    if (text != null) {
        stickers.push(text)
    }
    const customEmoji = stickers.slice(-1).pop() || "😼"
    toolPreview = null;
    stickerPreview = new StickerPreview(cursor.x, cursor.y, customEmoji);

    const event = new CustomEvent("tool-moved");
    canvas.dispatchEvent(event);
})

stickers.forEach((sticker) => {
    new Button(sticker, () => {
        toolPreview = null; // Clear any existing line preview
        stickerPreview = new StickerPreview(cursor.x, cursor.y, sticker);

        const event = new CustomEvent("tool-moved");
        canvas.dispatchEvent(event);
    });
});

// Line thickness management class
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