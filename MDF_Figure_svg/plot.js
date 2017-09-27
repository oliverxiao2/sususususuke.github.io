Figure.prototype.addPlot = function(options) {
	// 如果没有正确参数，施主还是请回吧
	if (typeof options != 'object') return null;

	var defaultSetting = {
		lineWidth: 1.5,
		lineJoin: 'square',
		lineCap: 'butt',
		sampleRatio: 1,
	};

	var parentWrapper = this.wrapper;
	var canvas = document.createElement('canvas');
	canvas.setAttribute('data-element-type', 'plot');
	canvas.style.display = 'none';
	canvas.figureElementType = 'plot';
	canvas.parent = this;

	const svgDom = document.createElementNS('http://www.w3.org/2000/svg','svg');
	svgDom.setAttribute('width', parentWrapper.clientWidth);
	svgDom.setAttribute('height', parentWrapper.clientHeight);
	svgDom.style.position = 'absolute';
	parentWrapper.appendChild(svgDom);

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

		 	xDomain = setting.xWinDomain?setting.xWinDomain:setting.xAxis.setting.domain,
		 	yDomain = setting.yWinDomain?setting.yWinDomain:setting.yAxis.setting.domain,

		 	x, y;

		 if (setting.isBit) {
		 	const result = collectToggle(setting.x, setting.y, xDomain);
		 	x = result.x;
		 	y = result.y; 
		 } else {
		 	const result = resample(setting.x, setting.y, (xRange[1] - xRange[0])*setting.sampleRatio, xDomain);
		 	x = result.x;
		 	y = result.y;
		 }
		 	

		let xOffset = x.map( x => (parseInt(interpolate(x, xDomain[0], xDomain[1], xRange[0], xRange[1]) +0.5))),
		 	yOffset = y.map( y => (parseInt(interpolate(y, yDomain[0], yDomain[1], yRange[0], yRange[1]) )+0.5) );

		let ctx = this.getContext('2d');
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

	 	const lineData = xOffset.map(function (d, i) {return {x:d, y:yOffset[i]}});
	 	const line = d3.line().x(d => d.x).y(d => d.y).curve(d3.curveStepAfter);
	 	d3.select(svgDom).append('g').append('path')
	 		.attr('d', line(lineData))
	 		.attr('stroke', 'red')
	 		.attr('stroke-width', 1)
	 		.attr('fill', 'none');


		function slice(x, y, domainX) {
			let i = 0, j = 0, newX = [], newY = [];

			if (domainX) {
				if (domainX[0] < x[0]) i = 0;
				if (domainX[1] > x[x.length - 1]) j = x.length - 1;
				else {
					i = binaryFuzzyLookup(x, domainX[0]).index;
					j = binaryFuzzyLookup(x, domainX[1]).index;
				}
				newX = x.slice(i>1?i-1:0, j+2);
				newY = y.slice(i>1?i-1:0, j+2);				
			} else {
				newX = x;
				newY = y;
			}

			return {newX, newY};
		}

		function resample (x, y, count, domain) {
			const {newX, newY} = slice(x, y, domain);

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

		function collectToggle(x, y, domain) {
			let output = {x:[], y:[]};
			const {newX, newY} = slice(x, y, domain);

			output.x.push(newX[0]);
			output.y.push(newY[0]);

			for (let i = 1; i < newY.length; i++) {
				if (newY[i] != newY[i-1]) {
					output.x.push(newX[i]);
					output.y.push(newY[i]);
				}
			}

			output.x.push(newX[newX.length - 1]);
			output.y.push(newY[newY.length - 1]);

			return output;
		}

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