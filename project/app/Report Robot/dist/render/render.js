const canvasStyleSheet = document.createElement('style');
canvasStyleSheet.innerHTML = 'canvas{position: absolute;}';
document.head.appendChild(canvasStyleSheet);
// ======================= plot ======================================== //
window.chart = function(container, viewmode){
  this.init(container);

  if (!$.globalStorage.blurSubscribers){
    $.globalStorage.blurSubscribers = [this];
  } else {
    $.globalStorage.blurSubscribers.push(this);
  }
};

chart.prototype.init = function(container, viewmode=0){
  const thisChart = this;

  this.status = 'idle';
  this.container = container?container:this.container;
  this.viewmode = viewmode;
  const width = this.width?this.width:this.container.clientWidth;
  const height= this.height?this.height:this.container.clientHeight;

  if (viewmode === 0){
    /*
      @ layer 40: cursor
      @ layer 30: plot
      @ layer 20: axis & grid
      @ layer 10: chart background
    */
    this.style = {
      'padding-top': 15.5,
      'padding-bottom': 5.5,
      'padding-left': 50.5,
      'padding-right': 5.5,
      'margin-area': 5,
      'width': width,
      'height': height,
      'drawingAreaSizeRatio': 0.7,
      fontFamily: 'Consolas',
      fontSize: '11px',
    };

    const drawingAreaSize = {
      'width':parseInt((width - this.style['padding-left'] - this.style['padding-right'] - this.style['margin-area'])*this.style['drawingAreaSizeRatio']),
      'height':parseInt((height - this.style['padding-top'] - this.style['padding-bottom'])),
    };

    this.wrapper = document.createElement('div');
    this.wrapper.setAttribute('name', 'wrapper-chart');
    this.wrapper.style.width = width;
    this.wrapper.style.height = height;
    this.wrapper.style.position = 'relative';
    this.wrapper.style.overflow = 'hidden';
    this.wrapper.style.border = '1px solid black';
    this.wrapper.style.zIndex = 10;
    this.wrapper.parentChart = this;
    this.container.appendChild(this.wrapper);
    // add event listener for wrapper
    this.wrapper.addEventListener('mousedown', function(evt){
      if ((evt.target.getAttribute('role') === 'plot-group') && thisChart.status === 'idle' && evt.buttons === 1 &&(!evt.altKey)) {
        thisChart.status = 'pan';
      } else if (evt.target.getAttribute('role') === 'plot-group' && evt.altKey == true && thisChart.vCursor.style.display == 'block') {
        const canvas = evt.target;
        const offsetX = evt.offsetX;
        const file = canvas.parentFile;
        const x = (offsetX - file.fromX) * (file.windowTimeDomain[1] - file.windowTimeDomain[0]) / (file.toX - file.fromX) + file.windowTimeDomain[0];
        file.cursor.push({
          time: x,
          style: {
            spineColor: 'rgb(255, 235, 59)',
            markerColor: 'rgb(255, 235, 59)',
            fontColor: 'black',
          },
          parent: file.cursor,
          parentFile: file,
          parentChart: thisChart,
        });
        for (const group of file.dataGroup){
          for (const channel of group.channels){
            channel.cursor.push({
              time: x,
              y: channel.floatCursorValue,
            });
          }
        }
        thisChart.plot.draw2(true);
      }
    }, false);

    this.wrapper.addEventListener('mouseup', function(evt){
      thisChart.status = 'idle';
    });
    /*****************************************************************
      fromX & fromY vs. dataMaxTimeDomain & valueDomain
      they coud both change the view, mainly panning and scaling.
      you should choose only one, and never use both of them mixly.
     *****************************************************************/
    this.wrapper.addEventListener('mousemove', function(evt){
      if (thisChart.status === 'pan'){
        // note: 如果直接在平移过的坐标系画布中进行clearRect操作，有些通道的曲线，例如nmote_w，会在两头，留下1像素的竖线
        const canvas = evt.target;
        canvas.repaint = true;
        if (canvas.getAttribute){
          if (canvas.getAttribute('role') === 'plot-group'){
            const file = canvas.parentFile;
            const group= canvas.parentGroup;
            const x0 = file.windowTimeDomain[0], x1 = file.windowTimeDomain[1];
            const y0 = group.groupValueDomain[0], y1 = group.groupValueDomain[1];

            file.repaint = true;

            let eachCanvas, ctx;
            for (const group of file.dataGroup){
              eachCanvas = group.canvas;
              ctx = eachCanvas.getContext('2d');
              ctx.resetTransform();
              ctx.clearRect(0, 0, eachCanvas.width, eachCanvas.height);
              ctx.restore();
              //ctx.translate(evt.movementX , eachCanvas.repaint?evt.movementY:0);
            }
            //file.fromX += evt.movementX;
            //file.toX += evt.movementX;
            //console.log(evt.movementX, evt.movementY);
            const offsetX = evt.movementX * (x1 - x0) / (file.toX - file.fromX);
            file.windowTimeDomain = [x0 - offsetX, x1 - offsetX];


            const offsetY = evt.movementY * (y1 - y0) / (group.toY - group.fromY);
            group.groupValueDomain = [y0 - offsetY, y1 - offsetY];
            thisChart.plot.draw2();
          }
        }
      }
      else if (evt.target.getAttribute('role') === 'plot-group') {
        const x = evt.offsetX, y = evt.offsetY;

        if (evt.altKey === true && x >=0 && x <= drawingAreaSize.width && y >= 0 && y <= drawingAreaSize.height){
          const vCursor = thisChart.vCursor;
          vCursor.style.left = x;
          vCursor.style.display = 'block';
          vCursor.innerHTML = '';
          let channelIndex = -1;
          let file, xCal, xReal, indexFound, indexEstimated;
          for (const filename in thisChart.plot.data){
            file = thisChart.plot.data[filename];

            xCal = interpolation(x, file.fromX, file.toX, file.windowTimeDomain[0], file.windowTimeDomain[1]);
            indexEstimated = parseInt((xCal - file.dataMaxTimeDomain[0]) / (file.dataMaxTimeDomain[1] - file.dataMaxTimeDomain[0]));
            for (const group of file.dataGroup){
              for (const channel of group.channels){
                channelIndex++;
                const timeArray = channel.timeArray;
                const valueArray = channel.valueArray;
                [indexFound, xReal] = searchIndex(timeArray, xCal, indexEstimated);
                const yReal = valueArray[indexFound];
                const y = group.fromY + (yReal - group.groupValueDomain[0]) / (group.groupValueDomain[1] - group.groupValueDomain[0]) * (group.toY - group.fromY);

                const theLabel = document.createElement('div');
                theLabel.style.position = 'absolute';
                theLabel.style.fontFamily = 'Consolas';
                theLabel.style.fontSize = '11px';
                theLabel.style.color = 'black';
                theLabel.style.left = 1;
                theLabel.style.top = channelIndex * 12;
                theLabel.innerText = channel.name + '=' + yReal.toFixed(2);
                vCursor.appendChild(theLabel);
                channel.floatCursorValue = valueArray[indexFound];
              }
            }
          }


        } else {
          thisChart.vCursor.style.display = 'none';
        }
      }
    });

    this.wrapper.addEventListener('click', function(evt){
      $.globalStorage.activeChart = thisChart;
      thisChart.focused = true;
      if (evt.target.getAttribute('role') === 'plot-group' && (!evt.altKey)){
        if (true){
          const offsetX = evt.offsetX;
          const file = evt.target.parentFile;
          const currentX = (offsetX - file.fromX) * (file.windowTimeDomain[1] - file.windowTimeDomain[0]) / (file.toX - file.fromX) + file.windowTimeDomain[0];
          let pixel, min, selectedCursorIndex;

          for (const [index, cursor] of file.cursor.entries()){
            pixel = Math.abs(cursor.time - currentX)/(file.windowTimeDomain[1] - file.windowTimeDomain[0]) * (file.toX - file.fromX);
            if ((!min) || pixel < min) {
              min = pixel;
              selectedCursorIndex = index;
            }
          }

          if (min < 5) {

            if (file.cursor[selectedCursorIndex].style.selected){
              $.globalStorage.selectedCursor = null;
            } else {
              $.globalStorage.selectedCursor = {
                cursorArray: file.cursor,
                index: selectedCursorIndex,
              };
            }

            for (const [index, cursor] of file.cursor.entries()){
              const style = cursor.style;
              if (index != selectedCursorIndex || style.selected){
                style.spineColor = 'rgb(255, 235, 59)';
                style.markerColor = 'rgb(255, 235, 59)';
                style.fontColor = 'black';
                style.selected = false;
              } else {
                style.spineColor = '#ff9800';
                style.markerColor = '#ff9800';
                style.fontColor = 'white';
                style.selected = true;
              }
            }


            thisChart.plot.draw2(1);
          }
        }
      }
    });

    this.layerOfPlot = document.createElement('div');
    this.layerOfPlot.parent = this;
    this.layerOfPlot.setAttribute('name', 'wrapper-chart-plotLayer');
    this.layerOfPlot.style.position = 'absolute';
    this.layerOfPlot.style.left =  this.style['padding-left'];
    this.layerOfPlot.style.top = this.style['padding-top'];
    this.layerOfPlot.style.width = (drawingAreaSize.width - 1);
    this.layerOfPlot.style.height = (drawingAreaSize.height - 1);
    this.layerOfPlot.style.zIndex = 30;
    this.wrapper.appendChild(this.layerOfPlot);

    this.layerOfPlot.addEventListener('mousewheel', function(evt){
      evt.preventDefault();
      const canvas = evt.target;
      if (canvas.getAttribute('role') === 'plot-group'){

        const x = evt.offsetX, y = evt.offsetY;
        const width = canvas.width, height = canvas.height;
        let scaleRatio;
        if (evt.deltaY > 0) scaleRatio = 0.8;
        else scaleRatio = 1.25;

        canvas.setAttribute('data-repaint', 'true');
        const file = canvas.parentFile;
        const group = canvas.parentGroup;
        file.repaint = true;

        /*const fromX = file.fromX;
        const toX = file.toX;
        const k = (x - fromX) / (toX - x);
        const toX_scaled = ((1 - scaleRatio)*fromX + (k + scaleRatio) * toX) / (1 + k);
        const fromX_scaled = toX_scaled - scaleRatio * (toX - fromX);
        file.fromX = fromX_scaled;
        file.toX = toX_scaled;*/
        const [x0, x1] = file.windowTimeDomain;
        const k = (x - file.fromX) / (file.toX - x);
        const x0_new = x0 + (x1 - x0)*(scaleRatio-1)*k/scaleRatio/(1+k);
        const x1_new = x1 - (x1 - x0)*(scaleRatio-1)/scaleRatio/(1+k);
        file.windowTimeDomain = [x0_new, x1_new];

        if (evt.shiftKey === true){
          // do not scale y axis!
        } else {
          /*const fromY = group.fromY;
          const toY = group.toY;
          const k = (y - fromY) / (toY - y);
          const toY_scaled = ((1 - scaleRatio)*fromY + (k + scaleRatio) * toY) / (1 + k);
          const fromY_scaled = toY_scaled - scaleRatio * (toY - fromY);
          group.fromY = fromY_scaled;
          group.toY = toY_scaled;*/
          const [y0, y1] = group.groupValueDomain;
          const k = (y - group.fromY) / (group.toY - y);
          const y0_new = y0 + (y1 - y0)*(scaleRatio-1)*k/scaleRatio/(1+k);
          const y1_new = y1 - (y1 - y0)*(scaleRatio-1)/scaleRatio/(1+k);
          group.groupValueDomain = [y0_new, y1_new];
        }

        let ctx;
        for (const group of file.dataGroup){
          ctx = group.canvas.getContext('2d');
          ctx.resetTransform();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }

        thisChart.plot.draw2();

      }
    },
    true);

    this.plot = new window.line();
    this.plot.parent = this;
    this.plot.container = this.layerOfPlot;

    this.layerOfAxis = document.createElement('div');
    this.layerOfAxis.setAttribute('name', 'wrapper-chart-axisLayer');
    this.layerOfAxis.style.width = width;
    this.layerOfAxis.style.height = height;
    this.layerOfAxis.style.zIndex = 21;
    this.wrapper.appendChild(this.layerOfAxis);

    this.layerOfCursor = document.createElement('div');
    this.layerOfCursor.setAttribute('name', 'wrapper-chart-cursorLayer');
    this.layerOfCursor.style.width = width;
    this.layerOfCursor.style.height = height;
    this.layerOfCursor.style.zIndex = 40;

    // axis bottom, bottom 和 top 有四个属性， 用于画grid网格线
    this.axisBottom = new axis();
    this.axisBottom.container = this.layerOfAxis;
    this.axisBottom.fromX = this.style['padding-left'];
    this.axisBottom.toX = this.axisBottom.fromX + drawingAreaSize.width;
    this.axisBottom.fromY = height - this.style['padding-bottom'];
    this.axisBottom.toY = this.style['padding-top'];
    this.axisBottom.parentChart = chart;
    //this.axisBottom.draw('bottom');

    // axis left
    this.axisLeft = new axis();
    this.axisLeft.container = this.layerOfAxis;
    this.axisLeft.fromX = this.style['padding-left'];
    this.axisLeft.toX = this.style['padding-left'] + drawingAreaSize.width;
    this.axisLeft.fromY = height - this.style['padding-bottom'];
    this.axisLeft.toY = this.style['padding-top'];
    this.axisLeft.parentChart = this;
    //this.axisLeft.draw('left');

    // axis top
    this.axisTop = new axis();
    this.axisTop.container = this.layerOfAxis;
    this.axisTop.style.showTick = false;
    this.axisTop.style.showText = false;
    this.axisTop.fromX = this.style['padding-left'];
    this.axisTop.toX = this.axisTop.fromX + drawingAreaSize.width;
    this.axisTop.fromY = this.style['padding-top'];
    this.axisTop.parentChart = this;
    //this.axisTop.draw('top');

    // axis right
    this.axisRight = new axis();
    this.axisRight.container = this.layerOfAxis;
    this.axisRight.style.showTick = false;
    this.axisRight.style.showText = false;
    this.axisRight.fromX = this.style['padding-left'] + drawingAreaSize.width;
    this.axisRight.fromY = height - this.style['padding-bottom'];
    this.axisRight.toY = this.style['padding-top'];
    this.axisRight.parentChart = this;
    //this.axisRight.draw('right');

    // vertical cursor
    this.vCursor = document.createElement('div');
    this.vCursor.setAttribute('role', 'vCursor');
    const vCursorStyle = this.vCursor.style;
    vCursorStyle.zIndex = 31;
    vCursorStyle.width = 300;
    vCursorStyle.height = drawingAreaSize.height;
    vCursorStyle.position = 'absolute';
    vCursorStyle.left = 0;
    vCursorStyle.top = 0;
    vCursorStyle.borderLeft = "2px solid red";
    vCursorStyle.opacity = 1;
    vCursorStyle.display = 'none';
    this.vCursor.parentChart = this;
    this.layerOfPlot.appendChild(this.vCursor);

    // legend table
    this.layerOfLegendTable = document.createElement('div');
    this.layerOfLegendTable.style.width = (width - this.style['padding-left'] - this.style['padding-right'] - this.style['margin-area'])*(1-this.style['drawingAreaSizeRatio']);
    this.layerOfLegendTable.style.height= drawingAreaSize.height;
    this.layerOfLegendTable.style.position = 'absolute';
    this.layerOfLegendTable.style.top = this.style['padding-top'];
    this.layerOfLegendTable.style.left= drawingAreaSize.width + this.style['padding-left'] + this.style['margin-area'];
    this.layerOfLegendTable.parentChart = this;
    this.wrapper.appendChild(this.layerOfLegendTable);

    // legend table
    this.legendTable = document.createElement('canvas');
    this.legendTable.width = 2*(width - this.style['padding-left'] - this.style['padding-right'] - this.style['margin-area'])*(1-this.style['drawingAreaSizeRatio']);
    this.legendTable.height= (drawingAreaSize.height)*2;
    this.legendTable.parentChart = this;
    this.layerOfLegendTable.appendChild(this.legendTable);

    /*const k = document.createElement('canvas');
    k.width = 400//(width - this.style['padding-left'] - this.style['padding-right'] - this.style['margin-area'])*(1-this.style['drawingAreaSizeRatio']);;
    k.height= 400; console.log(drawingAreaSize.height);//(drawingAreaSize.height)+0.5;
    k.style.left = 0;//drawingAreaSize.width + this.style['padding-left'] + this.style['margin-area'];
    k.style.top = 0;//this.style['padding-top'];
    this.wrapper.appendChild(k);
    k.getContext('2d').fillText('0 9 Hello World', 1, 30);*/
  }
};

chart.prototype.empty = function(){
  this.container.removeChild(this.wrapper);
  delete this.wrapper;
};

Object.defineProperty(chart.prototype, 'width', {
  get: function(){
    return this._width;
  },
  set: function(d){
    this._width = d;
  }
});

Object.defineProperty(chart.prototype, 'height', {
  get: function(){
    return this._height;
  },
  set: function(d){
    this._height = d;
  }
});

Object.defineProperty(chart.prototype, 'container', {
  get: function(){
    return this._container;
  },
  set: function(d){
    this._container = d;
  }
});

Object.defineProperty(chart.prototype, 'focused', {
  get: function(){
    this._focused;
  },
  set: function(d){
    this._focused = d;
    this.wrapper.style.boxShadow = d?'0 0px 8px 0px #9E9E9E':'';
  }
});
// ============================= axis ================================= //
window.axis = function(){
  this.init();
};

axis.prototype.init = function (){
  if (typeof this.domain == 'undefined') this.domain = [0, 9];
  if (typeof this.style == 'undefined'){
    this.style = {
      showAxis: true,
      axisWidth: 1,
      axisColor: '#000000',
      showTick:true,
      tickCount: 2,
      tickColor: '#000000',
      tickWidth: 1,
      tickSize:6,
      showText: true,
      textMode: 'sides',
      fontSize: 12,
      fontFamily:'Consolas',
      showGrid: false,
      gridWidth: 1,
      gridColor: '#EEEEEE',
      margin: 2,
    };
  }
};

axis.prototype.draw = function(position='bottom'){
  if (this.canvas && this.domain){
    let ctx = this.canvas.getContext('2d');

    if (this.style.showGrid){
      ctx.beginPath();
      ctx.lineWidth = this.style.gridWidth;
      ctx.strokeStyle = this.style.gridColor;

      for (let i = 0; i < this.style.tickCount; i++){
        if (position.match(/bottom/)){
          ctx.moveTo(
            this.fromX + parseInt(i*(this.toX - this.fromX)/(this.style.tickCount-1)),
            this.fromY
          );
          ctx.lineTo(
            this.fromX + parseInt(i*(this.toX - this.fromX)/(this.style.tickCount-1)),
            this.toY
          );
        } else if (position.match(/left/)) {
          ctx.moveTo(
            this.fromX,
            this.fromY + parseInt(i*(this.toY - this.fromY)/(this.style.tickCount-1))-1
          );
          ctx.lineTo(
            this.toX,
            this.fromY + parseInt(i*(this.toY - this.fromY)/(this.style.tickCount-1))-1
          );
        }

      }

      ctx.stroke();
    }

    if (this.style.showAxis){
      ctx.beginPath();
      ctx.lineWidth = this.style.axisWidth;
      ctx.strokeStyle = this.style.axisColor;

      if (position.match(/bottom|top/)){
        ctx.moveTo(this.fromX, this.fromY);
        ctx.lineTo(this.toX, this.fromY);
      } else if (position.match(/left|right/)) {
        ctx.moveTo(this.fromX, this.fromY);
        ctx.lineTo(this.fromX, this.toY);
      }

      ctx.stroke();
    }

    if (this.style.showTick){
      ctx.beginPath();
      ctx.lineWidth = this.style.tickWidth;
      ctx.strokeStyle = this.style.tickColor;

      for (let i = 0; i < this.style.tickCount; i++){
        if (position.match(/bottom|top/)){
          ctx.moveTo(
            this.fromX + parseInt(i*(this.toX - this.fromX)/(this.style.tickCount-1)),
            this.fromY
          );
          ctx.lineTo(
            this.fromX + parseInt(i*(this.toX - this.fromX)/(this.style.tickCount-1)),
            this.fromY + this.style.tickSize*((position==='bottom')?1:-1)
          );
        } else if (position.match(/left|right/)) {
          ctx.moveTo(
            this.fromX,
            this.fromY + parseInt(i*(this.toY - this.fromY)/(this.style.tickCount-1))
          );
          ctx.lineTo(
            this.fromX + this.style.tickSize*((position==='right')?1:-1),
            this.fromY + parseInt(i*(this.toY - this.fromY)/(this.style.tickCount-1))
          );
        }

      }

      ctx.stroke();
    }

    if (this.style.showText){
      if (this.style.textMode == 'sides') this.style.textCount = 2;

      ctx.font = this.style.fontSize + 'px ' + this.style.fontFamily;

      for (let i = 0; i < this.style.textCount; i++){
        const text = (this.domain[0] + i*(this.domain[1] - this.domain[0])/(this.style.textCount-1)).toLocaleString().substr(0, 5);
        if (position === 'bottom'){
          ctx.fillText(
            text,
            this.fromX + parseInt(i*(this.toX - this.fromX)/(this.style.textCount-1)) - parseInt(this.style.fontSize*text.length*0.3),
            this.fromY + this.style.tickSize + parseInt(this.style.fontSize*0.8)
          );
        } else if (position === 'top') {
          ctx.fillText(
            text,
            this.fromX + parseInt(i*(this.toX - this.fromX)/(this.style.textCount-1)) - parseInt(this.style.fontSize*text.length*0.3),
            this.fromY - this.style.tickSize - parseInt(this.style.fontSize*0.4)
          );
        } else if (position === 'left') {
          ctx.fillText(
            text,
            this.fromX - this.style.tickSize - parseInt(this.style.fontSize*text.length*0.6),
            this.fromY + parseInt(i*(this.toY - this.fromY)/(this.style.textCount-1)) + this.style.fontSize*0.3
          );
        } else if (position === 'right') {
          ctx.fillText(
            text,
            this.fromX + this.style.tickSize + parseInt(this.style.fontSize*0.15),
            this.fromY + parseInt(i*(this.toY - this.fromY)/(this.style.textCount-1)) + this.style.fontSize*0.3
          );
        }
      }
    }


  }
};

Object.defineProperty(axis.prototype, 'container', {
  get: function(){
    return this._container;
  },
  set: function(d){
    this._container = d;

    const width  = d.clientWidth,
        height = d.clientHeight;

    const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
    this.canvas = canvas;

    d.appendChild(canvas);
  }
});

Object.defineProperty(axis.prototype, 'fromX', {
  get: function(){
    return !this._fromX ? 0.5:this._fromX;
  },
  set : function(d){
    this._fromX = d;
  }
});

Object.defineProperty(axis.prototype, 'toX', {
  get: function(){
    return !this._toX ? this.canvas.width:this._toX;
  },
  set : function(d){
    this._toX = d;
  }
});

Object.defineProperty(axis.prototype, 'fromY', {
  get: function(){
    return !this._fromY ? this.canvas.height/2:this._fromY;
  },
  set : function(d){
    this._fromY = d;
  }
});

Object.defineProperty(axis.prototype, 'toY', {
  get: function(){
    return !this._toY ? 0:this._toY;
  },
  set : function(d){
    this._toY = d;
  }
});

Object.defineProperty(axis.prototype, 'domain', {
  get: function(){
    return !this._domain ? [0, 9]:this._domain;
  },
  set : function(d){
    this._domain = d;
  }
});

Object.defineProperty(axis.prototype, 'style', {
  get: function(){
    return this._style;
  },
  set : function(d){
    this._style = d;
  }
});

//===========================================================================//
HTMLCanvasElement.prototype.clear = function(){
  this.getContext('2d').clearRect(0, 0, this.width, this.height);
};
HTMLCanvasElement.prototype.clearAll = function(){
  this.getContext('2d').clearRect(-10000, -10000, this.width+10000, this.height+10000);
};
//===========================================================================//

window.line = function(){this.init();};

line.prototype.init = function(){

  this.style = {
    groupMargin: 10,
    strokeWidth: 2, // !important
    lineJoin: 'bevel',
    sampleRatio: 1,
    x_domain: [],
    y_domain: []
  };

  this.data = {};
  this.totalGroupCount = 0;
};

line.prototype.bindMDF = function(file, channels){
  // params example
  // channels: ['nmot', 'nmot_w'], ['rl_w'], ['B_ma', 'B_st']
  var self = this;
  console.time('bind');

  if (file.data.constructor.name === 'MDF'){
    var MDF = file.data;
    /*
    {
      "fileUID9784113_145643346": {
        fileUID: "fileUID9784113_145643346",
        dataGroup: [
          {
            "groupValueDomain": [500, 8000],
            "groupTimeDomain": [0, 2294],
            "channels":[
              {
                "name": "nmot_w",
                "timeArray": [...],
                "timeDomain": [1, 2000],
                "valueArray": [...],
                "valueDomain": [780, 5654],
              },
            ]
          },
        ],
        dataMaxTimeDomain: [0, 2500],
        currentWindowTimeDomain: [2000, 2400], // 目前实际显示的time轴起止时间
      },
    }
    */
    const fileUID = getFileUID(file);
    if (!this.data[fileUID]) {
      this.data[fileUID] = {
        fileUID: fileUID,
        dataGroup:[],
        dataMaxTimeDomain: [],
        windowTimeDomain: [],
        cursor: [],
        cursorSelected:  NaN,
        repaint: true,
        parentLine: this,
      };
    }

    const dotsNum = (this.toX - this.fromX)*this.style.sampleRatio;
    const groupCount = arguments.length -1;
    const groupHeight = (this.fromY - this.toY - this.style.groupMargin*(groupCount - 1))/groupCount;
    let channelIndex = -1;

    let r, needle, maxSharedTimeDomain; // 注意后面的子函数用了maxSharedTimeDomain变量，必须使用var声明

    for (var i = 1; i < arguments.length; i++){
      needle = arguments[i];

      if (needle.constructor.name === 'Array') {
        // 同组内的通道共享y轴
        const theGroup = {
          "groupTimeDomain" : [],
          "groupValueDomain": [],
          "channels": [],
        };

        let theCNBlock, totalTimeArray, totalTimeDomain, totalValueArray, totalValueDomain, valueArray, theTimeCNBlock, timeArray, time_domain, value_domain, shared_y_domain, shared_x_domain;

        for (const name of needle){
          if (name.match(/\\/)){
              const shortname = name.match(/^(.*)\\/)[1];

              r = MDF.searchChannelsByRegExp(new RegExp('^' + shortname + '\\\\'));
          } else {
            r = MDF.searchChannelsByRegExp(eval('/^' + name + '\\\\/')); // should use the accurate channel name
          }

          if (r.length > 0){

            theCNBlock = (r[0].rawDataArray.length == 0) ? MDF.readDataBlockOf(r[0], MDF.arrayBuffer):r[0];
            totalValueArray = ( ( typeof (theCNBlock.ccBlock.convert(theCNBlock.rawDataArray[0])) === 'string') ? theCNBlock.rawDataArray:theCNBlock.getPhysicalDataArray());
            valueArray = totalValueArray.resample(dotsNum);

            theTimeCNBlock = MDF.readDataBlockOf(theCNBlock.parent.cnBlocks[0], MDF.arrayBuffer);
            totalTimeArray = theTimeCNBlock.getPhysicalDataArray();
            timeArray = totalTimeArray.resample(dotsNum);

            time_domain  = [min(timeArray), max(timeArray)];
            totalTimeDomain = [min(totalTimeArray), max(totalTimeArray)];
            if (time_domain[0] == time_domain[1]) time_domain = [time_domain[0]*0.5, time_domain[0]*1.5];

            value_domain = [min(valueArray), max(valueArray)];
            if (value_domain[0] == value_domain[1]) value_domain = [value_domain[0]*0.5, value_domain[0]*1.5];

            if (!shared_x_domain) shared_x_domain = time_domain;
            else {
              shared_x_domain = [Math.min(shared_x_domain[0], time_domain[0]), Math.max(shared_x_domain[1], time_domain[1])];
            }

            if (!shared_y_domain) shared_y_domain = value_domain;
            else {
              shared_y_domain = [Math.min(shared_y_domain[0], value_domain[0]), Math.max(shared_y_domain[1], value_domain[1])];
            }

            if (!maxSharedTimeDomain) maxSharedTimeDomain = shared_x_domain;
            else maxSharedTimeDomain = [Math.min(maxSharedTimeDomain[0], shared_x_domain[0]), Math.max(maxSharedTimeDomain[1], shared_x_domain[1])];

            theGroup.channels.push({
              'name': name,
              'timeArray': timeArray,
              'valueArray': valueArray,
              'timeDomain': time_domain,
              'valueDomain': value_domain,
              'totalTimeArray': totalTimeArray,
              'totalValueArray': totalValueArray,
              'cursor': [],
            });

          }
        }

        theGroup.groupTimeDomain  = shared_x_domain;
        theGroup.groupValueDomain = shared_y_domain;
        // maybe there are more than one file. Here can't know the total group count.
        //theGroup.fromY = groupHeight - this.style.strokeWidth/2;
        //theGroup.toY = this.style.strokeWidth/2;

        this.data[fileUID].dataGroup.push(theGroup);
        this.totalGroupCount += 1;

      }
    }

    this.data[fileUID].dataMaxTimeDomain = maxSharedTimeDomain;
    this.data[fileUID].windowTimeDomain = maxSharedTimeDomain;
  }

  console.timeEnd('bind');
};

line.prototype.draw2 = function(drawMode = 0, viewmode=0){
  /* ===================================================
  drawMode = 0: no force repainting;
  drawMode = 1: repainting all;
  ====================================================== */
  console.time('draw');
  const filenames = Object.keys(this.data);
  const fileCount = filenames.length;
  const chart = this.parent;
  const axisLeft = chart.axisLeft,
        axisBottom = chart.axisBottom,
        axisTop = chart.axisTop,
        axisRight = chart.axisRight;
  const axisBottomHeight = axisBottom.style.fontSize + axisBottom.style.tickSize + axisBottom.style.margin;

  // update the drawingAreaSize
  this.height = chart.style.height - chart.style['padding-top'] - chart.style['padding-bottom'] - axisBottomHeight * fileCount;
  this.canvas.height = this.height;
  this.parent.layerOfPlot.style.height = this.height;

  const groupCount = this.totalGroupCount;
  const groupHeight= (this.height - this.style.groupMargin*(groupCount - 1))/groupCount;


  axisLeft.canvas.clear();
  axisBottom.canvas.clear();
  axisRight.canvas.clear();
  axisTop.canvas.clear();

  let channelIndex = -1, groupIndex = -1;

  const legendTableCanvas = chart.legendTable;
  legendTableCanvas.clear();
  const legendCtx = legendTableCanvas.getContext('2d');

  for (const [fileIndex, filename] of filenames.entries()){
    const file = this.data[filename];
    if (file.fromX === undefined) file.fromX = this.style.strokeWidth/2;
    if (file.toX === undefined) file.toX = this.width - this.style.strokeWidth/2;
    let axisBottomTickCount = parseInt(this.width/50),
        //niceTimeDomain = nice(file.dataMaxTimeDomain[0], file.dataMaxTimeDomain[1], axisBottomTickCount),
        timeDomain = file.windowTimeDomain;

    if (file.dataGroup.length > 0){
      let valueArray, timeArray, valueDomain;

      axisBottom.style.tickCount = axisBottomTickCount;
      axisBottom.domain = file.windowTimeDomain;
      axisRight.fromY = axisBottom.fromY = chart.style['padding-top'] + this.height + fileIndex * axisBottomHeight;
      axisBottom.draw('bottom');
      axisRight.draw('right');
      axisTop.draw('top');

      const groupMargin = this.style.groupMargin;
      const y2 = chart.style['padding-top'];
      const y1 = y2 + this.height;

      for (const group of file.dataGroup){
        groupIndex++;

        group.fromY = groupHeight - this.style.strokeWidth/2;
        group.toY = this.style.strokeWidth/2;

        const fromY = group.fromY;
        const toY = group.toY;

        // update value axis
        if (chart.viewmode === 0){
          axisLeft.domain = group.groupValueDomain;
          axisLeft.style.tickCount = parseInt(groupHeight/10) + 1;

          if (groupIndex < (groupCount-1)){
            axisLeft.fromY = y2 + parseInt((groupIndex+1)*groupHeight + groupIndex*groupMargin);
          } else {
            axisLeft.fromY = y1;
          }
          axisLeft.toY = axisLeft.fromY - groupHeight;

          // tick --> nice
          //const domainDiff = axisLeft.domain[1] - axisLeft.domain[0];
          //axisLeft.style.tickCount = parseInt(groupHeight/10);
          axisLeft.draw('left');
        }

        // add new canvas element
        let canvas, ctx, legendTable;
        if (true){
          if (group.canvas) group.canvas.parentNode.removeChild(group.canvas);
          // canvas of plot area of this group
          canvas = document.createElement('canvas');
          canvas.width = this.width;
          canvas.height= groupHeight;
          canvas.style.top = (groupHeight + groupMargin) * groupIndex;
          canvas.style.zIndex = 35;
          canvas.setAttribute('data-repaint', 'true');
          canvas.setAttribute('role', 'plot-group');
          canvas.parentFile = file;
          group.canvas = canvas;
          canvas.parentGroup = group;
          this.container.appendChild(canvas);

        } else {
          canvas = group.canvas;
        }

        if (file.repaint || canvas.repaint || drawMode == 1){

          ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (chart.viewmode === 0){
            valueDomain = group.groupValueDomain;

            for (const channel of group.channels){
              channelIndex ++;

              if (!channel.color) channel.color = color(channelIndex);

              ctx.beginPath();
              ctx.strokeStyle = channel.color;
              ctx.lineWidth = this.style.strokeWidth;
              ctx.lineJoin = this.style.lineJoin;

              valueArray = channel.valueArray;
              timeArray = channel.timeArray;

              // Ready? Go! Firstly, move to the first point.
              let startDrawing = false;
              const [domainMin, domainMax] = timeDomain;
              const [yMin, yMax] = valueDomain;
              const r = 4;
              const windowDataIndex = [];
              let xi, yi, nextIndex;
              for (let i = 0; i < timeArray.length; i++) {
                nextIndex = (i < timeArray.length-1)?(i+1):(timeArray.length-1);
                if (timeArray[nextIndex] >= domainMin && timeArray[nextIndex] <= domainMax){
                  xi = interpolation(timeArray[i], domainMin, domainMax, file.fromX, file.toX),
                  yi = interpolation(valueArray[i], yMin, yMax, fromY, toY);

                  if (!startDrawing){startDrawing = true; ctx.moveTo(xi, yi);}
                  else {ctx.lineTo(xi, yi);}

                  windowDataIndex.push({i, xi, yi});
                } else {
                  if (startDrawing){
                    xi = interpolation(timeArray[i], domainMin, domainMax, file.fromX, file.toX),
                    yi = interpolation(valueArray[i], yMin, yMax, fromY, toY);
                    ctx.lineTo(xi, yi);
                    ctx.lineTo(
                      interpolation(timeArray[nextIndex], domainMin, domainMax, file.fromX, file.toX),
                      interpolation(valueArray[nextIndex], yMin, yMax, fromY, toY)
                    );
                    windowDataIndex.push({i, xi, yi});
                    break;
                  }
                }
              }
              ctx.stroke();

              if (windowDataIndex.length < canvas.width/10){
                ctx.beginPath();
                ctx.fillStyle = channel.color;
                for (let i = 0; i < windowDataIndex.length; i++) {
                  ctx.moveTo(windowDataIndex[i].xi+r, windowDataIndex[i].yi);
                  ctx.arc(windowDataIndex[i].xi, windowDataIndex[i].yi, r, 0, Math.PI*2);
                }
                ctx.fill();
              }
              /*ctx.moveTo(
                interpolation(timeArray[0], timeDomain[0], timeDomain[1], file.fromX, file.toX),
                interpolation(valueArray[0], valueDomain[0], valueDomain[1], fromY, toY)
              );

              for (let j = 1; j < valueArray.length; j++) {
                ctx.lineTo(
                  interpolation(timeArray[j], timeDomain[0], timeDomain[1], file.fromX, file.toX),
                  interpolation(valueArray[j], valueDomain[0], valueDomain[1], fromY, toY)
                );
              }*/

            }


            ctx.save();
          }
          canvas.repaint = false;
        }

        // refresh the legendTable
        if (true){
          for(const [i, channel] of group.channels.entries()){
            const offsetY = groupIndex*(groupHeight+groupMargin)+i*14;
            legendCtx.fillStyle = channel.color;
            legendCtx.fillRect(0, offsetY + 3, 11, 11);

            legendCtx.font = '11px Consolas';
            legendCtx.fillStyle = 'black';
            legendCtx.textBaseline = 'top';
            legendCtx.fillText(channel.name, 18, offsetY);

            legendCtx.fillStyle = 'black';
            for (const [i, cursor] of channel.cursor.entries()){
              if (cursor.y != undefined){
                const theValue = cursor.y.toPrecision(2);
                legendCtx.fillText(theValue, 41 + (i+1)*52, offsetY);
              }
            }
          }
        }

        // refresh the legendTable end

      }
    }

    if (file.cursor){
      const canvas = file.parentLine.canvas;
      const ctx = canvas.getContext("2d");
      ctx.lineWidth = 2;
      let x1, y1 = canvas.height, y2 = 0, r = 8;
      for (const [index, cursor] of file.cursor.entries()){
        x1 = file.fromX + (cursor.time - file.windowTimeDomain[0]) / (file.windowTimeDomain[1] - file.windowTimeDomain[0]) * (file.toX - file.fromX);

        ctx.beginPath();
        ctx.strokeStyle = cursor.style.spineColor?cursor.style.spineColor:'rgb(255, 235, 59)';
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = cursor.style.markerColor?cursor.style.markerColor:'rgb(255, 235, 59)';
        ctx.arc(x1, r + 3, r, 0, Math.PI*2);
        ctx.fill();

        ctx.beginPath();
        ctx.font = '11px Consolas';
        ctx.fillStyle = cursor.style.fontColor?cursor.style.fontColor:'black';
        //ctx.font = file.parentLine.parent.style.fontSize +  ' ' +file.parentLine.parent.style.fontFamily;
        ctx.textBaseline = 'top';
        ctx.fillText(''+index, x1 - 4, y2 + 4);
        ctx.fill();
      }
    }
    file.repaint = false;
  }
  legendCtx.fillText('', 0, 0);
  console.timeEnd('draw');
};

line.prototype.update = function(){
  let data = this.data;
};

line.prototype.clear = function(){
  const filenames = Object.keys(this.data);
  let dataGroup;
  for (const filename of filenames){
    dataGroup = this.data[filename].dataGroup;

    for (const group of dataGroup){
      group.canvas.parentFile.repaint = true;
      if (group.canvas){
        this.container.removeChild(group.canvas);
        delete group.canvas;
      }
    }
  }
};

Object.defineProperty(line.prototype, 'container', {
  get: function(){
    return this._container;
  },
  set : function(d){
    this._container = d;

    const width  = d.clientWidth,
        height = d.clientHeight;

    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;

    this.width = width;
    this.height = height;
    this.canvas = canvas;

    d.appendChild(canvas);
  }
});

Object.defineProperty(line.prototype, 'data', {
  get: function(){
    return this._data;
  },
  set: function(d){
    this._data = d;
  }
});

Object.defineProperty(line.prototype, 'totalGroupCount', {
  get: function(){
    let n = 0;
    const filenames = Object.keys(this.data);
    for (const filename of filenames){
      if (filename.substr(0, 8) === "fileUID_"){
        n += this.data[filename].dataGroup.length;
      }
    }
    return n;
  },
  set: function(d){
    return;
  }
});

Object.defineProperty(line.prototype, 'dataLayout', {
  get: function(){
    return this._dataLayout?this._datalayout:{};
  },
  set: function(d){
    this._dataLayout = d;
  }
});

Object.defineProperty(line.prototype, 'fromX', {
  get: function(){
    return !this._fromX ? 0.5:this._fromX;
  },
  set : function(d){
    this._fromX = d;
  }
});

Object.defineProperty(line.prototype, 'toX', {
  get: function(){
    return !this._toX ? this.canvas.width:this._toX;
  },
  set : function(d){
    this._toX = d;
  }
});

Object.defineProperty(line.prototype, 'fromY', {
  get: function(){
    return !this._fromY ? this.canvas.height:this._fromY;
  },
  set : function(d){
    this._fromY = d;
  }
});

Object.defineProperty(line.prototype, 'toY', {
  get: function(){
    return !this._toY ? 0:this._toY;
  },
  set : function(d){
    this._toY = d;
  }
});

Object.defineProperty(line.prototype, 'style', {
  get: function(){
    return this._style;
  },
  set : function(d){
    this._style = d;
  }
});

function exportAllCanvas(container, width, height){
  const allCanvas = container.querySelectorAll('canvas');
  width = container.clientWidth;
  height= container.clientHeight;
  const total = document.createElement('canvas');
  total.width = width;
  total.height = height;

  let left, top, left_parent, top_parent;
  for (const canvas of allCanvas){
    left = parseFloat(canvas.style.left);
    top = parseFloat(canvas.style.top);
    left = left?left:0;
    top = top?top:0;

    const box = canvas.parentElement;
    left_parent = parseFloat(box.style.left);
    top_parent = parseFloat(box.style.top);
    left_parent = left_parent?left_parent:0;
    top_parent = top_parent?top_parent:0;
    total.getContext('2d').drawImage(canvas, Math.ceil(left+left_parent), Math.ceil(top+top_parent));
  }

  return total.toDataURL('img/png');
};

// function of generate unique ID of file
function getFileUID(file){
  let returnValue = 'fileUID_';
  if (file.constructor.name === 'File'){
    const filename = file.name;
    for (let i = 0; i < filename.length; i++) {
      returnValue += filename.charCodeAt(i);
    }
    returnValue += ('_' + file.lastModified);
  }

  return returnValue;
};

function nice(cormin, cormax, cornumber){
  var tmpmax,tmpmin, corstep, tmpstep, tmpnumber, temp, extranumber;
  if(cormax <= cormin) return;
  corstep=(cormax-cormin)/cornumber;
  if(Math.pow(10,parseInt(Math.log(corstep)/Math.log(10)))==corstep){
    temp = Math.pow(10,parseInt(Math.log(corstep)/Math.log(10)));
  } else {
    temp = Math.pow(10,(parseInt(Math.log(corstep)/Math.log(10))+1));
  }
  tmpstep = (corstep/temp).toFixed(6);
  //选取规范步长
  if(tmpstep>=0&&tmpstep<=0.1){
    tmpstep = 0.1;
  } else if(tmpstep>=0.100001&&tmpstep<=0.2){
    tmpstep = 0.2;
  } else if(tmpstep>=0.200001&&tmpstep<=0.25){
    tmpstep = 0.25;
  } else if(tmpstep>=0.250001&&tmpstep<=0.5){
    tmpstep = 0.5
  } else {
    tmpstep = 1;
  }
  tmpstep = tmpstep * temp;
  if(parseInt(cormin/tmpstep)!=(cormin/tmpstep)){
    if(cormin<0){
      cormin = (-1) * Math.ceil(Math.abs(cormin/tmpstep))*tmpstep;
    }else{
      cormin = parseInt(Math.abs(cormin/tmpstep))*tmpstep;
    }
  }
  if(parseInt(cormax/tmpstep)!=(cormax/tmpstep)){
    cormax = parseInt(cormax/tmpstep+1)*tmpstep;
  }
  tmpnumber = (cormax-cormin)/tmpstep;
  if(tmpnumber<cornumber){
    extranumber = cornumber - tmpnumber;
    tmpnumber = cornumber;
    if(extranumber%2 == 0){
      cormax = cormax + tmpstep*parseInt(extranumber/2);
    } else {
      cormax = cormax + tmpstep*parseInt(extranumber/2+1);
    }
    cormin = cormin - tmpstep*parseInt(extranumber/2);
  }
  cornumber = tmpnumber;
  return [cormin, cormax];
};

function searchIndex(array, xi, startIndex){
  let step, i = startIndex;
  if (xi > array[startIndex]){
    step = 1;
  } else if (xi < array[startIndex]) {
    step = -1;
  } else {return [startIndex, array[startIndex]];}

  while ((xi-array[i])*step > 0) {
    i = i + step;
  }

  if (Math.abs(xi - array[i]) <= Math.abs(xi - array[i - step])) {
    return [i, array[i]];
  } else {
    return [i - step, array[i - step]];
  }
};

function interpolation(xi, x0, x1, y0, y1){
  return y0 + (xi - x0)*(y0 - y1)/(x0 - x1);
};

function color(index, mode){
  if (!mode) mode = 'normal';

  let lib = [
    '#c53929',
    '#3367d6',
    '#0b8043',
    '#f09300',
    '#7b1fa2',
    '#0097a7',
    '#5d4037'
  ];

  if (mode === 'normal'){
    return lib[index % (lib.length)];
  }
};

Array.prototype.resample = function(targetNum){
  const sourceNum = this.length;
  if (targetNum < sourceNum){
    const sampleInterval = (sourceNum - 1)/(targetNum - 1);
    let tempResult = [];
    for (let i=0; i<=sourceNum; i+=sampleInterval){
      tempResult.push(this[Math.round(i)]);
    }
    return tempResult;
  } else {
    return this;
  }
};

function min(array){
  if (array.constructor.name === 'Array'){
    let returnValue = Infinity;
    for (const i of array){
      if (i < returnValue) returnValue = i;
    }
    return returnValue;
  }
};

function max(array){
  if (array.constructor.name === 'Array'){
    let returnValue = -Infinity;
    for (const i of array){
      if (i > returnValue) returnValue = i;
    }
    return returnValue;
  }
};

$(document).click(function(e){
  const charts = $.globalStorage.charts;
  if (charts){
    const target = e.target;
    let box;
    for (const subscriber of charts){
      box = subscriber.contains?subscriber:(subscriber.wrapper?subscriber.wrapper:null);
      if (box.contains){
        // there may be a bug, when click fixed curve, the returned target has not parentNode
        if (box.contains(target) || target.getAttribute('role')==='plot-group') subscriber.focused = true;
        else {
          subscriber.focused = false;
        }
      }
    }
  }
});

///////////////////////////////////////////////////////////////////////////////
window.pagedDoc = function(option){
    this.init(option);
    const pagedDocStyle = document.createElement('style');
    pagedDocStyle.innerHTML = `
    .page-shadow{box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.4);}
    .doc-page{overflow: hidden; font-family: "Segoe UI", "宋体"; font-size: 14pt;}
    .doc-page-body{border-top: 1px dashed #999; border-bottom: 1px dashed #999;}
    .doc-page-header, .doc-page-footer{background: whitesmoke;opacity: 0.5;}
    `;
    document.head.appendChild(pagedDocStyle);
};

pagedDoc.prototype.init = function(option){
    let defaultSetting = {
        container: document.body,
        pageSize: 'A4',
        hasTitlePage: true,
        margin: '2.54cm 3.17cm 2.54cm 3.17cm',
        marginTop: '2.54cm',
        marginBottom: '2.54cm',
        marginLeft: '1.5cm',
        marginRight: '1.5cm',
        headerMarginTop: '1.5cm',
        footerMarginBottom: '1.5cm',
        defaultFontFamily: 'Segoe UI',
        defaultFontSize: '14pt',
    };
    this.setting = $.extend(defaultSetting, option);
    this.wrapper = document.createElement('div');
    this.wrapper.style.display = 'flex';
    this.wrapper.style.flexDirection = 'column';
    this.wrapper.style.alignItems = 'center';
    this.wrapper.style.width = '100%';
    this.wrapper.style.height = '100%';
    this.wrapper.style.overflowY = 'scroll';
    this.setting.container.appendChild(this.wrapper);
    this.append();
};

pagedDoc.prototype.append = function(){
  let newPage = document.createElement('div'),
      newPageHeader = document.createElement('div'),
      newPageBody = document.createElement('div'),
      newPageFooter = document.createElement('div');

  newPage.className = 'page-shadow doc-page';
  newPageHeader.className = 'doc-page-header';
  newPageBody.className = 'doc-page-body';
  newPageFooter.className = 'doc-page-footer';

  newPage.style.display = 'flex';
  newPage.style.flexDirection = 'column';
  newPage.style.border = '1px solid #DDD';
  newPage.style.margin = '20px';
  newPage.style.boxSizing = newPageHeader.style.boxSizing = newPageBody.style.boxSizing = newPageFooter.style.boxSizing = 'border-box';
  newPage.setAttribute('role', 'page');
  newPageHeader.setAttribute('role', 'page-header');
  newPageFooter.setAttribute('role', 'page-footer');
  newPageBody.setAttribute('role', 'page-body');
  newPageBody.style.flexGrow = 1;

  newPageHeader.setAttribute('contenteditable', 'true');
  newPageBody.setAttribute('contenteditable', 'true');
  newPageFooter.setAttribute('contenteditable', 'true');

  newPage.appendChild(newPageHeader);
  newPage.appendChild(newPageBody);
  newPage.appendChild(newPageFooter);
  this.wrapper.appendChild(newPage);

  if (this.setting.pageSize === 'A4'){
    newPage.style.width  = newPageHeader.style.width = newPageFooter.style.width = newPageBody.style.width = "210mm";
    newPage.style.minHeight = "297mm";
  }

  newPageHeader.style.minHeight = this.setting.marginTop;
  newPageFooter.style.minHeight = this.setting.marginBottom;

  newPageBody.style.paddingLeft  = newPageHeader.style.paddingLeft  = newPageFooter.style.paddingLeft = this.setting.marginLeft;
  newPageBody.style.paddingRight = newPageHeader.style.paddingRight = newPageFooter.style.paddingRight = this.setting.marginRight;
  newPageHeader.style.paddingTop = this.setting.headerMarginTop;
  newPageFooter.style.paddingBottom = this.setting.footerMarginBottom;
};

pagedDoc.prototype.save = function(){
  this.content = {
    headerFooter: {
      firstHeader: '',
      firstFooter: '',
      header: '',
      footer: '',
    },
    pageBody: [],
    MDFCharts: [],
  };
  const pages = $(this.wrapper).find('div[role=page]');
  let page, pageBody, pageBodyHTML, n = pages.length, totalChartIndex = 0;
  for (let i = 0; i < n; i++){
    page = $(pages[i]);
    // add width for table td to fix the layout
    page.find('table').each(function(){
      $(this).find('td').each(function(){
        $(this).width($(this).width());
      });
    });

    pageBody = page.find('div[role=page-body]:first');
    pageBodyHTML = pageBody.html();

    if ( i === 0 && this.setting.hasTitlePage && n > 1 ){
      this.content.headerFooter.firstHeader = page.find('div[role=page-header]:first').html();
      this.content.headerFooter.firstFooter = page.find('div[role=page-footer]:first').html();
    } else if (( i === 1 && this.setting.hasTitlePage && n > 1 ) || (i===0 && ((!this.setting.hasTitlePage) || n === 1))) {
      this.content.headerFooter.header = page.find('div[role=page-header]:first').html();
      this.content.headerFooter.footer = page.find('div[role=page-footer]:first').html();
    }

    const MDFChartsOnThisPage = pageBody.find('div[name=wrapper-chart]');
    for (let j = 0; j < MDFChartsOnThisPage.length; j++){
      totalChartIndex++;
      const theChartBase64 = exportAllCanvas(MDFChartsOnThisPage[j]).substr(22);
      this.content.MDFCharts.push({
        base64: theChartBase64,
        chartIndex: totalChartIndex,
      });

      pageBodyHTML = pageBodyHTML.replace(MDFChartsOnThisPage[j].outerHTML, '<img src="report_files\/chart'+totalChartIndex+'.png">');
    }

    this.content.pageBody.push({
      pageIndex:i,
      html: pageBodyHTML
    });

  }
};

pagedDoc.prototype.export = function(type='word'){
  if (type === 'word'){
    const boundary = '----=_NextPart_GREEDY.GOBLINS.SHOW.ME.THE.MONEY';

    let MHTML = this.MHTMLTemplate;

    let pageSize = '210mm 297mm';
    if (this.setting.pageSize === 'A4'){
      pageSize = '210mm 297mm';
    }

    let pageMargin = '2.54cm 1cm 2.54cm 1cm';
    pageMargin = this.setting.marginTop + ' ' +
                 this.setting.marginRight + ' ' +
                 this.setting.marginBottom + ' ' +
                 this.setting.marginLeft;

    let pages = this.content.pageBody;
    let bodyHTML, fh1, h1, ff1, f1;
    bodyHTML = fh1 = h1 = ff1 = f1 = '';

    for (let i = 0; i < pages.length  - 1; i++){
      bodyHTML += pages[i].html + '\n' + '<br clear=all style="mso-special-character:line-break;page-break-before:always">' + '\n';
    }
    bodyHTML += pages[pages.length-1].html;

    if (this.setting.hasTitlePage){
      fh1 = '<div style="mso-element:header;" id="fh1">'+ this.content.headerFooter.firstHeader + '</div>';
      ff1 = '<div style="mso-element:footer;" id="ff1">'+ this.content.headerFooter.firstFooter + '</div>';
    }

    h1 = '<div style="mso-element:header;" id="h1">' + this.content.headerFooter.header + '</div>';
    f1 = '<div style="mso-element:footer;" id="f1">' + this.content.headerFooter.footer + '</div>';

    let imageHTML = '';
    const charts = this.content.MDFCharts;
    for (const chart of charts){
      imageHTML += '\n--' + boundary + '\n';
      imageHTML += 'Content-Location: file:\/\/\/C:\/report_files\/chart'+ chart.chartIndex + '.png' + '\n';
      imageHTML += 'Content-Transfer-Encoding: base64' + '\n';
      imageHTML += 'Content-Type: image/png' + '\n';
      imageHTML += '\n';
      imageHTML += chart.base64 + '\n';
      imageHTML += '\n';
    }

    MHTML = MHTML.replace(/\{\{\$boundary\$\}\}/g, boundary)
                 .replace('{{$titlePage$}}', (this.setting.hasTitlePage && pages.length > 1)?'yes':'no')
                 .replace('{{$pageSize$}}', pageSize)
                 .replace('{{$pageMargin$}}', pageMargin)
                 .replace('{{$body$}}', bodyHTML)
                 .replace('{{$firstHeader$}}', fh1)
                 .replace('{{$firstFooter$}}', ff1)
                 .replace('{{$generalHeader$}}', h1)
                 .replace('{{$generalFooter$}}', f1)
                 .replace('{{$images$}}', imageHTML);

    if (saveAs){
      saveAs(new Blob([MHTML], {type:"text/html; charset=utf-8"}), 'Report.doc');
    }
  }
  else if (type === 'json'){
    if(saveAs){
      saveAs(new Blob([JSON.stringify(this.content, null, '\t')], {type: "text/plain; charset=utf-8"}), 'report_template.json')
    }
  }
};



pagedDoc.prototype.MHTMLTemplate = `
MIME-Version: 1.0
Content-Type: multipart/related; boundary="{{$boundary$}}"

--{{$boundary$}}
Content-Location: file:\/\/\/c:\/report.htm
Content-Type: text/html; charset="utf-8"

<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head>
<meta charset="utf-8" content="text/html; charset=utf-8">
<xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml>
<style>
body {
font-family: "Segoe UI", "宋体";
font-size: 12pt;
}
@page Section1{
size: {{$pageSize$}};
margin: {{$pageMargin$}};
mso-first-header: url("report_files/headerfooter.htm") fh1;
mso-header: url("report_files/headerfooter.htm") h1;
mso-first-footer: url("report_files/headerfooter.htm") ff1;
mso-footer: url("report_files/headerfooter.htm") f1;
mso-title-page: {{$titlePage$}};
}
div.Section1 {page:Section1;}
</style>
</head>
<body>
<div class=Section1>
{{$body$}}
</div>
</body>
</html>

--{{$boundary$}}
Content-Location: file:\/\/\/c:\/report_files/headerfooter.htm
Content-Type: text/html; charset="utf-8"

<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<meta charset="utf-8" content="text/html; charset=utf-8">
<head>
<style>
body {
font-family: "Segoe UI", "宋体";
}
</style>
</head>
<body>
{{$firstHeader$}}
{{$generalHeader$}}
{{$firstFooter$}}
{{$generalFooter$}}
</body>
</html>

{{$images$}}

--{{$boundary$}}--
`;

(function(){
  $.fn.pluginName = function(option){
    var defaultSetting = {};
    var setting = $.extend(defaultSetting, option);

    // core
    this.css("color", setting.colorStr).css("fontSize", setting.fontSize+"px");

    return this;
  }
}(jQuery));
///////////////////////////////////////////////////////////////////////////////
$.globalStorage = {
    selectedFileExplorerNode: null,
    selectedFileExplorerFile: null,
    files: {},
    range: null,
    charts: [],
    activeChart: null,
    selectedCursor: null,
    pagedDoc: new pagedDoc({container: $('#tab-document')[0]}),
    pagedDocTemplateQuery: [],
};

/*

*/
$('#mm-fontSize').click(function(e){
  console.log(e, this);
  const fontSize = e.target.innerText;
  const el = $.globalStorage.range.commonAncestorContainer;

  if (el){
    el.parentNode.style.fontSize = fontSize;
  }
});


$('#file-explorer').tree({
    onClick: function (node) {
        $.globalStorage.selectedFileExplorerNode = node;

        if (node.text.match(/\.dat$/)){
            if ($.globalStorage.files[node.text]){
                const file = $.globalStorage.files[node.text];
                $.globalStorage.selectedFileExplorerFile = file;

                const mdf = file.data;
                const channels = mdf.searchChannelsByRegExp(/.*/);
                let data = [];
                for (const channel of channels){
                    data.push({
                        label: channel.shortSignalName,
                        value: channel.shortSignalName,
                        //sampleRate: channel.samplingRate,
                    });

                }
                $('#w-document-chart-data-input-manual').tagbox({
                    data: data,
                })
            }
        }
    },
});

$('#input-file').change(function(){
    const files = this.files;

    for (const file of files){
        const filenames = Object.keys($.globalStorage.files);
        if (filenames.indexOf(file.name) === -1){
            let fileType = '';
            let _m = file.name.match(/\.([\w]+)$/);
            if (_m && (typeof _m[1] === 'string')) fileType = _m[1].toUpperCase();

            if (fileType.match(/DAT|MDF/)){
                const reader = new FileReader;
                reader.readAsArrayBuffer(file);
                reader.onload = function(e){
                    const arraybuffer = e.target.result;
                    const mdf = new MDF(arraybuffer, false);

                    if (mdf){
                        $('#file-explorer').tree('append', {
                            parent: $.globalStorage.selectedFileExplorerNode?$.globalStorage.selectedFileExplorerNode.target:null,
                            data:[{text: file.name}],
                        });

                        file.data = mdf;
                        $.globalStorage.files[file.name] = file;
                    }
                }
            }
            else if (fileType.match(/JSON/)){
              const reader = new FileReader;
              reader.readAsText(file);
              reader.onload = function(e){
                  const text = e.target.result;
                  const json = JSON.parse(text);

                  if (json){
                      $('#file-explorer').tree('append', {
                          parent: $.globalStorage.selectedFileExplorerNode?$.globalStorage.selectedFileExplorerNode.target:null,
                          data:[{text: file.name}],
                      });

                      file.data = json;
                      $.globalStorage.files[file.name] = json;
                      $.globalStorage.pagedDocTemplateQuery.push(json);
                  }
              }
            }
        } else {
            alert('该文件已存在');
        }

    }
});

$('#fm-contextmenu-import').click(function(){
    const fileExplorer = $('#file-explorer');
    let node = fileExplorer.tree('getSelected');
    fileExplorer.tree('expand',node.target);

    $.globalStorage.selectedFileExplorerNode = node;
    let input = $('#input-file');
    input.click();
});

$('#fm-contextmenu-append').click(function(){
    "use strict";
    const t = $('#file-explorer');
    const node = t.tree('getSelected');
    t.tree('append', {
        parent: (node?node.target:null),
        data: [{
            text: 'new item1'
        },{
            text: 'new item2'
        }]
    });
});

$('#fm-contextmenu-remove').click(function(){
    const fileExplorer = $('#file-explorer');
    const node = fileExplorer.tree('getSelected');
    fileExplorer.tree('remove', node.target);
});

$('#tab-document').bind('contextmenu', function(e){
    e.preventDefault();
    $('#mm-document').menu('show', {
        left: e.pageX,
        top: e.pageY
    });
    })
.click(function(){
if (window.getSelection){
    $.globalStorage.range = window.getSelection().getRangeAt(0);
}
});

$('#mm-document-show-variable').click(function(){
    $('#w-document-variable').window('open');
    console.log('OK');
});

$('#mm-document-create-page').click(function(){
  $.globalStorage.pagedDoc.append();
});

$('#mm-document-create-table').click(function(){
  const range = $.globalStorage.range;
    if (range){
      let rowCount = prompt('输入行数', '2');
      let columnCount = prompt('输入列数', '5');
      rowCount = parseInt(rowCount); columnCount = parseInt(columnCount);

      let tableInnerHTML = '', trHTML;
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.tableLayout = 'fixed';
      table.style.borderSpacing = 0;
      table.style.borderCollapse = 'collapse';
      table.border = 1;
      for (let i = 1; i <= rowCount; i++) {
        trHTML = '<tr>';
        for (let j = 1; j <= columnCount; j++){
          trHTML += '<td> </td>';
        }
        trHTML += '</tr>';
        tableInnerHTML += trHTML;
      }
      table.innerHTML = tableInnerHTML;
      const before = document.createElement('div');
      before.innerHTML = '<br>';
      const after = document.createElement('div');
      after.innerHTML = '<br>'
      range.insertNode(before);
      range.insertNode(table);
      range.insertNode(after);
      $(table).tableMergeCells();
    }
});

$('#mm-document-create-chart').click(function () {
    if ($.globalStorage.range){
        const range = $.globalStorage.range;

        const wrapper = document.createElement('div');
        wrapper.id = 'figure_' + parseInt(performance.now()) +'_'+ parseInt(Math.random()*1000);
        wrapper.style.width = '100%';
        wrapper.style.height = '400px';//prompt('图表高度', '30%')';
        wrapper.style.padding = 0;
        wrapper.style.margin = 0;
        wrapper.style.display = 'block';
        wrapper.style.position = 'relative';

        const before = document.createElement('div');
        before.innerHTML = '&nbsp;';
        range.insertNode(before);

        range.insertNode(wrapper);
        $.globalStorage.charts.push(new chart(wrapper));

        const after = document.createElement('div');
        after.innerHTML = '&nbsp;'
        range.insertNode(after);
    }
});

$('#mm-document-chart-data').click(function(){
    $('#w-document-chart-data').window('open');

});

$('#w-document-chart-data-btn-update').click(function(){
    const groups = $('#w-document-chart-tree').data().tree.data;
    let str = '', groupStr;
    if (groups){
        for (const group of groups){
            groupStr = '[';
            for (const channel of group.children){
                groupStr += '"' + channel.text.replace(/\\/, '\\\\') + '",';
            }
            groupStr = groupStr.substr(0, groupStr.length-1);
            groupStr += ']';
            str += groupStr + ',';
        }
        str = str.substr(0, str.length-1);

        const activeChart = $.globalStorage.activeChart;
        const file = $.globalStorage.selectedFileExplorerNode;
        if (activeChart){
            eval('activeChart.plot.bindMDF($.globalStorage.selectedFileExplorerFile, ' + str + ' )');
            activeChart.plot.draw2(1);
        }
    }
});

$('#mm-document-chart-clear-shadow').click(function () {
    const chart = $.globalStorage.activeChart;
    if (chart){
        chart.legendTable.getContext('2d').fillText('', 0, 0);
    }
});

$('#w-document-chart-data-btn-add').click(function () {
    const channels = $('#w-document-chart-data-input-manual').val().split(',');
    const tree = $('#w-document-chart-tree');
    const node = tree.tree('getSelected');
    let group, data = [];

    if (channels.length > 0){
        for (const channel of channels){
            data.push({
                text: channel,
            });
        }

        const groupCount = tree.children().length;
        const lastGroupNodeTarget = tree.children()[groupCount-1].firstChild;

        if ((!node) || (node.text && node.text.match(/^Group/))){
            tree.tree('insert', {
                after: lastGroupNodeTarget,
                data: {
                    text: 'Group ' + (groupCount+1),
                    children: data,
                },
            });
        } else {
            group = tree.tree('getParent', node.target);

            tree.tree('append', {
                parent: group.target,
                data: data,
            });
        }
    }
});

$('#mm-document-save').click(function(){
  $.globalStorage.pagedDoc.save();
});

$('#mm-document-save-as-word').click(function(){
  $.globalStorage.pagedDoc.export('word');
});

$('#mm-document-save-as-json').click(function(){
  $.globalStorage.pagedDoc.export('json');
});

$.fn.tableMergeCells = function () {
    //***请保留原作者相关信息
    //***power by showbo,http://www.w3dev.cn
    return this.each(function () {
        var tb = $(this), startTD, endTD, MMRC = { startRowIndex: -1, endRowIndex: -1, startCellIndex: -1, endCellIndex: -1 };
        //初始化所有单元格的行列下标内容并存储到dom对象中
        tb.find('tr').each(function (r) { $('td', this).each(function (c) { $(this).data('rc', { r: r, c: c }); }) });
        //添加表格禁止选择样式和事件
        //tb.addClass('cannotselect').bind('selectstart', function () { return false });
        //选中单元格处理函数
        function addSelectedClass() {
            var selected = false,  rc,t;
            tb.find('td').each(function () {
                rc = $(this).data('rc');
                //判断单元格左上坐标是否在鼠标按下和移动到的单元格行列区间内
                selected = rc.r >= MMRC.startRowIndex && rc.r <= MMRC.endRowIndex && rc.c >= MMRC.startCellIndex && rc.c <= MMRC.endCellIndex;
                if (!selected && rc.maxc) {//合并过的单元格，判断另外3（左下，右上，右下）个角的行列是否在区域内
                    selected =
                        (rc.maxr >= MMRC.startRowIndex && rc.maxr <= MMRC.endRowIndex && rc.c >= MMRC.startCellIndex && rc.c <= MMRC.endCellIndex) ||//左下
                        (rc.r >= MMRC.startRowIndex && rc.r <= MMRC.endRowIndex && rc.maxc >= MMRC.startCellIndex && rc.maxc <= MMRC.endCellIndex) ||//右上
                        (rc.maxr >= MMRC.startRowIndex && rc.maxr <= MMRC.endRowIndex && rc.maxc >= MMRC.startCellIndex && rc.maxc <= MMRC.endCellIndex);//右下

                }
                if (selected)  this.className = 'selected';
            });
            var rangeChange = false;
            tb.find('td.selected').each(function () { //从已选中单元格中更新行列的开始结束下标
                rc = $(this).data('rc');
                t = MMRC.startRowIndex;
                MMRC.startRowIndex = Math.min(MMRC.startRowIndex, rc.r);
                rangeChange = rangeChange || MMRC.startRowIndex != t;

                t = MMRC.endRowIndex;
                MMRC.endRowIndex = Math.max(MMRC.endRowIndex, rc.maxr || rc.r);
                rangeChange = rangeChange || MMRC.endRowIndex != t;

                t = MMRC.startCellIndex;
                MMRC.startCellIndex = Math.min(MMRC.startCellIndex, rc.c);
                rangeChange = rangeChange || MMRC.startCellIndex != t;

                t = MMRC.endCellIndex;
                MMRC.endCellIndex = Math.max(MMRC.endCellIndex, rc.maxc || rc.c);
                rangeChange = rangeChange || MMRC.endCellIndex != t;
            });
            //注意这里如果用代码选中过合并的单元格需要重新执行选中操作
            if (rangeChange) addSelectedClass();
        }
        function onMousemove(e) {//鼠标在表格单元格内移动事件
            e = e || window.event;
            var o = e.srcElement || e.target;
            if (o.tagName == 'TD') {
                endTD = o;
                var sRC = $(startTD).data('rc'), eRC = $(endTD).data('rc'), rc;
                MMRC.startRowIndex = Math.min(sRC.r, eRC.r);
                MMRC.startCellIndex = Math.min(sRC.c, eRC.c);
                MMRC.endRowIndex = Math.max(sRC.r, eRC.r);
                MMRC.endCellIndex = Math.max(sRC.c, eRC.c);
                tb.find('td').removeClass('selected');
                addSelectedClass();
            }
        }
        function onMouseup(e) {//鼠标弹起事件
            tb.unbind({ mouseup: onMouseup, mousemove: onMousemove});

            if (startTD && endTD && startTD != endTD && confirm('确认合并？！')) {//开始结束td不相同确认合并
                var tds = tb.find('td.selected'), firstTD = tds.eq(0), index = -1, t, addBR
                    , html = tds.filter(':gt(0)').map(function () {
                    t = this.parentNode.rowIndex;
                    addBR = index != -1 && index != t;
                    index = t;
                    return (addBR ? '<br>' : '') + this.innerHTML
                }).get().join(' ');
                tds.filter(':gt(0)').remove(); firstTD.append(' ' + html.replace(/ (<br>)/g, '$1'));

                //更新合并的第一个单元格的缓存rc数据为所跨列和行
                var rc = firstTD.attr({ colspan: MMRC.endCellIndex - MMRC.startCellIndex + 1, rowspan: MMRC.endRowIndex - MMRC.startRowIndex + 1 }).data('rc');
                rc.maxc = rc.c + MMRC.endCellIndex - MMRC.startCellIndex; rc.maxr = rc.r + MMRC.endRowIndex - MMRC.startRowIndex;

                firstTD.data('rc', rc);

            }
            tb.find('td').removeClass('selected');
            startTD = endTD = null;
        };
        function onContextmenu(e){
          e.originalEvent.stopPropagation();
          e.originalEvent.preventDefault();
          console.log(e, this);
        };
        function onMousedown(e) {
            var o = e.target;
            if (o.tagName == 'TD') {
                startTD = o;
                tb.bind({ mouseup: onMouseup, mousemove: onMousemove});
            }
        }
        tb.mousedown(onMousedown);
        tb.contextmenu(onContextmenu);
    });
};

$(document).ready(function(){
  //$('#mm-document').data().menu.options.duration = 1000;

  const mergeTableStyle = document.createElement('style');
  mergeTableStyle.innerHTML = '.cannotselect{-moz-user-select:none;-webkit-user-select:none;-ms-user-select:none;-khtml-user-select:none;user-select:none;}td.selected{background:#0094ff;color:#fff}';
  document.head.appendChild(mergeTableStyle);
});
////////////////////////////////////////////////////////////////////////////////
var saveAs=saveAs||function(e){"use strict";if(typeof e==="undefined"||typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}var t=e.document,n=function(){return e.URL||e.webkitURL||e},r=t.createElementNS("http://www.w3.org/1999/xhtml","a"),o="download"in r,a=function(e){var t=new MouseEvent("click");e.dispatchEvent(t)},i=/constructor/i.test(e.HTMLElement)||e.safari,f=/CriOS\/[\d]+/.test(navigator.userAgent),u=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},s="application/octet-stream",d=1e3*40,c=function(e){var t=function(){if(typeof e==="string"){n().revokeObjectURL(e)}else{e.remove()}};setTimeout(t,d)},l=function(e,t,n){t=[].concat(t);var r=t.length;while(r--){var o=e["on"+t[r]];if(typeof o==="function"){try{o.call(e,n||e)}catch(a){u(a)}}}},p=function(e){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)){return new Blob([String.fromCharCode(65279),e],{type:e.type})}return e},v=function(t,u,d){if(!d){t=p(t)}var v=this,w=t.type,m=w===s,y,h=function(){l(v,"writestart progress write writeend".split(" "))},S=function(){if((f||m&&i)&&e.FileReader){var r=new FileReader;r.onloadend=function(){var t=f?r.result:r.result.replace(/^data:[^;]*;/,"data:attachment/file;");var n=e.open(t,"_blank");if(!n)e.location.href=t;t=undefined;v.readyState=v.DONE;h()};r.readAsDataURL(t);v.readyState=v.INIT;return}if(!y){y=n().createObjectURL(t)}if(m){e.location.href=y}else{var o=e.open(y,"_blank");if(!o){e.location.href=y}}v.readyState=v.DONE;h();c(y)};v.readyState=v.INIT;if(o){y=n().createObjectURL(t);setTimeout(function(){r.href=y;r.download=u;a(r);h();c(y);v.readyState=v.DONE});return}S()},w=v.prototype,m=function(e,t,n){return new v(e,t||e.name||"download",n)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(e,t,n){t=t||e.name||"download";if(!n){e=p(e)}return navigator.msSaveOrOpenBlob(e,t)}}w.abort=function(){};w.readyState=w.INIT=0;w.WRITING=1;w.DONE=2;w.error=w.onwritestart=w.onprogress=w.onwrite=w.onabort=w.onerror=w.onwriteend=null;return m}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!==null){define("FileSaver.js",function(){return saveAs})}
////////////////////////////////////////////////////////////////////////////////
/* Conversion type (formula identifier)
 *  0 = parametric, linear
 *  1 = tabular with interpolation
 *  2 = tabular
 *  6 = polynomial function
 *  7 = exponential function
 *  8 = logarithmic function
 *  9 = rational conversion formula
 *  10 = ASAM-MCD2 Text formula
 *  11 = ASAM-MCD2 Text Table, (COMPU_VTAB)
 *  12 = ASAM-MCD2 Text Range Table (COMPU_VTAB_RANGE)
 *  132 = date (Based on 7 Byte Date data structure)
 *  133 = time (Based on 6 Byte Time data structure)
 *  65535 = 1:1 conversion formula (Int = Phys)
 */

CCBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.physicalValueRangeValid = null;
  this.minPhysicalSignalValue = null;
  this.maxPhysicalSignalValue = null;
  this.physicalUnit = null;
  this.conversionType = null;
  this.sizeInformation = null;
  this.additionalConversionData = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

CCBlock.conversionFomulas = {
  0:  // 0 = parametric, linear
    function(rawData, params){
      return rawData * params[1] + params[0];
    },
  1:  // 1 = tabular with interpolation
    function(rawData, params){
      var Int_0 = params[0];
      if(rawData < Int_0){
        var Phys_0 = params[1];
        return Phys_0;
      }

      for(var i = 1; i < (params.length / 2); i++){
        var Int_i = params[2*i];
        if(rawData < Int_i){
          var Phys_i = params[2*i+1];
          var Int_i_1 = params[2*i-2];
          var Phys_i_1 = params[2*i-1];
          return Phys_i_1 + (Phys_i - Phys_i_1) / (Int_i - Int_i_1) * (rawData - Int_i_1);
        }
      }

      var Phys_n = params[params.length - 1];
      return Phys_n;
    },
  2:  // 2 = tabular
    function(rawData, params){
      var Int_0 = params[0];
      if(rawData < Int_0){
        var Phys_0 = params[1];
        return Phys_0;
      }

      for(var i = 1; i < (params.length / 2); i++){
        var Int_i = params[2*i];
        if(rawData < Int_i){
          var Phys_i_1 = params[2*i-1];
          return Phys_i_1;
        }
      }

      var Phys_n = params[params.length - 1];
      return Phys_n;
    },
  6:  // 6 = polynomial function
    function(rawData, params){
      return (params[1] - (params[3] * (rawData - params[4]))) / (params[2] * (rawData - params[4]) - params[0]);
    },
  7:  // 7 = exponential function
    function(rawData, params){
      if(params[3] == 0){
        return Math.log(((rawData - params[6]) * params[5] - params[2]) / params[0]) / params[1];
      }
      else if(params[0] == 0){
        return Math.log((params[2] / (rawData - params[6]) - params[5]) / params[3]) / params[4];
      }

      return null;
    },
  8:  // 8 = logarithmic function
    function(rawData, params){
      if(params[3] == 0){
        return Math.exp(((rawData - params[6]) * params[5] - params[2]) / params[0]) / params[1];
      }
      else if(params[0] == 0){
        return Math.exp((params[2] / (rawData - params[6]) - params[5]) / params[3]) / params[4];
      }

      return null;
    },
  9:  // 9 = rational conversion formula
    function(rawData, params){
      return (params[0] * rawData * rawData + params[1] * rawData + params[2]) / (params[3] * rawData * rawData + params[4] * rawData + params[5]);
    },
  10: // 10 = ASAM-MCD2 Text formula
    function(rawData, params){
      var eqnStr = params[0];  // an equation including X1
      if(!/[A-WYZa-z"'`]/.test(eqnStr) && !/X[^1]/.test(eqnStr)){
        try{
          var fcnStr = "return ( " + eqnStr + " )";
          var fcn = new Function("X1", fcnStr);
          var ans = fcn(rawData);
          return ans;
        }
        catch(e){
          var errMessage = "Error Message: " + e.message + ", Error Name: " + e.name;
          if(e.fileName)  str += ", File Name: " + e.fileName;
          if(e.lineNumber)  str +=", Line Number: " + e.lineNumber;
          console.log(errMessage);
        }
      }

      return null;
    },
  11: // 11 = ASAM-MCD2 Text Table, (COMPU_VTAB)
    function(rawData, params){
      var rowCount = params.length / 2;
      var minGap, temp;
      for(var i = 0; i < rowCount; i++){
        var Int_i = params[2*i];
        if(Int_i == rawData){
          return params[2*i+1];
        }
        else{
          if ((!minGap) || minGap >= Math.abs(Int_i - rawData)) {
            temp = params[2*i+1];
            minGap = Math.abs(Int_i - rawData);
          }
        }
      }

      return temp;
    },
  12: // 12 = ASAM-MCD2 Text Range Table (COMPU_VTAB_RANGE)
    function(rawData, params){
      return null;              // not supported yet.
    },
  132:  // 132 = date (Based on 7 Byte Date data structure)
    function(ary_u8, params, littleEndian){
      var abuf = ary_u8.buffer;
      var offset = 0;

      var data = new Array(6);

      var len = 2;
      data[0] = MDF.ab2uint16(abuf, offset, littleEndian);
      offset += len;

      for(var i = 1; i < data.length; i++){
        len = 1;
        data[i] = MDF.ab2uint8(abuf, offset);
        offset += len;
      }
      return data;
    },
  133:  // 133 = time (Based on 6 Byte Time data structure)
    function(ary_u8, params, littleEndian){
      var abuf = ary_u8.buffer;
      var offset = 0;

      var data = new Array(2);
      var len = 6;
      data[0] = MDF.ab2uint32(abuf, offset, littleEndian);
      offset += len;

      len = 2;
      data[1] = MDF.ab2uint16(abuf, offset, littleEndian);
      offset += len;
      return data;
    },
  65535:  // 65535 = 1:1 conversion formula (Int = Phys)
    function(rawData, params){
      return rawData;
    }
};

CCBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.physicalValueRangeValid = MDF.ab2bool(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 8;
  this.minPhysicalSignalValue = MDF.ab2double(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 8;
  this.maxPhysicalSignalValue = MDF.ab2double(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 20;
  this.physicalUnit = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.conversionType = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.sizeInformation = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = this.blockSize - ( offset - blockOffset );
  this.setAdditinalConversionData(arrayBuffer, offset, littleEndian);
  offset += len;

  this.convert = (function(little){
    var convType = this.conversionType;
    var params = this.additionalConversionData;

    if(convType == 132 || convType == 133){
      return function(rawData){
        return CCBlock.conversionFomulas[convType](rawData, params, little);
      };
    }

    return function(rawData){
      return CCBlock.conversionFomulas[convType](rawData, params);
    };
  }).call(this, littleEndian);
};

CCBlock.prototype.setAdditinalConversionData = function(arrayBuffer, initialOffset, littleEndian){
  var data = [];
  var offset = initialOffset;

  switch(this.conversionType){
  case 0:
  case 6:
  case 7:
  case 8:
  case 9:
    data = new Array(this.sizeInformation);
    for(var i = 0; i < data.length; i++){
      var len = 8;
      data[i] = MDF.ab2double(arrayBuffer, offset, littleEndian);
      offset += len;
    }
    break;
  case 1:
  case 2:
    data = new Array(this.sizeInformation * 2);
    for(var i = 0; i < data.length; i++){
      var len = 8;
      data[i] = MDF.ab2double(arrayBuffer, offset, littleEndian);
      offset += len;
    }
    break;
  case 10:
    var len = 256;
    data = [ MDF.ab2str(arrayBuffer, offset, len) ];
    offset += len;
    break;
  case 11:
    data = new Array(this.sizeInformation * 2);
    for(var i = 0; i < this.sizeInformation; i++){
      var len = 8;
      data[2*i] = MDF.ab2double(arrayBuffer, offset, littleEndian);
      offset += len;

      len = 32;
      data[2*i+1] = MDF.ab2str(arrayBuffer, offset, len);
      offset += len;
    }
    break;
  case 12:
    data = new Array( (this.sizeInformation + 1) * 3);
    try{
      for(var i = 0; i < this.sizeInformation + 1; i++){
        var len = 8;
        data[3*i] = MDF.ab2double(arrayBuffer, offset, littleEndian);
        offset += len;

        len = 8;
        data[3*i+1] = MDF.ab2double(arrayBuffer, offset, littleEndian);
        offset += len;

        len = 4;
        data[3*i+2] = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
        offset += len;
      }
    }
    catch(e){
      var errMessage = "Error Message: " + e.message + ", Error Name: " + e.name;
      if(e.fileName)  str += ", File Name: " + e.fileName;
      if(e.lineNumber)  str +=", Line Number: " + e.lineNumber;
      console.log(errMessage);
    }
    break;
  case 132:
    break;
  case 133:
    break;
  case 65535:
    break;
  }

  this.additionalConversionData = data;
};

// This is dummy function to advoid undefined error.
CCBlock.prototype.convert = function(rawData){
  return null;
};

CCBlock.prototype.convertAll = function(rawDataArray){
  var actDataArray = [];
  for(var i = 0; i < rawDataArray.length; i++){
    actDataArray.push(this.convert(rawDataArray[i]));
  }
  return actDataArray;
};

//-------------------------------------------------------//
CDBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.dependencyType = null;
  this.numberOfSignalsDependencies = null;
  this.pDGBlocks = [];
  this.pCGBlocks = [];
  this.pCNBlocks = [];
  this.sizeOfDimensions = [];

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

CDBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.dependencyType = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.numberOfSignalsDependencies = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  this.pDGBlocks = new Array(this.numberOfSignalsDependencies);
  this.pCGBlocks = new Array(this.numberOfSignalsDependencies);
  this.pCNBlocks = new Array(this.numberOfSignalsDependencies);
  for(var i = 0; i < this.numberOfSignalsDependencies; i++){
    len = 4;
    this.pDGBlocks[i] = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 4;
    this.pCGBlocks[i] = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 4;
    this.pCNBlocks[i] = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  this.sizeOfDimensions = new Array(this.getDimension());
  for(var i = 0; i < this.sizeOfDimensions.length; i++){
    len = 2;
    this.sizeOfDimensions[i] = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
    offset += len;
  }
};

CDBlock.prototype.getDimension = function(){
  var dimension = 0;

  switch(this.dependencyType){
  case 0:
  case 1:
  case 2:
    dimension = this.dependencyType;
    break;
  default:
    if(this.dependencyType >= 256){
      dimension = this.dependencyType - 256;
    }
    break;
  }

  return dimension;
}

//-----------------------------------------------------//
CEBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.extensionType = null;
  this.additionalFields = [];

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

CEBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.extensionType = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = this.blockSize - ( offset - blockOffset );
  this.setAdditionalFields(arrayBuffer, offset, littleEndian);
  offset += len;
};

CEBlock.prototype.setAdditionalFields = function(arrayBuffer, initialOffset, littleEndian){
  var data = [];
  var offset = initialOffset;

  switch(this.extensionType){
  case 2:
    data = new Array(4);

    var len = 2;
    data[0] = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 4;
    data[1] = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 80;
    data[2] = MDF.ab2str(arrayBuffer, offset, len);
    offset += len;

    len = 32;
    data[3] = MDF.ab2str(arrayBuffer, offset, len);
    offset += len;
    break;
  case 19:
    data = new Array(4);

    var len = 4;
    data[0] = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 4;
    data[1] = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 36;
    data[2] = MDF.ab2str(arrayBuffer, offset, len);
    offset += len;

    len = 36;
    data[3] = MDF.ab2str(arrayBuffer, offset, len);
    offset += len;
    break;
    break;
  }

  this.additionalFields = data;
};

//------------------------------------------------------//
CGBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.pNextCGBlock = null;
  this.pFirstCNBlock = null;
  this.pComment = null;
  this.recordID = null;
  this.numberOfChannels = null;
  this.sizeOfDataRecord = null;
  this.numberOfRecords = null;
  this.pFirstSRBlock = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;
  this.cnBlocks = [];
  this.comment = null;
  this.srBlocks = [];

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

CGBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pNextCGBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pFirstCNBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pComment = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.recordID = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.numberOfChannels = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.sizeOfDataRecord = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.numberOfRecords = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  if(this.blockSize > (offset - blockOffset)){
    len = 4;
    this.pFirstSRBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  this.setCNBlocks(arrayBuffer, this.pFirstCNBlock, littleEndian);
  this.setComment(arrayBuffer, this.pComment, littleEndian);
  this.setSRBlocks(arrayBuffer, this.pFirstSRBlock, littleEndian);
};

CGBlock.prototype.setCNBlocks = function(arrayBuffer, initialOffset, littleEndian){
  var offset = initialOffset;

  while(offset){
    var cnBlock = new CNBlock(arrayBuffer, offset, littleEndian, this);
    this.cnBlocks.push(cnBlock);
    offset = cnBlock.pNextCNBlock;
  }
};

CGBlock.prototype.setComment = function(arrayBuffer, initialOffset, littleEndian){
  if(initialOffset){
    this.comment = new TXBlock(arrayBuffer, initialOffset, littleEndian, this);
  }
};

CGBlock.prototype.setSRBlocks = function(arrayBuffer, initialOffset, littleEndian){
  var offset = initialOffset;

  while(offset){
    var srBlock = new SRBlock(arrayBuffer, offset, littleEndian, this);
    this.srBlocks.push(srBlock);
    offset = srBlock.pNextSRBlock;
  }
};

CGBlock.prototype.indexOfTimeChannel = function(){
  for(var i = 0; i < this.cnBlocks.length; i++){
    var cn = this.cnBlocks[i];
    if(cn.isTimeChannel())  return i;
  }

  return -1;
};

CGBlock.prototype.timeChannel = function(){
  var idx = this.indexOfTimeChannel();
  if(idx >= 0)  return this.cnBlocks[idx];

  return null;
};

//------------------------------------------------------//
/* Signal data type
 * Note: for 0-3 the default Byte order defined in IDBLOCK is used,
 * for 9-16 the default Byte order is overruled!
 * --------------------------------------------------------------------
 * 0 = unsigned integer                                 | Default Byte
 * 1 = signed integer (two's complement)                | order from
 * 2 = IEEE 754 floating-point format FLOAT (4 bytes)   | IDBLOCK
 * 3 = IEEE 754 floating-point format DOUBLE (8 bytes)  |
 * --------------------------------------------------------------------
 * 4 = VAX floating-point format (F_Float)              |
 * 5 = VAX floating-point format (G_Float)              | obsolete
 * 6 = VAX floating-point format (D_Float)              |
 * --------------------------------------------------------------------
 * 7 = String (NULL terminated)
 * 8 = Byte Array (max. 8191 Bytes, constant record length!)
 * --------------------------------------------------------------------
 * 9 = unsigned integer                                 | Big Endian
 * 10 = signed integer (two fs complement)              | (Motorola)
 * 11 = IEEE 754 floating-point format FLOAT (4 bytes)  | Byte order
 * 12 = IEEE 754 floating-point format DOUBLE (8 bytes) |
 * --------------------------------------------------------------------
 * 13 = unsigned integer                                | Little Endian
 * 14 = signed integer (two fs complement)              | (Intel)
 * 15 = IEEE 754 floating-point format FLOAT (4 bytes)  | Byte order
 * 16 = IEEE 754 floating-point format DOUBLE (8 bytes) |
 * --------------------------------------------------------------------
 */

CNBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.pNextCNBlock = null;
  this.pCCBlock = null;
  this.pCEBlock = null;
  this.pCDBlock = null;
  this.pComment = null;
  this.channelType = null;
  this.shortSignalName = null;
  this.signalDescription = null;
  this.startOffsetInBits = null;
  this.numberOfBits = null;
  this.signalDataType = null;
  this.valueRangeValid = null;
  this.minSignalValue = null;
  this.maxSignalValue = null;
  this.samplingRate = null;

  this.pLongSignalName = null;
  this.pDisplayName = null;
  this.additionalByteOffset = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;
  this.ccBlock = null;
  this.ceBlock = null;
  this.cdBlock = null;
  this.comment = null;

  this.rawDataArray = [];

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

CNBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pNextCNBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pCCBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pCEBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pCDBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pComment = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.channelType = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 32;
  this.shortSignalName = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 128;
  this.signalDescription = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.startOffsetInBits = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.numberOfBits = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.signalDataType = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.valueRangeValid = MDF.ab2bool(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 8;
  this.minSignalValue = MDF.ab2double(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 8;
  this.maxSignalValue = MDF.ab2double(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 8;
  this.samplingRate = MDF.ab2double(arrayBuffer, offset, littleEndian);
  offset += len;

  if( this.blockSize > (offset - blockOffset) ){
    len = 4;
    this.pLongSignalName = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  if( this.blockSize > (offset - blockOffset) ){
    len = 4;
    this.pDisplayName = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  if( this.blockSize > (offset - blockOffset) ){
    len = 2;
    this.additionalByteOffset = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  if(this.pCCBlock)  this.ccBlock = new CCBlock(arrayBuffer, this.pCCBlock, littleEndian, this);
  if(this.pCEBlock)  this.ceBlock = new CEBlock(arrayBuffer, this.pCEBlock, littleEndian, this);
  if(this.pCDBlock)  this.cdBlock = new CDBlock(arrayBuffer, this.pCDBlock, littleEndian, this);
  if(this.pComment)  this.comment = new TXBlock(arrayBuffer, this.pComment, littleEndian, this);


  // method override
  this.readRawData = (function(littleEndianDefault){
    if(this.isUint()){
      var thisByteOffset = this.byteOffset();
      var thisBitOffset = this.bitOffset();
      var cnLittleEndian = (this.isDefaultByteOrder() == false) ? this.isLittleEndian() : littleEndianDefault;

      var byteLength = Math.ceil((thisBitOffset + this.numberOfBits) / 8);
      var bitmask = 0xFF >>> ((8 - ((thisBitOffset + this.numberOfBits) % 8)) % 8);

      if(thisBitOffset == 0){
        switch(this.numberOfBits){
        case 8:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2uint8(arrayBuffer, theOffset);
          };
          break;
        case 16:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2uint16(arrayBuffer, theOffset, cnLittleEndian);
          };
          break;
        case 32:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2uint32(arrayBuffer, theOffset, cnLittleEndian);
          };
          break;
        case 64:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2uint64(arrayBuffer, theOffset, cnLittleEndian);
          };
          break;
        default:
          if(this.numberOfBits < 8){
            return function(arrayBuffer, recordOffset){
              var theOffset = recordOffset + thisByteOffset;
              return bitmask & MDF.ab2uint8(arrayBuffer, theOffset);
            };
          }
          break;
        }
      }

      if(cnLittleEndian == false){
        return function(arrayBuffer, recordOffset){
          var theOffset = recordOffset + thisByteOffset;

          var uint8Array = MDF.ab2bytes(arrayBuffer, theOffset, byteLength);

          var ans = 0;
          var i;
          var index = uint8Array.length - 1;
          for(i = 0; i < uint8Array.length - 1; i++){
            ans += uint8Array[index] * Math.pow(2, 8 * i - thisBitOffset);
            index--;
          }
          var maskedVal = uint8Array[index] & bitmask;  // uint8Array[index] == MSB byte.
          ans += maskedVal * Math.pow(2, 8 * i - thisBitOffset);

          return ans;
        };
      }
      else {
      /*
      Emergency! Bug: sometimes, the bool channel could get raw data of 0.5, 1.5 or other float number.
      for example, B_sbbvk in 5.dat, index = 583, value = 0.5, offset = 305438
      */
        return function(arrayBuffer, recordOffset){
          var theOffset = recordOffset + thisByteOffset;

          var uint8Array = MDF.ab2bytes(arrayBuffer, theOffset, byteLength);

          var ans = 0;
          var i;
          for(i = 0; i < uint8Array.length - 1; i++){
            ans += Math.floor(uint8Array[i] * Math.pow(2, 8 * i - thisBitOffset));
          }
          var maskedVal = uint8Array[i] & bitmask;  // uint8Array[index] == MSB byte.
          ans += Math.floor(maskedVal * Math.pow(2, 8 * i - thisBitOffset));

          return ans;
        };
      }
    }
    else if(this.isInt()){
      var thisByteOffset = this.byteOffset();
      var thisBitOffset = this.bitOffset();
      var cnLittleEndian = (this.isDefaultByteOrder() == false) ? this.isLittleEndian() : littleEndianDefault;

      var byteLength = Math.ceil((this.bitOffset() + this.numberOfBits) / 8);
      var bitmask = 0xFF >>> ((8 - ((this.bitOffset() + this.numberOfBits) % 8)) % 8);

      if(thisBitOffset == 0){
        switch(this.numberOfBits){
        case 8:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2int8(arrayBuffer, theOffset);
          };
          break;
        case 16:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2int16(arrayBuffer, theOffset, cnLittleEndian);
          };
          break;
        case 32:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2int32(arrayBuffer, theOffset, cnLittleEndian);
          };
          break;
        case 64:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2int64(arrayBuffer, theOffset, cnLittleEndian);
          };
          break;
        default:
          if(this.numberOfBits < 8){
            return function(arrayBuffer, recordOffset){
              var theOffset = recordOffset + thisByteOffset;
              var maskedVal = bitmask & MDF.ab2uint8(arrayBuffer, theOffset);
              var flag = (bitmask ^ (bitmask >>> 1)) & maskedVal;
              var flaggedVal = (flag == 0) ? maskedVal : (maskedVal - bitmask - 1);
              return flaggedVal;
            };
          }
          break;
        }
      }

      if(cnLittleEndian == false){
        return function(arrayBuffer, recordOffset){
          var theOffset = recordOffset + thisByteOffset;

          var uint8Array = MDF.ab2bytes(arrayBuffer, theOffset, byteLength);

          var ans = 0;
          var i;
          var index = uint8Array.length - 1;
          for(i = 0; i < uint8Array.length - 1; i++){
            ans += uint8Array[index] * Math.pow(2, 8 * i - thisBitOffset);
            index--;
          }
          var maskedVal = uint8Array[index] & bitmask;  // uint8Array[index] == MSB byte.
          var flag = (bitmask ^ (bitmask >>> 1)) & maskedVal;
          var flaggedVal = (flag == 0) ? maskedVal : (maskedVal - bitmask - 1);
          ans += flaggedVal * Math.pow(2, 8 * i - thisBitOffset);

          return ans;
        };
      }
      else {
        return function(arrayBuffer, recordOffset){
          var theOffset = recordOffset + thisByteOffset;

          var uint8Array = MDF.ab2bytes(arrayBuffer, theOffset, byteLength);

          var ans = 0;
          var i;
          for(i = 0; i < uint8Array.length - 1; i++){
            ans += uint8Array[i] * Math.pow(2, 8 * i - thisBitOffset);
          }
          var maskedVal = uint8Array[i] & bitmask;  // uint8Array[index] == MSB byte.
          var flag = (bitmask ^ (bitmask >>> 1)) & maskedVal;
          var flaggedVal = (flag == 0) ? maskedVal : (maskedVal - bitmask - 1);
          ans += flaggedVal * Math.pow(2, 8 * i - thisBitOffset);

          return ans;
        };
      }
    }
    else if(this.isFloat()){
      var thisByteOffset = this.byteOffset();
      var cnLittleEndian = (this.isDefaultByteOrder() == false) ? this.isLittleEndian() : littleEndianDefault;

      return function(arrayBuffer, recordOffset){
        var theOffset = recordOffset + thisByteOffset;
        return MDF.ab2float(arrayBuffer, theOffset, cnLittleEndian);
      };
    }
    else if(this.isDouble()){
      var thisByteOffset = this.byteOffset();
      var cnLittleEndian = (this.isDefaultByteOrder() == false) ? this.isLittleEndian() : littleEndianDefault;

      return function(arrayBuffer, recordOffset){
        var theOffset = recordOffset + thisByteOffset;
        return MDF.ab2double(arrayBuffer, theOffset, cnLittleEndian);
      };
    }
    else if(this.isString()){
      var thisByteOffset = this.byteOffset();
      var theLen = this.numberOfBits / 8;

      return function(arrayBuffer, recordOffset){
        var theOffset = recordOffset + thisByteOffset;
        return MDF.ab2str(arrayBuffer, theOffset, theLen);
      };
    }
    else if(this.isByteArray()){
      var thisByteOffset = this.byteOffset();
      var theLen = this.numberOfBits / 8;

      return function(arrayBuffer, recordOffset){
        var theOffset = recordOffset + thisByteOffset;
        return MDF.ab2bytes(arrayBuffer, theOffset, theLen);
      };
    }

    // if the signal data type is invalid
    return this.readRawData;   // return original (dummy) function

  }).call(this, littleEndian);
};

CNBlock.prototype.isTimeChannel = function(){
  var ans = null;
  if(this.channelType != null) ans = (this.channelType == 1);
  return ans;
};

CNBlock.prototype.byteOffset = function(){
  var ans = parseInt(this.startOffsetInBits / 8);
  if(this.additionalByteOffset != null) ans += this.additionalByteOffset;
  return ans;
};

CNBlock.prototype.bitOffset = function(){
  var ans = this.startOffsetInBits % 8;
  return ans;
};

CNBlock.prototype.isUint = function(){
  var ans = null;
  if(this.signalDataType != null){
    ans = (this.signalDataType == 0 || this.signalDataType == 9 || this.signalDataType == 13);
  }
  return ans;
};

CNBlock.prototype.isInt = function(){
  var ans = null;
  if(this.signalDataType != null){
    ans = (this.signalDataType == 1 || this.signalDataType == 10 || this.signalDataType == 14);
  }
  return ans;
};

CNBlock.prototype.isFloat = function(){
  var ans = null;
  if(this.signalDataType != null){
    ans = (this.signalDataType == 2 || this.signalDataType == 11 || this.signalDataType == 15);
  }
  return ans;
};

CNBlock.prototype.isDouble = function(){
  var ans = null;
  if(this.signalDataType != null){
    ans = (this.signalDataType == 3 || this.signalDataType == 12 || this.signalDataType == 16);
  }
  return ans;
};

CNBlock.prototype.isString = function(){
  var ans = null;
  if(this.signalDataType != null){
    ans = (this.signalDataType == 7);
  }
  return ans;
};

CNBlock.prototype.isByteArray = function(){
  var ans = null;
  if(this.signalDataType != null){
    ans = (this.signalDataType == 8);
  }
  return ans;
};

CNBlock.prototype.isDefaultByteOrder = function(){
  var ans = null;
  if(this.signalDataType != null){
    ans = (this.signalDataType == 0 || this.signalDataType == 1 || this.signalDataType == 2 || this.signalDataType == 3);
  }
  return ans;
};

CNBlock.prototype.isBigEndian = function(){
  var ans = null;
  if(this.signalDataType == 9 || this.signalDataType == 10 || this.signalDataType == 11 || this.signalDataType == 12){
    ans = true;
  }
  else if(this.signalDataType == 13 || this.signalDataType == 14 || this.signalDataType == 15 || this.signalDataType == 16){
    ans = false;
  }
  return ans;
};

CNBlock.prototype.isLittleEndian = function(){
  var ans = null;
  if(this.signalDataType == 9 || this.signalDataType == 10 || this.signalDataType == 11 || this.signalDataType == 12){
    ans = false;
  }
  else if(this.signalDataType == 13 || this.signalDataType == 14 || this.signalDataType == 15 || this.signalDataType == 16){
    ans = true;
  }
  return ans;
};

// This is dummy function to advoid undefined error.
CNBlock.prototype.readRawData = function(arrayBuffer, recordOffset){
  return null;
};

CNBlock.prototype.pushRawData = function(arrayBuffer, recordOffset){
  var rawData = this.readRawData(arrayBuffer, recordOffset);

  var arrayLength = this.rawDataArray.push(rawData);
  return arrayLength;
};

CNBlock.prototype.getPhysicalDataArray = function(){
  return this.ccBlock.convertAll(this.rawDataArray);
};

//--------------------------------------------------------------------//
DGBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.pNextDGBlock = null;
  this.pFirstCGBlock = null;
  this.pTRBlock = null;
  this.pDataBlock = null;
  this.numberOfChannelGroups = null;
  this.numberOfRecordIDs = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;
  this.trBlock = null;
  this.cgBlocks = [];

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

DGBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pNextDGBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pFirstCGBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pTRBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pDataBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.numberOfChannelGroups = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.numberOfRecordIDs = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  this.setCGBlocks(arrayBuffer, this.pFirstCGBlock, littleEndian);
  this.setTRBlock(arrayBuffer, this.pTRBlock, littleEndian);
};

DGBlock.prototype.setCGBlocks = function(arrayBuffer, initialOffset, littleEndian){
  var offset = initialOffset;

  while(offset){
    var cgBlock = new CGBlock(arrayBuffer, offset, littleEndian, this);
    this.cgBlocks.push(cgBlock);
    offset = cgBlock.pNextCGBlock;
  }
};

DGBlock.prototype.setTRBlock = function(arrayBuffer, initialOffset, littleEndian){
  if(initialOffset){
    this.trBlock = new TRBlock(arrayBuffer, initialOffset, littleEndian, this);
  }
};

DGBlock.prototype.isSorted = function(){
  return (this.cgBlocks.length == 1);
};

DGBlock.prototype.readDataBlock = function(arrayBuffer, littleEndian){
  var offset = this.pDataBlock;

  if(offset){
    if(this.isSorted() == false){
      var cgCounters = (new Array(this.cgBlocks.length)).fill(0); // Zeros(this.cgBlocks.length);

      while(true){
        var cgIndex = 0;
        var currentRecordID = MDF.ab2uint8(arrayBuffer, offset);
        for(var i = 0; i < this.cgBlocks.length; i++){
          if(this.cgBlocks[i].recordID == currentRecordID){
            cgIndex = i;
            break;
          }
        }
        var currentCGBlock = this.cgBlocks[cgIndex];

        /* if(this.numberOfRecordIDs > 0) */  offset += 1;
        for(var i = 0; i < currentCGBlock.cnBlocks.length; i++){
          var theCNBlock = currentCGBlock.cnBlocks[i];
          theCNBlock.rawDataArray[cgCounters[cgIndex]] = theCNBlock.readRawData(arrayBuffer, offset);
        }

        offset += currentCGBlock.sizeOfDataRecord;
        if(this.numberOfRecordIDs >= 2)  offset += 1;

        cgCounters[cgIndex]++;

        var isEndOfDataBlock = true;
        for(var i = 0; i < this.cgBlocks.length; i++){
          if(cgCounters[i] < this.cgBlocks[i].numberOfRecords){
            isEndOfDataBlock = false;
            break;
          }
        }
        if(isEndOfDataBlock) break;
      }
    }
    else {  // this.isSorted() == true
      var currentCGBlock = this.cgBlocks[0];
      for(var cgCounter = 0; cgCounter < currentCGBlock.numberOfRecords; cgCounter++){

        if(this.numberOfRecordIDs > 0)  offset += 1;

        for(var i = 0; i < currentCGBlock.cnBlocks.length; i++){
          var theCNBlock = currentCGBlock.cnBlocks[i];
          theCNBlock.rawDataArray[cgCounter] = theCNBlock.readRawData(arrayBuffer, offset);
        }

        offset += currentCGBlock.sizeOfDataRecord;
        if(this.numberOfRecordIDs >= 2)  offset += 1;
      }
    }
  }
};

DGBlock.prototype.readDataBlockAt = function(arrayBuffer, indexes, littleEndian){
  var cgIndex = indexes[0];
  var currentCGBlock = this.cgBlocks[cgIndex];
  var cnIndex = indexes[1];
  var theCNBlock = currentCGBlock.cnBlocks[cnIndex];

  this.readDataBlockOf(arrayBuffer, theCNBlock, littleEndian);

  return theCNBlock;
};

DGBlock.prototype.readDataBlockOf = function(arrayBuffer, theCNBlock, littleEndian){
  var offset = this.pDataBlock;

  var currentCGBlock = theCNBlock.parent;

  if(offset){
    if(this.isSorted() == false){
      var startPoint = (theCNBlock.rawDataArray.length) ? theCNBlock.rawDataArray.length : 0;

      var cgCounter = 0;
      while(cgCounter < startPoint){
        var currentRecordID = MDF.ab2uint8(arrayBuffer, offset);
        /* if(this.numberOfRecordIDs > 0) */  offset += 1;

        if(currentCGBlock.recordID == currentRecordID){
          cgCounter++;
        }

        offset += currentCGBlock.sizeOfDataRecord;
        if(this.numberOfRecordIDs >= 2)  offset += 1;
      }

      while(cgCounter < currentCGBlock.numberOfRecords){
        var currentRecordID = MDF.ab2uint8(arrayBuffer, offset);
        /* if(this.numberOfRecordIDs > 0) */  offset += 1;

        if(currentCGBlock.recordID == currentRecordID){
          theCNBlock.pushRawData(arrayBuffer, offset);
          cgCounter++;
        }

        offset += currentCGBlock.sizeOfDataRecord;
        if(this.numberOfRecordIDs >= 2)  offset += 1;
      }
    }
    else {  // this.isSorted() == true
      var startPoint = (theCNBlock.rawDataArray.length) ? theCNBlock.rawDataArray.length : 0;

      var cgCounter = 0;
      for(; cgCounter < startPoint; cgCounter++){
        if(this.numberOfRecordIDs > 0)  offset += 1;

        offset += currentCGBlock.sizeOfDataRecord;
        if(this.numberOfRecordIDs >= 2)  offset += 1;
      }

      for(; cgCounter < currentCGBlock.numberOfRecords; cgCounter++){
        if(this.numberOfRecordIDs > 0)  offset += 1;

        theCNBlock.pushRawData(arrayBuffer, offset);

        offset += currentCGBlock.sizeOfDataRecord;
        if(this.numberOfRecordIDs >= 2)  offset += 1;
      }
    }
  }

  return theCNBlock;
};

//------------------------------------------------------------------------//
HDBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  // members
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.pFirstDGBlock = null;
  this.pFileComment = null;
  this.pPRBlock = null;
  this.numberOfDataGroups = null;
  this.date = null;
  this.time = null;
  this.authorName = null;
  this.organizationName = null;
  this.projectName = null;
  this.subject = null;
  this.timeStamp = null;
  this.UTCTimeOffset = null;
  this.timeQualityClass = null;
  this.timerIdentification = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;
  this.fileComment = null;
  this.prBlock = null;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

// member functions
HDBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pFirstDGBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pFileComment = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pPRBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.numberOfDataGroups = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 10;
  this.date = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 8;
  this.time = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 32;
  this.authorName = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 32;
  this.organizationName = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 32;
  this.projectName = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 32;
  this.subject = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  if(this.blockSize > (offset - blockOffset)){
    len = 8;
    this.timeStamp = MDF.ab2uint64(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  if(this.blockSize > (offset - blockOffset)){
    len = 2;
    this.UTCTimeOffset = MDF.ab2int16(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  if(this.blockSize > (offset - blockOffset)){
    len = 2;
    this.timeQualityClass = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  if(this.blockSize > (offset - blockOffset)){
    len = 32;
    this.timerIdentification = MDF.ab2str(arrayBuffer, offset, len);
    offset += len;
  }


  if(this.pFileComment){
    this.fileComment = new TXBlock(arrayBuffer, this.pFileComment, littleEndian, this);
  }

  if(this.pPRBlock){
    this.prBlock = new PRBlock(arrayBuffer, this.pPRBlock, littleEndian, this);
  }

};

//-----------------------------------------------------------------------//
IDBlock = function(arrayBuffer, blockOffset, _parent){
  // members
  this.fileIdentifier = null;
  this.formatIdentifier = null;
  this.programIdentifier = null;
  this.defaultByteOrder = null;
  this.defaultFloatingPointFormat = null;
  this.versionNumber = null;
  this.codePageNumber = null;
  this.standardFlags  = null;
  this.customFlags = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset);
};

// member functions
IDBlock.prototype.initiallize = function(arrayBuffer, blockOffset){
  var offset = blockOffset;
  var len;

  len = 8;
  this.fileIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 8;
  this.formatIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 8;
  this.programIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.defaultByteOrder = MDF.ab2uint16(arrayBuffer, offset, true);
  offset += len;

  var littleEndian = (this.defaultByteOrder == 0);

  len = 2;
  this.defaultFloatingPointFormat = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.versionNumber = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.codePageNumber = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  // reserved
  offset += len;

  len = 26;
  // reserved
  offset += len;

  len = 2;
  this.standardFlags = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.customFlags = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;
};

IDBlock.prototype.isLittleEndian = function(){
  var ans = null;
  if(this && (this.defaultByteOrder != null)) ans = (this.defaultByteOrder == 0);
  return ans;
};

//---------------------------------------------------------------------------//
PRBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.programSpecificData = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

PRBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = this.blockSize - ( offset - blockOffset );
  this.programSpecificData = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;
};

//--------------------------------------------------------------------------------//
SRBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.pNextSRBlock = null;
  this.pDataBlock = null;
  this.numberOfReducedSamples = null;
  this.lengthOfTimeInterval = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

SRBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pNextSRBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pDataBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.numberOfReducedSamples = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 8;
  this.lengthOfTimeInterval = MDF.ab2double(arrayBuffer, offset, littleEndian);
  offset += len;
};

//----------------------------------------------------------------------------------//
TRBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.pTriggerComment = null;
  this.numberOfTriggerEvents = null;
  this.triggerTimes = [];
  this.preTriggerTimes = [];
  this.postTriggerTimes = [];

  this.triggerComment = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

TRBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pTriggerComment = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.numberOfTriggerEvents = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  this.triggerTimes = new Array(this.numberOfTriggerEvents);
  this.preTriggerTimes = new Array(this.numberOfTriggerEvents);
  this.postTriggerTimes = new Array(this.numberOfTriggerEvents);
  for(var i = 0; i < this.numberOfTriggerEvents; i++){
    if( ( offset - blockOffset ) >= this.blockSize )  break;

    len = 4;
    this.triggerTimes[i] = MDF.ab2double(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 4;
    this.preTriggerTimes[i] = MDF.ab2double(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 4;
    this.postTriggerTimes[i] = MDF.ab2double(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  this.setTriggerComment(arrayBuffer, this.pTriggerComment, littleEndian);
};

TRBlock.prototype.setTriggerComment = function(arrayBuffer, initialOffset, littleEndian){
  if(initialOffset){
    this.triggerComment = new TXBlock(arrayBuffer, initialOffset, littleEndian, this);
  }
};

//---------------------------------------------------------------------------------//
TXBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.text = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

TXBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = this.blockSize - ( offset - blockOffset );
  this.text = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;
};

//----------------------------------------------------------------------------------//
MDF = function(arrayBuffer, f_read){
  // members
  this.idBlock = null;
  this.hdBlock = null;
  this.dgBlocks = [];
  this.arrayBuffer = null;

  this.initiallize(arrayBuffer);
  if(f_read != false) this.readDataBlocks(arrayBuffer);
  else  this.arrayBuffer = arrayBuffer;
};

// static functions
MDF.ab2bytes = function(arrayBuffer, offset, len){
  var ary_u8 = new Uint8Array(arrayBuffer, offset, len);
  return ary_u8;
};
MDF.ab2str = function(arrayBuffer, offset, len){
  var ary_u8 = new Uint8Array(arrayBuffer, offset, len);
  var str_with_nul = String.fromCharCode.apply(null, ary_u8);
  return str_with_nul.split('\0')[0];
};
MDF.ab2uint8 = function(arrayBuffer, offset){
  var dataView = new DataView(arrayBuffer, offset, 1);
  return dataView.getUint8(0);
};
MDF.ab2int8 = function(arrayBuffer, offset){
  var dataView = new DataView(arrayBuffer, offset, 1);
  return dataView.getInt8(0);
};
MDF.ab2uint16 = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 2);
  return dataView.getUint16(0, littleEndian);
};
MDF.ab2int16 = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 2);
  return dataView.getInt16(0, littleEndian);
};
MDF.ab2uint32 = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 4);
  return dataView.getUint32(0, littleEndian);
};
MDF.ab2int32 = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 4);
  return dataView.getInt32(0, littleEndian);
};
MDF.ab2uint64 = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 8);
  var uint32_first = dataView.getUint32(0, littleEndian);
  var uint32_last = dataView.getUint32(4, littleEndian);
  return (littleEndian) ? (uint32_first + (uint32_last * 0x100000000)) : (uint32_last + (uint32_first * 0x100000000));
};
MDF.ab2int64 = function(arrayBuffer, offset, littleEndian){
  var ans;
  var dataView = new DataView(arrayBuffer, offset, 8);
  if(littleEndian){
    var uint32_first = dataView.getUint32(0, littleEndian);
    var int32_last = dataView.getInt32(4, littleEndian);
    ans = uint32_first + (int32_last * 0x100000000);
  }
  else {
    var int32_first = dataView.getInt32(0, littleEndian);
    var uint32_last = dataView.getUint32(4, littleEndian);
    ans = uint32_last + (int32_first * 0x100000000);
  }
  return ans;
};
MDF.ab2bool = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 2);
  return (dataView.getUint16(0, littleEndian) != 0);
};
MDF.ab2float = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 4);
  return dataView.getFloat32(0, littleEndian);
};
MDF.ab2double = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 8);
  return dataView.getFloat64(0, littleEndian);
};

MDF.str2u8arr = function(str){
  var ary_u8 = new Uint8Array(str.length);
  for(var i = 0; i < str.length; i++){
    ary_u8[i] = str.charCodeAt(i);
  }
  return ary_u8;
};

// member functions
MDF.prototype.initiallize = function(arrayBuffer){
  var offset = 0;
  this.idBlock = new IDBlock(arrayBuffer, offset, this);

  var littleEndian = this.idBlock.isLittleEndian(); // (this.idBlock.defaultByteOrder == 0);

  offset = 64;
  this.hdBlock = new HDBlock(arrayBuffer, offset, littleEndian, this);

  offset = this.hdBlock.pFirstDGBlock;
  this.setDGBlocks(arrayBuffer, offset, littleEndian);
};

MDF.prototype.setDGBlocks = function(arrayBuffer, initialOffset, littleEndian){
  var offset = initialOffset;

  while(offset){
    var dg = new DGBlock(arrayBuffer, offset, littleEndian, this);
    this.dgBlocks.push(dg);
    offset = dg.pNextDGBlock;
  }
};

MDF.prototype.readDataBlocks = function(arrayBuffer){
  if(arrayBuffer){
    var littleEndian = this.idBlock.isLittleEndian(); // (this.idBlock.defaultByteOrder == 0);
    for(var i = 0; i < this.dgBlocks.length; i++){
      var dg = this.dgBlocks[i];
      dg.readDataBlock(arrayBuffer, littleEndian);
    }
  }
  else if(this.arrayBuffer){
    this.readDataBlocks(this.arrayBuffer);
  }
};

MDF.prototype.readDataBlockAt = function(indexes, arrayBuffer){
  if(arrayBuffer){
    var littleEndian = this.idBlock.isLittleEndian(); // (this.idBlock.defaultByteOrder == 0);
    var dgIndex = indexes[0];
    var dg = this.dgBlocks[dgIndex];
    var cn = dg.readDataBlockAt(arrayBuffer, indexes.slice(1), littleEndian);
    return cn;
  }
  else if(this.arrayBuffer){
    return this.readDataBlockAt(indexes, this.arrayBuffer);
  }
  return null;
};

MDF.prototype.readDataBlockOf = function(cnBlock, arrayBuffer){
  if(arrayBuffer){
    var littleEndian = this.idBlock.isLittleEndian(); // (this.idBlock.defaultByteOrder == 0);
    var dg = cnBlock.parent.parent;
    dg.readDataBlockOf(arrayBuffer, cnBlock, littleEndian);
    return cnBlock;
  }
  else if(this.arrayBuffer){
    return this.readDataBlockOf(cnBlock, this.arrayBuffer);
  }
  return null;
};

MDF.prototype.searchIndexesIf = function(func){
  var indexesArray = [];

  for(var i = 0; i < this.dgBlocks.length; i++){
    var dg = this.dgBlocks[i];
    for(var j = 0; j < dg.cgBlocks.length; j++){
      var cg = dg.cgBlocks[j];
      for(var k = 0; k < cg.cnBlocks.length; k++){
        var cn = cg.cnBlocks[k];
        if(func(cn, cg, dg, k, j, i)) indexesArray.push([i, j, k, cn]);
      }
    }
  }

  return indexesArray;
};

MDF.prototype.searchChannelsIf = function(func){
  var indexesArray = this.searchIndexesIf(func);
  var cnArray = [];
  for(var i = 0; i < indexesArray.length; i++){
    var idx = indexesArray[i];
    cnArray.push(this.dgBlocks[idx[0]].cgBlocks[idx[1]].cnBlocks[idx[2]]);
  }
  return cnArray;
};

MDF.prototype.searchIndexesByRegExp = function(regexp){
  var func = (function(regexp, cn){
    return cn.shortSignalName.search(regexp) != -1;
  }).bind(this, regexp);
  var indexesArray = this.searchIndexesIf(func);

  return indexesArray;
};


MDF.prototype.searchChannelsByRegExp = function(regexp){
  var func = (function(regexp, cn){
    return cn.shortSignalName.search(regexp) != -1;
  }).bind(this, regexp);
  var cnArray = this.searchChannelsIf(func);

  return cnArray;
};
