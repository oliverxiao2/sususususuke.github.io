var Figure = function(parent, type, options){
	var defaultSetting = {
		width: '100%',
		height: '100%',
		mainCanvasMargin: [50, 400, 50, 50],

		mode: 'multiY', // 'multiY' | 'singleY'
		shareYAxisMode: 'signal', // 'unit' | 'signal'

		background: 'white',

		legendTableWidth: 300,
		legendTablePadding: 5,
		legendTableRowHeight: 16,
		bitChannelFixedHeight: 24,
		bitChannelFixedMargin: 5,
		axisBottomFixedHeight: 30,
		axisLeftFixedWidth: 70,
		axisRightFixedWidth: 70,
		axisTopHeight: 12,
		fluidGroupMargin: 12,
		floatDigit: 3,
	}

	const me = this;

	this.parentWrapper = parent;

	this.setting = Object.assign({}, defaultSetting, options);

	this.type = type;

	this.id = '' + parseInt(performance.now()) + '-' + Math.random().toString().substr(2);

	this.state = 'idle';
	this.actionTarget = null;

	this.data = {
		channels: [],
		mdfs:[],
	};

	this.layout = {
		groups: [],
		bitGroup: [],
	};

	this.bgLayer = null;


	this.resetLayout = function () {
		this.axis.axisBottom.configs = [];
	};

	// =======================================================
	//  ========== 生成div，添加到DOM =============
	var wrapper = document.createElement('div');	
	wrapper.addEventListener('mousedown', mousedownHandler);
	wrapper.addEventListener('mousemove', mousemoveHandler);
	wrapper.addEventListener('mouseup', mouseupHandler);
	wrapper.addEventListener('mousewheel', mousewheelHandler);
	wrapper.addEventListener('contextmenu', contextmenuHandler);

	wrapper.style.width  = this.setting.width;
	wrapper.style.height = this.setting.height; 
	wrapper.style.position = 'relative';

	if (parent && parent.appendChild) {
		parent.appendChild(wrapper);
		this.wrapper = wrapper;
		wrapper.parent = me;
	}
	// ============================================

	// ================ 生成工具栏 ================
	const fileInput = document.createElement('input');
	fileInput.type= 'file';
	fileInput.style.display = 'none';
	fileInput.addEventListener('change', fileInputChangeHandler);
	wrapper.appendChild(fileInput);

	let _contextmenuhtml = `
		<div id="figure-contextmenu-`+ me.id +`" class="easyui-menu" style="width:200px;">
			<div id="figure-contextmenu-fileInput-`+ me.id +`">关联文件</div>
			<div id="figure-contextmenu-addData-`+ me.id +`">添加通道</div>
			<div id="figure-contextmenu-props-`+ me.id +`">属性</div>
			<div id="figure-contextmenu-exit-`+ me.id +`">退出</div>
		</div>
	`;
	$(wrapper).append(_contextmenuhtml);

	$('#figure-contextmenu-fileInput-'+me.id).click(function () { fileInput.click(); })
	
	$('#figure-contextmenu-addData-'+me.id).click(function () { addDataBtnClickHandler(); });

	$('#figure-contextmenu-props-'+me.id).click(function () {  });

	$('#figure-contextmenu-exit-'+me.id).click(function () {
		const img = me.rootParent.img;
		img.src = me.export();
		$(me.rootParent.fullScreenWrapper).fadeOut();
	});
	// ========================================================

	this.axisCollection = {
		axisLeftCollection: [],
		axisBottomCollection: [],
		axisRightCollection: [],
		axisTopCollection: [],
	};

	this.plotCollection = [];

	this.legendTable = null;

	// 可交互的区域在此注册
	/*this.hotspot = {
		axisLeftCollection: [],
		axisBottomCollection: [],
		axisRightCollection: [],
		axisTopCollection: [],
		legendTable: [],
	};*/

	function mousedownHandler (e) {
		const x = e.offsetX, y = e.offsetY;
		const where = me.whereFocused(x, y);

		if (e.buttons != 1 || !where) return false;

		const _type = where.type;
		me.actionTargetType = _type;

		if (_type === 'group' || _type === 'axisLeft' || _type === 'axisBottom') {
			if (me.state === 'idle' && (!e.altKey) && (!e.shiftKey) && (!e.ctrlKey) ) {
				// 进入平移状态
				me.state = 'pan';				
				me.actionTarget = where.target;
				me.setting.action = 'repaint';
			}
		}

		else if (_type === 'legendTableItem') {
			const focusedChannel = where.target;

			for (const theChannel of me.legendTable.setting.channels) {
				theChannel.plot.style.zIndex = 50;
				theChannel.plot.style.opacity = 0.5;
			}

			focusedChannel.plot.style.zIndex = 99;
			focusedChannel.plot.style.opacity = 1;

		}
	};

	function mouseupHandler (e) {
		me.state = 'idle';
		me.actionTarget = null;
	};

	// 注意这里的平移和缩放逻辑有问题，未来可能会出现一个组内绘制多个文件的通道的情况
	function mousemoveHandler (e) {
		if (me.state === 'pan' && me.actionTargetType === 'group') {
			// 平移也分为x轴平移、y轴平移和任意平移
			const group = me.actionTarget;
			const axisBottom = group.channels[0].xAxis;
			const [domainXMin, domainXMax] = axisBottom.setting.domain;

			const rangeX = axisBottom.setting.xEnd - axisBottom.setting.xStart;
			const rangeY = group.axisLeftCollection[0].setting.yStart - group.axisLeftCollection[0].setting.yEnd;

			// 必须给定精度，否则javascript的数字特性会导致1 = 1.0000000000000001
			const domainOffsetX = (e.movementX * (domainXMax - domainXMin) / rangeX).toDigit();
			let domainOffsetY;

			// 检测没有按下shift键，y方向可以平移 //****应该用group.axisLeftCollection
			if (!e.shiftKey) {
				let axisLeftDomain;
				for (const channel of group.channels) {
					axisLeftDomain = channel.yAxis.setting.domain;					
					domainOffsetY  = (e.movementY * (axisLeftDomain[1] - axisLeftDomain[0]) / rangeY).toDigit();
					channel.yAxis.setting.domain = [(axisLeftDomain[0] + domainOffsetY).toDigit(), (axisLeftDomain[1] + domainOffsetY).toDigit()];
					channel.yAxis.setting.domainMode = 'original';
					channel.yAxis.clearAll();
					channel.yAxis.draw();
				}
			}

			// 检测没有按下alt键，x方向可以平移
			if (!e.altKey) {
				axisBottom.setting.domain = [(domainXMin - domainOffsetX).toDigit(), (domainXMax - domainOffsetX).toDigit()];
				axisBottom.setting.domainMode = 'original';
				axisBottom.clearAll();
				axisBottom.draw();
			}

			for (const channel of axisBottom.setting.channels) {
				channel.plot.clearAll();
				channel.plot.draw(channel);
			}
		}

		else if (me.state === 'pan' && me.actionTargetType === 'axisLeft') {
			const axisLeft = me.actionTarget;
			const range = axisLeft.setting.yStart - axisLeft.setting.yEnd;
			const [dMin, dMax] = axisLeft.setting.domain;
			const domainOffset = (e.movementY * (dMax - dMin) / range).toDigit();

			axisLeft.setting.domain = [(dMin + domainOffset).toDigit(), (dMax + domainOffset).toDigit()];
			axisLeft.setting.domainMode = 'original';
			axisLeft.clearAll();
			axisLeft.draw();

			const channels = axisLeft.setting.channels;

			for (const channel of channels) {
				channel.plot.clearAll();
				channel.plot.draw(channel);
			}
		}

		else if (me.state === 'pan' && me.actionTargetType === 'axisBottom') {
			const axisBottom = me.actionTarget;

			const [domainXMin, domainXMax] = axisBottom.setting.domain;
			const rangeX = axisBottom.setting.xEnd - axisBottom.setting.xStart;
			const domainOffsetX = (e.movementX * (domainXMax - domainXMin) / rangeX).toDigit();

			axisBottom.setting.domain = [(domainXMin - domainOffsetX).toDigit(), (domainXMax - domainOffsetX).toDigit()];
			axisBottom.setting.domainMode = 'original';
			axisBottom.clearAll();
			axisBottom.draw();

			for (const channel of axisBottom.setting.channels) {
				channel.plot.clearAll();
				channel.plot.draw(channel);
			}
		}
	};

	function mousewheelHandler (e) {
		const where = me.whereFocused(e.offsetX, e.offsetY);
		if (!where) return false;

		if (where.type === 'group') {
			if (e.ctrlKey || e.altKey || e.shiftKey) e.preventDefault();
			const group = where.target;
			const axisBottom = group.channels[0].xAxis;

			// 缩放x轴（时间轴）
			if (e.shiftKey || e.ctrlKey) {
				let scaleRatio;
				if (e.deltaY > 0) scaleRatio = 0.8;
				else scaleRatio = 1.25;
				
				const x = e.offsetX - axisBottom.setting.xStart - 1;
				const [x0, x1] = axisBottom.setting.domain;
				const [range0, range1] = [axisBottom.setting.xStart, axisBottom.setting.xEnd];
				const k = x / (range1 - range0 - x);
				const x0_new = x0 + (x1 - x0)*(scaleRatio-1)*k/scaleRatio/(1+k);
				const x1_new = x1 - (x1 - x0)*(scaleRatio-1)/scaleRatio/(1+k);

				axisBottom.setting.domain = [x0_new, x1_new];
				axisBottom.clearAll();
				axisBottom.draw();
			}

			// 缩放关联的y轴
			if (e.altKey || e.ctrlKey) {
				for (const axisLeft of group.axisLeftCollection) {
					let scaleRatio;
					if (e.deltaY > 0) scaleRatio = 0.8;
					else scaleRatio = 1.25;
					
					const y = e.offsetY;
					const [y0, y1] = axisLeft.setting.domain;
					const [range0, range1] = [axisLeft.setting.yStart, axisLeft.setting.yEnd];
					const k = (y - range0 - 1) / (range1 - y + 1);
					const y0_new = y0 + (y1 - y0)*(scaleRatio-1)*k/scaleRatio/(1+k);
					const y1_new = y1 - (y1 - y0)*(scaleRatio-1)/scaleRatio/(1+k);

					axisLeft.setting.domain = [y0_new, y1_new];
					axisLeft.setting.domainMode = 'original';
					axisLeft.clearAll();
					axisLeft.draw();
				}
			}

			// 缩放关联的绘图区的折线
			for (const channel of axisBottom.setting.channels) {
				channel.plot.clearAll();
				channel.plot.draw();
			}			
		}

		else if (where.type === 'axisLeft') {
			const axisLeft = where.target;

			let scaleRatio;
			if (e.deltaY > 0) scaleRatio = 0.8;
			else scaleRatio = 1.25;
			
			const y = e.offsetY;
			const [y0, y1] = axisLeft.setting.domain;
			const [range0, range1] = [axisLeft.setting.yStart, axisLeft.setting.yEnd];
			const k = (y - range0 - 1) / (range1 - y + 1);
			const y0_new = y0 + (y1 - y0)*(scaleRatio-1)*k/scaleRatio/(1+k);
			const y1_new = y1 - (y1 - y0)*(scaleRatio-1)/scaleRatio/(1+k);

			axisLeft.setting.domain = [y0_new, y1_new];
			axisLeft.setting.domainMode = 'original';
			axisLeft.clearAll();
			axisLeft.draw();

			for (const channel of axisLeft.setting.channels) {
				channel.plot.clearAll();
				channel.plot.draw();	
			}
		}

		else if (where.type === 'axisBottom') {
			const axisBottom = where.target;

			transformLinearAxis('scale', axisBottom, e);

			for (const channel of axisBottom.setting.channels) {
				channel.plot.clearAll();
				channel.plot.draw();
			}
		}
	};

	function contextmenuHandler (e) {
		e.preventDefault();
		$('#figure-contextmenu-'+ me.id).menu('show', {
			left: e.pageX,
			top:  e.pageY,
		});
	};

	function fileInputChangeHandler () {
		const file = this.files[0];
		const reader = new FileReader();
		reader.onload = function (e) {
			const arrayBuffer = e.target.result;
			const mdf = new MDF(arrayBuffer, false);
			if (mdf) me.data.mdfs.push(mdf);
		}
		if (file) reader.readAsArrayBuffer(file);		
	};

	function addDataBtnClickHandler () {
		const mdfs = me.data.mdfs;
		const latestMDF = mdfs[mdfs.length - 1];
		me.addData(latestMDF, ['nmot_w', 'rl_w', 'B_st']);
		me.draw({action: 'rebuild'});
	};

	function transformLinearAxis (type, axis, event) {
		if (!type || !axis || !event) return false;
		if (type === 'scale') {
			let scaleRatio;
			if (event.deltaY > 0) scaleRatio = 0.8;
			else scaleRatio = 1.25;

			let _xy,
				_pos = axis.setting.position;
			if (_pos === 'Left' || _pos === 'Right') _xy = event.offsetY;
			else if (_pos === 'Bottom' || _pos === 'Top') _xy = event.offsetX;

			const [d0, d1] = axis.setting.domain;
			const [range0, range1] = axis.setting.range;
			const k = (_xy - range0 - 1) / (range1 - _xy + 1);
			const d0_new = d0 + (d1 - d0)*(scaleRatio-1)*k/scaleRatio/(1+k);
			const d1_new = d1 - (d1 - d0)*(scaleRatio-1)/scaleRatio/(1+k);

			axis.setting.domain = [d0_new, d1_new];
			axis.setting.domainMode = 'original';
			axis.clearAll();
			axis.draw();
		}

		else if (type === 'pan') {
		}
	}
};

Figure.prototype.whereFocused = function (x, y) {
	if (x > (this.width - this.setting.legendTableWidth)) {
		for (const [i, channel] of this.legendTable.setting.channels.entries()) {
			if (y > i * this.setting.legendTablePadding && y < (i+1)*this.setting.legendTableRowHeight) {
				return {type: 'legendTableItem', target:channel};
			}
		}
	} else if (this.axisCollection.axisBottomCollection.length > 0 && x > this.axisCollection.axisBottomCollection[0].setting.xStart && x <= this.axisCollection.axisBottomCollection[0].setting.xEnd) {
		if (y > this.axisCollection.axisBottomCollection[0].setting.yStart) {
			for (const axisBottom of this.axisCollection.axisBottomCollection) {
				if (y > axisBottom.setting.yStart && y < axisBottom.setting.yStart + this.setting.axisBottomFixedHeight) {
					return {type: 'axisBottom', target: axisBottom};
				}
			}
		} else if (y > this.setting.axisTopHeight) {
			if (this.layout.bitGroup.length > 0 && y > this.axisCollection.axisBottomCollection[0].setting.yStart - this.layout.bitGroup.length * (this.setting.bitChannelFixedHeight + this.setting.bitChannelFixedMargin) ) {
				return {type: 'bitGroup', target: this.layout.bitGroup};
			} else {
				for (const group of this.layout.groups) {
					const setting = group.axisLeftCollection[0].setting;
					if (y > setting.yEnd && y < setting.yStart) {
						return {type:'group', target:group};
					}
				}
			}
		}
	} else {
		for (const axisLeft of this.axisCollection.axisLeftCollection) {
			if (x > axisLeft.setting.xStart - this.setting.axisLeftFixedWidth) {
				return {type: 'axisLeft', target: axisLeft};
			}
		}
	}

	return null;
};

Figure.prototype.addAxis = null;

Figure.prototype.addData = null;

Figure.prototype.loadData = null;

Figure.prototype.removeData = null;

Figure.prototype.draw = null;

Figure.prototype.empty = null;

Figure.prototype.remove = null;

Figure.prototype.export = null;

Object.defineProperty(Figure.prototype, 'width', {
	get: function () { return this.wrapper.clientWidth; },
});

Object.defineProperty(Figure.prototype, 'height', {
	get: function () { return this.wrapper.clientHeight; },
});

function interpolate(xi, x0, x1, y0, y1){
  return y0 + (xi - x0)*(y0 - y1)/(x0 - x1);
};

HTMLCanvasElement.prototype.clearAll = function () {
	this.getContext('2d').clearRect(0, 0, this.width, this.height);
}

CanvasRenderingContext2D.prototype.moveToS = function(x, y){
	var offset = (this.lineWidth % 2 == 1)?0.5:0;
	this.moveTo(parseInt(x) + offset, parseInt(y) + offset);
}

CanvasRenderingContext2D.prototype.lineToS = function(x, y){
	var offset = (this.lineWidth % 2 == 1)?0.5:0;
	this.lineTo(parseInt(x) + offset, parseInt(y) + offset);
}

function getChannelsSharedDomain(channels, xy='x') {
	let dmin = Infinity, dmax = -Infinity;
	channels.forEach(function (channel) {
		if (dmin > channel[xy+'Domain'][0]) dmin = channel.xDomain[0];
		if (dmax < channel[xy+'Domain'][1]) dmax = channel.xDomain[1];
	});
	return [dmin, dmax];
}

Number.prototype.toDigit = function (digit=3) {
	return parseFloat(this.toFixed(digit));
	/*let string = this.toFixed(digit);
	
	const m = string.length;
	for (let i=0; i<digit; i++) {
		if (string[m-1-i] === '0') string = string.substring(0, m-1-i);
		else break;
	}

	const n = string.length;
	if (string[n-1] === '.') string = string.substring(0, n-1);
	return string; */
}

Figure.extent = function (numArray) {
	let min, max;
	for (const item of numArray) {
		if (item > max || max === undefined) max = item;
		if (item < min || min === undefined) min = item;
	}
	return [min, max];
};