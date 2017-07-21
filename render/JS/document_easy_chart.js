'use strict';
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
      legend:{
        title: {
          charNum: 7,
        },
        value: {
          charNum: 6,
        },
      },
    };

    const drawingAreaSize = {
      'width':parseInt((width - this.style['padding-left'] - this.style['padding-right'] - this.style['margin-area'])*this.style['drawingAreaSizeRatio']),
      'height':parseInt((height - this.style['padding-top'] - this.style['padding-bottom'])),
    };

    this.wrapper = document.createElement('div');
    this.wrapper.id = 'chart_' + parseInt(performance.now()) +'_'+ parseInt(Math.random()*1000);
    this.id = this.wrapper.id;
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
    });

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
          vCursor.style.height = thisChart.plot.height;
          vCursor.style.display = 'block';
          vCursor.innerHTML = '';
          let channelIndex = -1;
          let file, xCal, xReal, indexFound, indexEstimated;
          for (const filename in thisChart.plot.data){
            file = thisChart.plot.data[filename];
            if (file.windowTimeDomain[0] != undefined){ // maybe there is no data in the rawDataArray
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
              thisChart.selectedCursor = null;
            } else {
              thisChart.selectedCursor = {
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


        if (!evt.shiftKey){
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

        if (!evt.ctrlKey){
          const [x0, x1] = file.windowTimeDomain;
          const k = (x - file.fromX) / (file.toX - x);
          const x0_new = x0 + (x1 - x0)*(scaleRatio-1)*k/scaleRatio/(1+k);
          const x1_new = x1 - (x1 - x0)*(scaleRatio-1)/scaleRatio/(1+k);
          file.windowTimeDomain = [x0_new, x1_new];
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
      textMode: 'all',
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
      if (this.style.textMode === 'sides') this.style.textCount = 2;
      else if (this.style.textMode === 'all') this.style.textCount = this.style.tickCount;

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
}
HTMLCanvasElement.prototype.clearAll = function(){
  this.getContext('2d').clearRect(-10000, -10000, this.width+10000, this.height+10000);
}
//===========================================================================//

window.line = function(){this.init();};

line.prototype.init = function(){

  this.style = {
    groupMargin: 10,
    strokeWidth: 2, // !important
    lineJoin: 'bevel',
    sampleRatio: 50,
    x_domain: [],
    y_domain: [],
    bitGroupFixedHeight: 30,
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
    const fileUID = file.name;//getFileUID(file);
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
          groupTimeDomain : [],
          groupValueDomain: [],
          channels: [],
          bitGroup: false,
          fixedHeight: NaN,
        };

        let theCNBlock, totalTimeArray, totalTimeDomain, totalValueArray, totalValueDomain, valueArray, theTimeCNBlock, timeArray, time_domain, value_domain, shared_y_domain, shared_x_domain;

        for (const name of needle){
          let shortname;
          if (name.match(/\\/)){shortname = name.match(/^(.*)\\/)[1];}
          else {shortname = name;}

          r = MDF.searchChannelsByRegExp(new RegExp('^' + shortname + '\\\\'));

          if (r.length > 0){

            theCNBlock = (r[0].rawDataArray.length == 0) ? MDF.readDataBlockOf(r[0], MDF.arrayBuffer):r[0];
            totalValueArray = ( ( typeof (theCNBlock.ccBlock.convert(theCNBlock.rawDataArray[0])) === 'string') ? theCNBlock.rawDataArray:theCNBlock.getPhysicalDataArray());
            if (totalValueArray.length === 0) return false;
            valueArray = totalValueArray.resample(dotsNum);

            theTimeCNBlock = MDF.readDataBlockOf(theCNBlock.parent.cnBlocks[0], MDF.arrayBuffer);
            totalTimeArray = theTimeCNBlock.getPhysicalDataArray();
            if (totalTimeArray.length === 0) return false;
            timeArray = totalTimeArray.resample(dotsNum);

            time_domain  = [min(timeArray), max(timeArray)];
            totalTimeDomain = [min(totalTimeArray), max(totalTimeArray)];
            if (time_domain[0] === time_domain[1] && time_domain[0] != 0)  time_domain = [time_domain[0]*0.5, time_domain[0]*1.5];
            if (time_domain[0] === time_domain[1] && time_domain[0] === 0) time_domain = [0, 1];

            const theConversion = theCNBlock.ccBlock.additionalConversionData;
            if (theConversion.constructor.name === 'Array' && theConversion.length === 4 && theConversion[3] === 'TRUE'){
              value_domain = [0, 1];
              theGroup.bitGroup = true;
              theGroup.fixedHeight = this.style.bitGroupFixedHeight;
            } else {
              value_domain = [min(valueArray), max(valueArray)];
              if (value_domain[0] === value_domain[1] && value_domain[0] != 0)  value_domain = [value_domain[0]*0.5, value_domain[0]*1.5];
              if (value_domain[0] === value_domain[1] && value_domain[0] === 0) value_domain = [-1, 1];
            }

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
              'name': shortname,
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
  return true;
}

line.prototype.draw2 = function(options){
  console.time('draw');

  let defaultSetting = {
    niceTimeDomain: false,
    niceValueDomain: false,
    viewmode: 0,
    drawmode: 1,
  };

  this.setting = $.extend(defaultSetting, options);

  const filenames = Object.keys(this.data);
  const fileCount = filenames.length;
  const chart = this.parent;
  const axisLeft = chart.axisLeft,
        axisBottom = chart.axisBottom,
        axisTop = chart.axisTop,
        axisRight = chart.axisRight;
  const axisBottomHeight = axisBottom.style.fontSize + axisBottom.style.tickSize + axisBottom.style.margin;
  let currentGroupToY = 0, currentGroupHeight;
  // update the drawingAreaSize
  this.height = chart.style.height - chart.style['padding-top'] - chart.style['padding-bottom'] - axisBottomHeight * fileCount;
  this.canvas.height = this.height;
  this.parent.layerOfPlot.style.height = this.height;

  const groupCount = this.totalGroupCount;
  const groupHeight= (this.height - this.style.groupMargin*(groupCount - 1))/groupCount;

  let totalFixedHeight = 0, fluidGroupCount = 0, fluidGroupHeight;
  for (const filename in this.data){
    for (const group of this.data[filename].dataGroup){
      if (group.fixedHeight) totalFixedHeight += group.fixedHeight;
      else fluidGroupCount++;
    }
  }
  fluidGroupHeight = (this.height - this.style.groupMargin*(groupCount - 1) - totalFixedHeight) / fluidGroupCount;

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
      if (this.setting.niceTimeDomain || file.niceTimeDomain) file.windowTimeDomain = nice(file.windowTimeDomain[0], file.windowTimeDomain[1], axisBottom.style.tickCount-1);
      axisBottom.domain = file.windowTimeDomain;

      axisRight.fromY = chart.style['padding-top'] + this.height;
      axisBottom.fromY = chart.style['padding-top'] + this.height + fileIndex * axisBottomHeight;
      axisBottom.draw('bottom');
      axisRight.draw('right');
      axisTop.draw('top');
      file.niceTimeDomain = false;

      const groupMargin = this.style.groupMargin;
      const y2 = chart.style['padding-top'];
      const y1 = y2 + this.height;

      for (const group of file.dataGroup){
        groupIndex++;
        currentGroupHeight = group.fixedHeight?group.fixedHeight:fluidGroupHeight;

        group.fromY = currentGroupHeight - this.style.strokeWidth/2;
        group.toY = this.style.strokeWidth/2;

        const fromY = group.fromY;
        const toY = group.toY;

        // update value axis
        if (this.setting.viewmode === 0){
          axisLeft.style.tickCount = 5;
          if (!group.bitGroup){
            if (this.setting.niceValueDomain || group.niceValueDomain) group.groupValueDomain = nice(group.groupValueDomain[0], group.groupValueDomain[1], axisLeft.style.tickCount-1);
          } else {
            group.groupValueDomain = [0, 1];
            axisLeft.style.tickCount = 2;
          }
          axisLeft.domain = group.groupValueDomain;

          /*if (groupIndex < (groupCount-1)){
            axisLeft.fromY = y2 + parseInt((groupIndex+1)*groupHeight + groupIndex*groupMargin);
          } else {
            axisLeft.fromY = y1;
          }*/
          axisLeft.fromY = chart.style['padding-top'] + currentGroupToY + currentGroupHeight;
          axisLeft.toY = chart.style['padding-top'] + currentGroupToY;

          // tick --> nice
          //const domainDiff = axisLeft.domain[1] - axisLeft.domain[0];
          //axisLeft.style.tickCount = parseInt(groupHeight/10);
          axisLeft.draw('left');
          group.niceValueDomain = false;
        }

        // add new canvas element
        let canvas, ctx, legendTable;

        if (group.canvas) group.canvas.parentNode.removeChild(group.canvas);
        // canvas of plot area of this group
        // I'm not sure if the canvas should be rebuilt. Because maybe new files/groups are added and all the height of canvases should be changed.
        // so a forced repainting of canvas is conducted.
        canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height= currentGroupHeight;
        canvas.style.top = currentGroupToY;
        canvas.style.zIndex = 35;
        canvas.setAttribute('data-repaint', 'true');
        canvas.setAttribute('role', 'plot-group');
        canvas.parentFile = file;
        group.canvas = canvas;
        canvas.parentGroup = group;
        this.container.appendChild(canvas);

        // As remarked above, all the canvas are destroied and rebuilt, and no need to judge (of file.repaint || canvas.repaint || drawMode == 1) any more.
        if (true){
          ctx = canvas.getContext('2d');

          valueDomain = group.groupValueDomain;
          timeDomain = file.windowTimeDomain;

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
            let xi, yi, yPrevious, nextIndex, xNext, yNext;
            let windowMaxValue = - Infinity, windowMinValue = Infinity;
            for (let i = 0; i < timeArray.length; i++) {
              nextIndex = (i < timeArray.length-1)?(i+1):(timeArray.length-1);
              if (timeArray[nextIndex] >= domainMin && timeArray[nextIndex] <= domainMax){

                if (!startDrawing){
                  startDrawing = true;
                  xi = interpolation(timeArray[i], domainMin, domainMax, file.fromX, file.toX),
                  yi = interpolation(valueArray[i], yMin, yMax, fromY, toY);
                  ctx.moveTo(xi, yi);
                }
                else {
                  yPrevious = yi;
                  xi = interpolation(timeArray[i], domainMin, domainMax, file.fromX, file.toX),
                  yi = interpolation(valueArray[i], yMin, yMax, fromY, toY);
                  ctx.lineTo(xi, yPrevious);
                  ctx.lineTo(xi, yi);
                }
                if (valueArray[i] > windowMaxValue) windowMaxValue = valueArray[i];
                if (valueArray[i] < windowMinValue) windowMinValue = valueArray[i];

                windowDataIndex.push({i, xi, yi});
              } else {
                if (startDrawing){
                  yPrevious = yi;
                  xi = interpolation(timeArray[i], domainMin, domainMax, file.fromX, file.toX),
                  yi = interpolation(valueArray[i], yMin, yMax, fromY, toY);
                  xNext = interpolation(timeArray[nextIndex], domainMin, domainMax, file.fromX, file.toX);
                  yNext = interpolation(valueArray[nextIndex], yMin, yMax, fromY, toY);
                  ctx.lineTo(xi, yPrevious);
                  ctx.lineTo(xi, yi);
                  ctx.lineTo(xNext, yi);
                  ctx.lineTo(xNext, yNext);

                  if (valueArray[i] > windowMaxValue) windowMaxValue = valueArray[i];
                  if (valueArray[i] < windowMinValue) windowMinValue = valueArray[i];

                  windowDataIndex.push({i, xi, yi});
                  break;
                }
              }

            }
            ctx.stroke();

            channel.windowMaxValue = windowMaxValue;
            channel.windowMinValue = windowMinValue;

            if (windowDataIndex.length < canvas.width/10){
              ctx.beginPath();
              ctx.fillStyle = channel.color;
              for (let i = 0; i < windowDataIndex.length; i++) {
                ctx.moveTo(windowDataIndex[i].xi+r, windowDataIndex[i].yi);
                ctx.arc(windowDataIndex[i].xi, windowDataIndex[i].yi, r, 0, Math.PI*2);
              }
              ctx.fill();
            }
          ctx.save();
        }

          canvas.repaint = false;
        }

        // refresh the legendTable
        for(const [i, channel] of group.channels.entries()){
          const offsetY = currentGroupToY + i*14;
          legendCtx.fillStyle = channel.color;
          legendCtx.fillRect(0, offsetY + 3, 11, 11);

          let collaspedName = channel.alias?channel.alias:channel.name;
          const maxNameLen = chart.style.legend.title.charNum;
          if (collaspedName.length > maxNameLen){
            collaspedName = collaspedName.substr(0, maxNameLen);
          }
          legendCtx.font = '11px Consolas';
          legendCtx.fillStyle = 'black';
          legendCtx.textBaseline = 'top';
          legendCtx.fillText('['+fileIndex+']'+collaspedName, 18, offsetY);


          legendCtx.fillStyle = 'black';
          for (const [i, cursor] of channel.cursor.entries()){
            let y = cursor.y;
            let collaspedY = '';
            if (y != undefined){
              collaspedY = ''+ cursor.y;
              const maxYLen = chart.style.legend.value.charNum;
              const dotPosition = collaspedY.indexOf('.');
              if (dotPosition === -1){ // int, has no dot in the number
                if (collaspedY.length > maxYLen) collaspedY = y.toPrecision(2);
              } else {
                if (dotPosition > maxYLen) collaspedY = y.toPrecision(2);
                else collaspedY = collaspedY.substr(0, maxYLen);
              }
              legendCtx.fillText(collaspedY, 41 + (i+1)*52, offsetY);
            }
          }
        }
        // refresh the legendTable end

        currentGroupToY += (currentGroupHeight + groupMargin);
      }
    }

    if (file.cursor){
      const canvas = file.parentLine.canvas;
      const ctx = canvas.getContext("2d");
      const lineWidth = 2;
      ctx.lineWidth = lineWidth;
      let x1, y1 = canvas.height, y2 = 1, r = 8;
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
        ctx.fillText(''+index, x1 - 3, y2 + 3);
        ctx.fill();
      }
    }
    file.repaint = false;
  }
  //console.timeEnd('draw');
  return true;
};

line.prototype.autoscale = function(options){
  let data = this.data;
  let defaultSetting = {
    niceTimeDomain: true,
    niceValueDomain: true,
  };
  let setting = $.extend(defaultSetting, options);

  this.plot.draw(options);
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
})

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
    for (const filename in this.data){
      n += this.data[filename].dataGroup.length;
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
}

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
}

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
}

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
}

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

$(document).keydown(function(e){
  const key = e.key;
  if (key === 'Delete') {
    const theChart = $.globalStorage.activeChart;
    if (theChart && theChart.selectedCursor){
      const i = theChart.selectedCursor.index;
      const cursors = theChart.selectedCursor.cursorArray;
      const chart = cursors[i].parentChart;
      const file = cursors[i].parentFile;
      console.log()
      // remove the element in file.cursor
      cursors.splice(i, 1);

      // remove the element in channel.cursor
      for (const group of file.dataGroup){
        for (const channel of group.channels){
          channel.cursor.splice(i, 1);
        }
      }

      theChart.plot.draw2();
      theChart.selectedCursor = null;
    }
  }
});
