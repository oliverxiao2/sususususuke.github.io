

/*
  @ params
  @ data:
  @ viewmode:
  @ width:
  @ height:
  @ padding:
  @ fontSize:
  @ fontFamily:
  @ title:
  @

*/
window.plot = function(data, viewmode){
  let time1 = [], sample = [], length = 100;

  for (let i=0; i<=10; i++){
    if (sample[i] == undefined) sample[i] = [];

    for (let j=0; j<100; j++){
      sample[i].push(Math.cos(j+Math.random())+Math.sin(i+Math.random()));
      if (i==0) time1.push(j*1.35+32);
    }
  }
  const exampleData01 = {
    "type": 1,
    "channel01":[
      {x:1, y:1.8},
      {x:2, y:6.1},
      {x:3, y:3.4},
      {x:4, y:12.7}
    ],
    "channel02":[
      {x:1, y:3.6},
      {x:2, y:9.2},
      {x:3, y:20.4},
      {x:4, y:5.7}
    ]
  };
  const exampleData03 = {
    "type": 2,
    "channelgroup": [
      {
        "y": {
          "channel01": [1,2,3,4,5],
          "channel02": [2,1,2,1,2],
        },
        "x": {
          "time": [1,2,3,4,5]
        },
      },
      {
        "y": {
          "channel03": [1,3,1,3,1],
          "channel04": [2,5,8,1,3],
        },
        "x": {
          "time": [1,2,3,4,5]
        },
      },
      {
        "y": {
          "channel05": [5, 4, 3, 2, 1],
          "channel06": [4,1,6,2,3],
        },
        "x": {
          "time": [1,2,3,4,5]
        },
      }
    ]
  };
  const exampleData02 = {
    "type": 2,
    "channelgroup": [
      {
        "y": {
          "channel01": sample[0],
          "channel02": sample[1],
        },
        "x": {
          "time": time1
        },
      },
      {
        "y": {
          "channel03": sample[2],
          "channel04": sample[3],
        },
        "x": {
          "time": time1
        },
      },
      {
        "y": {
          "channel05": sample[4],
          "channel06": sample[5],
        },
        "x": {
          "time": time1
        },
      }
    ]
  };
  if (data == undefined) data = exampleData02;

  this.data = data;

  let domain = boundary(data)["boundary"];

  this.axisBottom = axisBottom(undefined, undefined, [Math.floor(domain.Xmin), Math.ceil(domain.Xmax)], undefined);
  this.axisLeft = axisLeft(undefined, undefined, [Math.floor(domain.Ymin), Math.ceil(domain.Ymax)], undefined);
  this.axisRight = axisRight();
  this.axisTop = axisTop();
  this.line = line(data, undefined, undefined, [Math.floor(domain.Xmin), Math.ceil(domain.Xmax)], undefined);
  legend(undefined, undefined, data, undefined);

  let box = {width:600, height:250};
  let padding = {bottom:20.5, right:30.5, left:50.5, top:10.5};
  $('#cursor01')
    .css('left', padding.left + 10)
    .css('top', padding.top)
    .css('width', 2)
    .css('height', box.height - padding.top - padding.bottom);

  $('#canvas01').mousemove(function(evt){
    console.log(evt);
    if (evt.offsetX > (box.width - padding.right) || evt.offsetX < padding.left || evt.offsetY > (box.height - padding.bottom) || evt.offsetY < padding.top){
      $('#cursor01').addClass('hide');
    } else {
      $('#cursor01').removeClass('hide').css('left', evt.offsetX);
      let x;
      x = interpolation(
        parseInt(evt.offsetX - padding.left),
        0,
        box.width - padding.left - padding.right,
        domain.Xmin,
        domain.Xmax
      );

      // show values
      let wrapper = $(this).parent();
      for (const group of data.channelgroup){
        let foundTimeIndex = y(x, group);

        for (const channelname in group.y){
          wrapper.find('span[data-channelname='+channelname+']').html(group.y[channelname][foundTimeIndex]);
          console.log(
            x,
            foundTimeIndex,
            group.y[channelname][foundTimeIndex]);
        }
      }
    }
  });

  $('#canvas01').mouseleave(function(evt){
    if (evt.offsetX >= $(this).width() || evt.offsetX <= 0 || evt.offsetY >= $(this).height() || evt.offsetY <= 0){
      $('#cursor01').addClass('hide');
    }
  });

  function line(data, container, box, domain, config){
    if (!container) container = $('#plot01');
    if (!box) box = {width:600, height:250};
    if (!config) config = {tick:true, tickCount:10, tickSize:6, viewmode:'seperate'};
    if (!domain) domain = [data.boundary.Xmin, data.boundary.Xmax];
    let canvas = document.createElement('canvas');
    canvas.width = box.width;
    canvas.height= box.height;
    canvas.style = 'z-index: 100;'
    let padding = {bottom:20.5, right:30.5, left:50.5, top:10.5};
    let ctx = canvas.getContext('2d');

    if (data.type == 2){

      let groupcount = data.channelgroup.length;
      for (const [i, group] of data.channelgroup.entries()){

        let y0 = group.boundary.Ymin,
            y1 = group.boundary.Ymax,
            chX = group.x[Object.keys(group.x)[0]];

        let index = -1;
        for (const channelname in group.y){
          ctx.beginPath();

          index++;
          ctx.strokeStyle = color(index);

          for (const [j, value] of group.y[channelname].entries()){
            if (j === 0) {
              ctx.moveTo(
                interpolation(chX[j], domain[0], domain[1], padding.left, box.width - padding.right),
                interpolation(value, y0, y1, padding.top + (i+1)*(box.height - padding.top - padding.bottom)/groupcount, padding.top+i*(box.height - padding.top - padding.bottom)/groupcount)

              );
            } else {
              ctx.lineTo(
                interpolation(chX[j], domain[0], domain[1], padding.left, box.width - padding.right),
                interpolation(value, y0, y1, padding.top + (i+1)*(box.height - padding.top - padding.bottom)/groupcount, padding.top+i*(box.height - padding.top - padding.bottom)/groupcount)

              );
            }

            /*console.log(
              chX[j], x0, x1, padding.left, box.width - padding.right,
              value, y0, y1, padding.top+i*(box.height - padding.top - padding.bottom)/groupcount, padding.top + (box.height - padding.top - padding.bottom)/groupcount,
              "x="+interpolation(chX[j], x0, x1, padding.left, box.width - padding.right),
              "y="+interpolation(value, y0, y1, padding.top + (box.height - padding.top - padding.bottom)/groupcount, padding.top+i*(box.height - padding.top - padding.bottom)/groupcount)
            );*/

          }

          ctx.stroke();
        }

      }
    }
    container.append(canvas);
    return (canvas);
  }
};
/*setInterval(`
  if (window.test01 != undefined){
    test01.line.clear();
    test01.axisLeft.clear();
    test01.axisBottom.clear();
    test01.axisTop.clear();
    test01.axisRight.clear();
  };
  test01=new plot();`, 40);*/
function y(x, group, type = 2){
  if (type == 2){ // x为时间轴
    let xDataArray = group.x[Object.keys(group.x)[0]];
    let foundIndex, diff;
    for (const [index, value] of xDataArray.entries()){
      if (diff == undefined) diff = (x - value);
      if (diff === 0) return index;
      else if ((x-value)*diff < 0) {
        if (Math.abs(x - value) <= Math.abs(diff)) return index;
        else return index - 1;
      }
      diff = (x - value);
    }
  }
}
function boundary(data){
  if (data.type == 2){
    let XMin, XMax, YMin, YMax;

    for (const group of data.channelgroup){
      let Xmin, Xmax, Ymin, Ymax;

      for (const channelname in group.y){
        for (const value of group.y[channelname]){
          if (Ymin == undefined || value < Ymin) Ymin = value;

          if (Ymax == undefined || value > Ymax) Ymax = value;
        }
      }

      for (const value of group.x[Object.keys(group.x)[0]]){
        if (Xmin == undefined || value < Xmin) Xmin = value;

        if (Xmax == undefined || value > Xmax) Xmax = value;
      }

      group.boundary = {
        "Xmin": Xmin,
        "Xmax": Xmax,
        "Ymin": Ymin,
        "Ymax": Ymax
      };

      if (XMin == undefined || Xmin < XMin) XMin = Xmin;
      if (XMax == undefined || Xmax > XMax) XMax = Xmax;
      if (YMin == undefined || Ymin < YMin) YMin = Ymin;
      if (YMax == undefined || Ymax > YMax) YMax = Ymax;
    }
    data.boundary = {
      "Xmin": XMin,
      "Xmax": XMax,
      "Ymin": YMin,
      "Ymax": YMax
    }
  }

  return data;
}


function interpolation(xi, x0, x1, y0, y1){
  return y0 + (xi - x0)*(y0 - y1)/(x0 - x1);
};
function nice(boundary){
  let Xmin = boundary.Xmin,
      Xmax = boundary.Xmax,
      Ymin = boundary.Ymin,
      Ymax = boundary.Ymax;
  let Xmin_E = Xmin.toExponential(1),
      Xmax_E = Xmax.toExponential(1),
      Ymin_E = Ymin.toExponential(1),
      Ymax_E = Ymax.toExponential(1);
  let Xmin_e = parseInt(Xmin_E.split('e')[1]),
      Xmax_e = parseInt(Xmax_E.split('e')[1]),
      Ymin_e = parseInt(Ymin_E.split('e')[1]),
      Ymax_e = parseInt(Ymax_E.split('e')[1]);


}

function axisBottom(container, box, domain, config){
  if (!container) container = $('#plot01');
  if (!box) box = {width:600, height:250};
  if (!domain) domain = [0, 9];
  if (!config) config = {
    tick:true,
    tickCount:6,
    tickSize:6,
    tickMode: 'sides',
    fontSize: 14,
    fontFamily:'Consolas'
  };
  let range = domain[1] - domain[0];
  let canvas = document.createElement('canvas');
  canvas.width = box.width;
  canvas.height= box.height;
  canvas.style = 'z-index: 200';
  let padding = {bottom:20.5, right:30.5, left:50.5, top:10.5};

  let ctx = canvas.getContext('2d');
  ctx.lineWidth = 1;
  ctx.font = config.fontSize+'px '+config.fontFamily;
  ctx.beginPath();
  ctx.moveTo(padding.left, box.height - padding.bottom);
  ctx.lineTo(box.width - padding.right, box.height - padding.bottom);

  if (config.tick){
    for (let i=0; i<config.tickCount; i++){
      ctx.moveTo(
        padding.left + parseInt(i*(box.width - padding.left - padding.right)/(config.tickCount-1)),
        box.height-padding.bottom
      );
      ctx.lineTo(
        padding.left + parseInt(i*(box.width - padding.left - padding.right)/(config.tickCount-1)),
        box.height-padding.bottom + config.tickSize
      );
      let drawText = false;
      if (config.tickMode === 'sides'){
        if (i === 0 || i === config.tickCount-1) drawText = true;
      }
      if (drawText){
        const text = (domain[0]+i*range/(config.tickCount-1)).toPrecision(2);
        ctx.fillText(
          text,
          padding.left + parseInt(i*(box.width - padding.left - padding.right)/(config.tickCount-1)) - parseInt(config.fontSize*text.length/3),
          box.height-padding.bottom + config.tickSize + parseInt(config.fontSize*0.8)
        );
      }
    }
  }

  ctx.stroke();
  container.append(canvas);
  return canvas;
}

function axisTop(container, box, config){
  if (!container) container = $('#plot01');
  if (!box) box = {width:600, height:250};
  if (!config) config = {tick:false, tickCount:10, tickSize:6};
  let canvas = document.createElement('canvas');
  canvas.width = box.width;
  canvas.height= box.height;
  canvas.style = 'z-index: 200';

  let padding = {bottom:20.5, right:30.5, left:50.5, top:10.5};

  let ctx = canvas.getContext('2d');
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(box.width - padding.right, padding.top);

  if (config.tick){
    for (let i=0; i<config.tickCount; i++){
      ctx.moveTo(
        padding.left + parseInt(i*(box.width - padding.left - padding.right)/(config.tickCount-1)),
        padding.top
      );
      ctx.lineTo(
        padding.left + parseInt(i*(box.width - padding.left - padding.right)/(config.tickCount-1)),
        padding.top - config.tickSize
      );
    }
  }

  ctx.stroke();
  container.append(canvas);
  return canvas;
}

function axisLeft(container, box, domain, config){
  if (!container) container = $('#plot01');
  if (!box) box = {width:600, height:250};
  if (!domain) domain = [0, 9];
  if (!config) config = {
    stack: true,
    tick:true,
    tickCount:2,
    tickSize:6,
    tickMode: 'sides',
    fontSize: 14,
    fontFamily: 'Consolas'
  };
  let canvas = document.createElement('canvas');
  canvas.width = box.width;
  canvas.height= box.height;
  canvas.style = 'z-index: 200';

  let padding = {bottom:20.5, right:30.5, left:50.5, top:10.5};
  let range = domain[1] - domain[0];
  let ctx = canvas.getContext('2d');
  ctx.lineWidth = 1;
  ctx.font = config.fontSize+'px '+config.fontFamily;

  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, box.height - padding.bottom);

  if (config.tick){
    for (let i=0; i<config.tickCount; i++){
      ctx.moveTo(
        padding.left,
        padding.top + parseInt(i*(box.height - padding.top - padding.bottom)/(config.tickCount-1))
      );
      ctx.lineTo(
        padding.left - config.tickSize,
        padding.top + parseInt(i*(box.height - padding.top - padding.bottom)/(config.tickCount-1))
      );

      let drawText = false;
      if (config.tickMode === 'sides'){
        if (i === 0 || i === config.tickCount-1) drawText = true;
      }
      if (drawText){
        const text = (domain[1] - i*range/(config.tickCount-1)).toPrecision(2);
        ctx.fillText(
          text,
          padding.left - config.tickSize - text.length*config.fontSize*0.6,
          padding.top + parseInt(i*(box.height - padding.top - padding.bottom)/(config.tickCount-1)) + config.fontSize*0.4
        );
      }
    }
  }

  ctx.stroke();
  container.append(canvas);
  return canvas;
}

function axisRight(container, box, config){
  if (!container) container = $('#plot01');
  if (!box) box = {width:600, height:250};
  if (!config) config = {tick:false, tickCount:5, tickSize:6};
  let canvas = document.createElement('canvas');
  canvas.width = box.width;
  canvas.height= box.height;
  canvas.style = 'z-index: 200';

  let padding = {bottom:20.5, right:30.5, left:50.5, top:10.5};

  let ctx = canvas.getContext('2d');
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(box.width - padding.right, padding.top);
  ctx.lineTo(box.width - padding.right, box.height - padding.bottom);

  if (config.tick){
    for (let i=0; i<config.tickCount; i++){
      ctx.moveTo(
        box.width - padding.right,
        padding.top + parseInt(i*(box.height - padding.top - padding.bottom)/(config.tickCount-1))
      );
      ctx.lineTo(
        box.width - padding.right + config.tickSize,
        padding.top + parseInt(i*(box.height - padding.top - padding.bottom)/(config.tickCount-1))
      );
    }
  }

  ctx.stroke();
  container.append(canvas);
  return canvas;
}

function border(){}

function grid(){}

function legend(container, box, data, config){
  if (!container) container = $('#plot01');
  if (!box) box = {width:600, height:250};
  if (!config) config = {tick:true, tickCount:10, tickSize:6, fontSize: 14, fontFamily:'Consolas'};
  let padding = {bottom:20.5, right:30.5, left:50.5, top:10.5};
  let div = document.createElement('div');
  div.style = `
    position:absolute;
    left: 610px;
    width: 300px;
    height: 250px;
    padding-top: `+padding.top+`px;
    padding-bottom: `+padding.bottom+`px;
    `;


  let groupcount = data.channelgroup.length;
  for (const [i, group] of data.channelgroup.entries()){
    let subdiv = document.createElement('div');
    subdiv.style = 'width:100%; height:'+(100/groupcount)+'%; overflow:hidden;'

    let j = -1;
    for (const channelname in group.y){
      j++;

      let row = document.createElement('div');
      row.className = 'plot-legend-row';

      let span0 = document.createElement('span');
      span0.className = 'plot-legend-cursor-value';
      span0.setAttribute('data-channelname', channelname);

      let span1 = document.createElement('span');
      span1.className = 'plot-legend-swatch';
      span1.style = 'background: '+color(j)

      let span2 = document.createElement('span');
      span2.className = 'plot-legend-title';
      span2.innerHTML = channelname;

      row.append(span0);
      row.append(span1);
      row.append(span2);
      subdiv.append(row);
    }

    div.append(subdiv);

  }

  container.append(div);
}

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
}

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
}
function min(array){
  if (array.constructor.name === 'Array'){
    let returnValue = Infinity;
    for (const i of array){
      if (i < returnValue) returnValue = i;
    }
    return returnValue;
  }
}

function max(array){
  if (array.constructor.name === 'Array'){
    let returnValue = -Infinity;
    for (const i of array){
      if (i > returnValue) returnValue = i;
    }
    return returnValue;
  }
}
