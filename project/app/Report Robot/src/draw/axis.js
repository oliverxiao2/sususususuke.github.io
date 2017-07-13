'use strict'
// ======================= plot ======================================== //
window.chart = function(container, viewmode){
  this.init(container);

  if (!$global.blurSubscribers){
    $global.blurSubscribers = [this];
  } else {
    $global.blurSubscribers.push(this);
  }
};
chart.prototype.init = function(container, viewmode=0){
  var thisChart = this;

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
      'padding-top': 5.5,
      'padding-bottom': 5.5,
      'padding-left': 50.5,
      'padding-right': 5.5,
      'margin-area': 5,
      'width': width,
      'height': height,
      'drawingAreaSizeRatio': 0.7,
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
    this.wrapper.style.border = 'none';
    this.wrapper.style.zIndex = 10;
    this.wrapper.parentChart = this;
    this.container.appendChild(this.wrapper);
    // add event listener for wrapper
    this.wrapper.addEventListener('mousedown', function(evt){
      if ((evt.target.getAttribute('role') === 'plot-group') && thisChart.status === 'idle' && evt.buttons === 1) {
        thisChart.status = 'pan';
      } else if (evt.target.getAttribute('role') === 'vCursor') {
        const offsetX = thisChart.vCursor.style.left;
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
          thisChart.vCursor.style.left = x;
          thisChart.vCursor.style.display = 'block';

          let file, xCal, xReal, indexFound, indexEstimated;
          for (const filename in thisChart.plot.data){
            file = thisChart.plot.data[filename];

            xCal = interpolation(x, file.fromX, file.toX, file.windowTimeDomain[0], file.windowTimeDomain[1]);
            indexEstimated = parseInt((xCal - file.dataMaxTimeDomain[0]) / (file.dataMaxTimeDomain[1] - file.dataMaxTimeDomain[0]));
            for (const group of file.dataGroup){
              for (const channel of group.channels){
                const timeArray = channel.timeArray;
                const valueArray = channel.valueArray;
                [indexFound, xReal] = searchIndex(timeArray, xCal, indexEstimated);
                group.legendTable.querySelector('#'+file.fileUID+'_'+channel.name).innerText = valueArray[indexFound];
              }
            }
          }


        } else {
          thisChart.vCursor.style.display = 'none';
        }
      }
    });

    this.wrapper.addEventListener('click', function(evt){
      $global.activeChart = thisChart;console.log(thisChart);
    });

    this.wrapper.addEventListener('focus', function(){
      thisChart.wrapper.style.boxShadow = '0 0px 8px 0px #9E9E9E';
    });

    this.wrapper.addEventListener('blur', function(evt){
      thisChart.wrapper.style.boxShadow = '';
    });
    this.wrapper.addEventListener('dblclick', function(evt){
      console.log('dblclick');
    });
    this.wrapper.addEventListener('contextmenu', function(evt){
      evt.preventDefault();
      $global.activeChart = thisChart;
      thisChart.showContextmenu = true;
      console.log(evt);
      thisChart.contextmenuElement.style.left = evt.offsetX;
      thisChart.contextmenuElement.style.top = evt.offsetY;
      thisChart.contextmenuElement.style.display = 'block';
    });

    this.contextmenuElement = document.createElement('div');
    this.contextmenuElement.style.width = 200;
    this.contextmenuElement.innerHTML = '<ul><li>清空</li><li>属性</li></ul>'
    this.contextmenuElement.style.position = 'absolute';
    this.contextmenuElement.style.display = 'none';
    this.wrapper.appendChild(this.contextmenuElement);

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
    this.axisBottom.draw('bottom');

    // axis left
    this.axisLeft = new axis();
    this.axisLeft.container = this.layerOfAxis;
    this.axisLeft.fromX = this.style['padding-left'];
    this.axisLeft.toX = this.style['padding-left'] + drawingAreaSize.width;
    this.axisLeft.fromY = height - this.style['padding-bottom'];
    this.axisLeft.toY = this.style['padding-top'];
    this.axisLeft.parentChart = this;
    this.axisLeft.draw('left');

    // axis top
    this.axisTop = new axis();
    this.axisTop.container = this.layerOfAxis;
    this.axisTop.style.showTick = false;
    this.axisTop.style.showText = false;
    this.axisTop.fromX = this.style['padding-left'];
    this.axisTop.toX = this.axisTop.fromX + drawingAreaSize.width;
    this.axisTop.fromY = this.style['padding-top'];
    this.axisTop.parentChart = this;
    this.axisTop.draw('top');

    // axis right
    this.axisRight = new axis();
    this.axisRight.container = this.layerOfAxis;
    this.axisRight.style.showTick = false;
    this.axisRight.style.showText = false;
    this.axisRight.fromX = this.style['padding-left'] + drawingAreaSize.width;
    this.axisRight.fromY = height - this.style['padding-bottom'];
    this.axisRight.toY = this.style['padding-top'];
    this.axisRight.parentChart = this;
    this.axisRight.draw('right');

    // vertical cursor
    this.vCursor = document.createElement('div');
    this.vCursor.setAttribute('role', 'vCursor');
    const vCursorStyle = this.vCursor.style;
    vCursorStyle.zIndex = 31;
    vCursorStyle.width = 2;
    vCursorStyle.height = drawingAreaSize.height;
    vCursorStyle.position = 'absolute';
    vCursorStyle.left = 0;
    vCursorStyle.top = 0;
    vCursorStyle.background = 'red';
    vCursorStyle.opacity = 0.6;
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
      tickWidth: 1,
      tickColor: '#000000',
      showText: true,
      textMode: 'sides',
      fontSize: 11,
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

      ctx.beginPath();
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

      ctx.stroke();
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
        'fileUID': fileUID,
        'dataGroup':[],
        'dataMaxTimeDomain': [],
        'currentWindowTimeDomain': [],
        'repaint': true,
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

          r = MDF.searchChannelsByRegExp(eval('/^' + name + '\\\\/')); // should use the accurate channel name

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
}

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
  this.parent.layerOfPlot.style.height = this.height;

  const groupCount = this.totalGroupCount;
  const groupHeight= (this.height - this.style.groupMargin*(groupCount - 1))/groupCount;


  axisLeft.canvas.clear();
  axisBottom.canvas.clear();
  axisRight.canvas.clear();
  axisTop.canvas.clear();

  let channelIndex = -1, groupIndex = -1;

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

        if(!group.legendTable || drawMode == 1){
          if (group.legendTable) group.legendTable.parentNode.removeChild(group.legendTable);
          // legendTable of this group
          legendTable = document.createElement('table');
          legendTable.style.position = 'absolute';
          legendTable.style.left = 0;
          legendTable.style.top = (groupHeight + groupMargin) * groupIndex;
          legendTable.style.tableLayout = 'fixed';
          legendTable.style.fontFamily = 'Consolas';
          legendTable.style.fontSize = '11px;'
          legendTable.width = 300;
          legendTable.parentGroup = group;
          group.legendTable = legendTable;
          this.parent.layerOfLegendTable.appendChild(legendTable);
          for(const [i, channel] of group.channels.entries()){
            const tr = document.createElement('tr');
            tr.innerHTML =
            '<td style="width:11px;padding:0;"><div style="width:11;height:11;background:'+channel.color+';border:1px solid #333;box-sizing:border-box;"></div></td>'
            +'<td style="width:80px;">'+channel.name+'</td>'
            +'<td id="'+ group.canvas.parentFile.fileUID+'_'+channel.name+'"> </td>';
            legendTable.appendChild(tr);
          }
        }
      }

    }

    file.repaint = false;
  }

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
    const filenames = Object.keys(this.data);
    for (const filename of filenames){
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
