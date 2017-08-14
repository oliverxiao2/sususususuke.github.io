Figure.prototype.addPlot = function(options) {
	// 如果没有正确参数，施主还是请回吧
	if (typeof options != 'object') return null;

	var defaultSetting = {
		lineWidth: 1.5,
		lineJoin: 'square',
		lineCap: 'butt',
		sampleRatio: 5,
	};

	var parentWrapper = this.wrapper;
	var canvas = document.createElement('canvas');
	canvas.figureElementType = 'plot';
	canvas.parent = this;

	const params = Object.keys(options);
	if (params.length === 1 && params[0] === 'channel') {
		canvas.setting = Object.assign({}, defaultSetting, options.channel);
	} else {
		canvas.setting = Object.assign({}, defaultSetting, options);	
	}

	canvas.style.position = 'absolute';
	canvas.width = canvas.setting.xAxis.setting.xEnd - canvas.setting.xAxis.setting.xStart;
	canvas.height = canvas.setting.yAxis.setting.yStart - canvas.setting.yAxis.setting.yEnd;
	canvas.style.left = canvas.setting.xAxis.setting.xStart;
	canvas.style.top = canvas.setting.yAxis.setting.yEnd;
	//canvas.style.left = canvas.setting.xAxis.setting.xStart;
	//canvas.style.top = canvas.setting.yAxis.setting.yEnd;

	parentWrapper.appendChild(canvas);
	this.plotCollection.push(canvas);

	canvas.draw = function (channel) {
		const setting = Object.assign(this.setting, channel);

		const xSampleCount = setting.x.length,
			  ySampleCount = setting.y.length;
		// 如果时间轴和y轴的采样数量不一致，提示用户检查，并返回false
		if (xSampleCount != ySampleCount) { console.log('x & y hava different counts of samples, please check'); return false;}

		let ySpineWidth = Math.round(setting.yAxis.setting.spineWidth/2);

		let xRange  = [1, this.width-1],
		 	yRange  = [this.height-1, 1],

		 	xDomain = setting.xAxis.setting.domain,
		 	yDomain = setting.yAxis.setting.domain,

		 	{x, y}  = resample(setting.x, setting.y, (xRange[1] - xRange[0])*setting.sampleRatio, xDomain),

		 	xOffset = x.map( x => (interpolate(x, xDomain[0], xDomain[1], xRange[0], xRange[1]) )),
		 	yOffset = y.map( y => (interpolate(y, yDomain[0], yDomain[1], yRange[0], yRange[1]) )),

		 	ctx	 	= this.getContext('2d');

	 	ctx.beginPath();
	 	ctx.lineWidth = setting.lineWidth;
	 	ctx.strokeStyle = setting.color;
	 	ctx.lineJoin = setting.lineJoin;
	 	ctx.lineCap = setting.lineCap;

	 	ctx.moveTo(xOffset[0], yOffset[0]);
	 	//let startMove = false;
	 	for (let k = 1; k < xOffset.length; k++) {
	 		//if (xOffset[k] >= xRange[0] && xOffset[k] <= xRange[1] && yOffset[k] >= yRange[1] && yOffset[k] <= yRange[0]) {
	 			/*if (!startMove) {
	 				ctx.moveToS(xOffset[k], yOffset[k-1]);
	 				ctx.moveToS(xOffset[k], yOffset[k]);
	 				startMove = true;
	 			} else {*/
	 				ctx.lineTo(xOffset[k], yOffset[k-1]);
	 				ctx.lineTo(xOffset[k], yOffset[k]);
	 				 			
	 		//}
	 		
	 	}
	 	ctx.stroke();

		
		function resample (x, y, count, domain) {
			
			let i = 0, j = 0, newX = [], newY = [];

			if (domain) {
				if (domain[0] < x[0]) i = 0;
				if (domain[1] > x[x.length - 1]) j = x.length - 1;
				else {
					i = binaryFuzzyLookup(x, domain[0]).index;
					j = binaryFuzzyLookup(x, domain[1]).index;
				}
				newX = x.slice(i, j+1);
				newY = y.slice(i, j+1);
				
			} else {
				newX = x;
				newY = y;
			}

			const n = newX.length;
			if (count >= n) {
				return {
					x: newX,
					y: newY,
				};
			} else {
				const sampleInterval = (n - 1)/(count - 1);
				let _x = [], _y = [];
				for (let i=0; i<=n; i+=sampleInterval){
				  _x.push(newX[Math.round(i)]);
				  _y.push(newY[Math.round(i)]);
				}
				return {x: _x, y:_y};
			}
		};

		// 模糊二分法单调数组查询
		function binaryFuzzyLookup (array, target) {
			let low = 0,				
				high = array.length - 1,
				mid = parseInt((low + high) / 2),
				diff = NaN,
				oldDiff = Infinity,
				candidates = [],
				direction = 1;

			if (target < array[0] || target > array[high]) return NaN;
			if (array[0] === target) return {index: 0, value: array[0]};
			if (array[high] === target) return {index: high, value: array[high]};

			while (array[mid] != target) {
				diff = array[mid] - target;

				if (diff > 0) {
					if ( (array[mid] - target) * (array[mid-1] - target) < 0) {
						if (Math.abs(array[mid] - target) >= Math.abs(array[mid-1] - target)) {
							return {index: mid-1, value: array[mid-1]};
						} else {
							return {index: mid, value: array[mid]};
						}
					}

					high = mid;
					mid  = parseInt((low + high) / 2);

				} else if (diff < 0) {
					if ( (array[mid] - target) * (array[mid+1] - target) < 0) {
						if (Math.abs(array[mid] - target) >= Math.abs(array[mid+1] - target)) {
							return {index: mid+1, value: array[mid+1]};
						} else {
							return {index: mid, value: array[mid]};
						}
					}

					low  = mid;
					mid  = parseInt((low + high) / 2);					
				}

			}

			return {index: mid, value:array[mid]};			
		};		
	};

	return canvas;
};