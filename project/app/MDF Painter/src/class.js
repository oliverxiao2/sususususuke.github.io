class MDFFigure extends HTMLElement {
    // Can define constructor arguments if you wish.
    constructor(container) {
        super();
        this.container = container;
        if (container instanceof HTMLElement){
            container.appendChild(this);

            this.type = "line";
            this.data = {};
            this.style = {view: "stack"};
            this.padding = 5;
            this.legendTableWidth = 300;
            this.axisLeft = new MDFFigureAxis(this);
            this.axisBottom = new MDFFigureAxis(this);

        }
        console.log(this, this.style);

        this.init();
    }

    draw() {
        // calculate the layout

        if (this.type === "line"){
            if (this.style.view === "stack"){
                // calculate the width of value axis

            }
        }


    }

    get width(){
        if (this.container instanceof HTMLElement) return this.container.clientWidth;
        else return 0;
    }

    get height(){
        if (this.container instanceof HTMLElement) return this.container.clientHeight;
        else return 0;
    }

    set width(val){
        this.style.width = val + "px";
    }

    set height(val){
        this.style.height = val + "px";
        console.log("height" ,val);
    }

    get axisLeftTotalWidth(){
        return 100;
    }

    get axisBottomTotalHeight(){
        return 100;
    }

    init(){
        this.style.display = "block";
        this.style.position = "relative";
        this.width = this.container.clientWidth;
        this.height= this.container.clientHeight;
    }
}
customElements.define("mdf-figure", MDFFigure);

class MDFFigureAxis extends HTMLElement{
    constructor (parent){
        super();
        this.parent = parent;
        this.position = "bottom";
        this.fromX = 0;
        this.toX = 0;
        this.fromY = 0;
        this.toY = 0;
        this.spine = {
            visibility: true,
            lineWidth: 1,
            color: "#000000",
        };
        this.tick = {
            visibility: true,
            lineWidth: 1,
            color: "#000000",
            size: 5,
            quantity: 2,
            minInterval: 100,
        };
        this.subTick = {
            visibility: true,
            lineWidth: 1,
            color: "#000000",
            size: 2,
            quantity: 2,
            minInterval: 50,
        };
        this.text = {
            visibility: true,
            color: "#000000",
            fontSize: 11,
            fontFamily: "Consolas",
        };

        if (parent instanceof HTMLElement){
            this.canvas        = document.createElement("canvas");
            parent.appendChild(this.canvas);
        }

        this.init();
    }

    draw() {
        if (this.canvas){
            const ctx = this.canvas.getContext("2d");
            let fromX, toX, fromY, toY;
            if (this.position === "bottom"){

                this.fromX = this.parent.axisLeftTotalWidth + this.parent.padding;
                this.toX = this.parent.width - this.parent.legendTableWidth - this.fromX - this.parent.padding;
                this.fromY = this.parent.height - this.parent.padding - this.parent.axisBottomTotalHeight;
                if (this.spine.visibility){
                    ctx.beginPath();
                    ctx.lineWidth = this.spine.lineWidth;
                    ctx.strokeStyle = this.spine.color;
                    ctx.moveTo(this.fromX, this.fromY);
                    ctx.lineTo(this.toX, this.fromY);
                    ctx.stroke();
                }
            }
        }
    }

    init(){
        this.canvas.style.display = "block";
        this.canvas.style.position = "absolute";
        this.canvas.style.left = 0;
        this.canvas.style.top = 0;
        this.canvas.width  = this.parent.width;
        this.canvas.height = this.parent.height;
    }
}
customElements.define("mdf-figure-axis", MDFFigureAxis);