Figure.prototype.addAxis = function(options){
	const parentWrapper = this.wrapper;
	const canvas = document.createElement('canvas');

	canvas.defaultSetting = {
		position: 'Bottom',
		visible: true,

		domainMode: 'original', // 'original' | 'round-center'

		background: '',

		showSpine: true,
		showTick: true,
		showSubTick: true,
		showText: true,
		showGrid: true,
		showBorder: false,
		showAlias: true,

		spineWidth: 1,
		spineColor: '#303f9f',

		tickCount: 2,
		tickColor: '#303f9f',
		tickWidth: 1,
		tickSize: 6,
		tickDirection: 'outer',

		subTickCount: 2,
		subTickColor: '#303f9f',
		subTickWidth: 1,
		subTickSize: 3,

		textMode: 'mainTick',
		textColor: '#303f9f',
		fontSize: 12,
		fontFamily: 'Consolas',
		fontDigital: undefined,
		fontWidth: NaN,
		fontMarginLeft: 2,
		fontMarginTop: 4,
		fontMarginRight: 2,
		fontMarginBottom: 2,

		gridMode: 'mainTick',
		gridColor: '#666',
		gridWidth: 1,

		marginLeft: 2,
		marginTop: 2,
		marginRight: 2,
		marginBottom: 2,

		alias: 'alias',
		channels: [],
		fileSource: null,
	};

	canvas.width = parentWrapper.clientWidth;
	canvas.height = parentWrapper.clientHeight;
	canvas.style.position = 'absolute';

	canvas.configs = [];
	canvas.setting = {};
	canvas.setting.figureElementType = 'axis';
	canvas.setting.tickCount = 2;
	canvas.setting.xStart = 100;
	canvas.setting.xEnd = canvas.width - 300;
	canvas.setting.yStart = canvas.height - 100;
	canvas.setting.yEnd = 100;
	canvas.setting.domain = [0, 10],
	canvas.setting.ticks = [];
	canvas.setting.subTicks = [];
	canvas.setting.axisWidth = 0;
	canvas.setting.axisHeight = 0;
	canvas.setting = Object.assign(canvas.setting, canvas.defaultSetting, options);
	canvas.setAttribute('data-element-type', 'axis'+canvas.setting.position);
	canvas.parent = this;

	parentWrapper.appendChild(canvas);
	this.axisCollection['axis'+canvas.setting.position+'Collection'].push(canvas);

	canvas.draw = function (){
		//console.time('drawAxis');
		let setting = this.setting;
		var position = setting.position;
		var ctx = this.getContext('2d');

		layout(this);

		if (setting.visible) {
			if (setting.background) {
				ctx.fillStyle = setting.background;
		 		ctx.fillRect(setting.xStart+1, setting.yEnd, setting.xEnd - setting.xStart - 1, setting.yStart - setting.yEnd + 1);
			}

			if (setting.showSpine) {
				ctx.beginPath();
				ctx.lineWidth = setting.spineWidth;
				ctx.strokeStyle = setting.spineColor;

				if (position === 'Bottom' || position === 'Top') {
					ctx.moveToS(setting.xStart, setting.yStart);
					ctx.lineToS(setting.xEnd, setting.yStart);
				} else if (position === 'Left' || position === 'Right') {
					ctx.moveToS(setting.xStart, setting.yStart);
					ctx.lineToS(setting.xStart, setting.yEnd);
				}

				ctx.stroke();
			}

			if (setting.showTick) {
				let tickHere  = 0,	// tick的位置
					tickLength = 0, // tick的长度，可以为负数

					printText   = '',
					textOffsetX = 0,
					textOffsetY = 0;

				ctx.beginPath();
				ctx.lineWidth = setting.tickWidth;
				ctx.strokeStyle = setting.tickColor;

				for (const val of setting.ticks) {
					if (val >= setting.domain[0] && val <= setting.domain[1]) {

						printText = val.toFixed(2);

						if (position === 'Bottom') {
							tickHere = interpolate(val, setting.domain[0], setting.domain[1], setting.xStart, setting.xEnd);
							tickLength = setting.tickSize*(setting.tickDirection==='outer'?1:-1);
							ctx.moveToS(tickHere, setting.yStart);
							ctx.lineToS(tickHere, setting.yStart + tickLength);
						} else if (position === 'Top') {
							tickHere = interpolate(val, setting.domain[0], setting.domain[1], setting.xStart, setting.xEnd);
							tickLength = setting.tickSize*(setting.tickDirection==='outer'?-1:1);
							ctx.moveToS(tickHere, setting.yStart);
							ctx.lineToS(tickHere, setting.yStart + tickLength);
						} else if (position === 'Left') {
							tickHere = interpolate(val, setting.domain[0], setting.domain[1], setting.yStart, setting.yEnd);
							tickLength = setting.tickSize*(setting.tickDirection==='outer'?-1:1);
							ctx.moveToS(setting.xStart, tickHere);
							ctx.lineToS(setting.xStart + tickLength, tickHere);
						} else if (position === 'Right') {
							tickHere = interpolate(val, setting.domain[0], setting.domain[1], setting.yStart, setting.yEnd);
							tickLength = setting.tickSize*(setting.tickDirection==='outer'?1:-1);
							ctx.moveToS(setting.xStart, tickHere);
							ctx.lineToS(setting.xStart + tickLength, tickHere);
						}
					}
				}

				ctx.stroke();
			}

			if (setting.showSubTick) {
				let tickHere = 0,
					subTickLength = 0;

				ctx.beginPath();
				ctx.lineWidth = setting.subTickWidth;
				ctx.strokeStyle = setting.subTickColor;

				for (const val of setting.subTicks){
					if (position === 'Bottom') {
						tickHere = interpolate(val, setting.domain[0], setting.domain[1], setting.xStart, setting.xEnd);
						subTickLength = setting.subTickSize*(setting.tickDirection==='outer'?1:-1);

						ctx.moveToS(tickHere, setting.yStart);
						ctx.lineToS(tickHere, setting.yStart + subTickLength);
					} else if (position === 'Left') {
						tickHere = interpolate(val, setting.domain[0], setting.domain[1], setting.yStart, setting.yEnd);
						subTickLength = setting.subTickSize*(setting.tickDirection==='outer'?-1:1);

						ctx.moveToS(setting.xStart, tickHere);
						ctx.lineToS(setting.xStart + subTickLength, tickHere);
					} else if (position === 'Right') {
						tickHere = interpolate(val, setting.domain[0], setting.domain[1], setting.yStart, setting.yEnd);
						subTickLength = setting.subTickSize*(setting.tickDirection==='outer'?1:-1);

						ctx.moveToS(setting.xStart, tickHere);
						ctx.lineToS(setting.xStart + subTickLength, tickHere);
					} else if (position === 'Top') {
						tickHere = interpolate(val, setting.domain[0], setting.domain[1], setting.xStart, setting.xEnd);
						subTickLength = setting.subTickSize*(setting.tickDirection==='outer'?-1:1);

						ctx.moveToS(tickHere, setting.yStart);
						ctx.lineToS(tickHere, setting.yStart + subTickLength);
					}
				}

				ctx.stroke();
			}

			let aliasOffset;
			if (setting.showText) {
				let tickHere = 0,
					tickLength = 0,
					direction = 1,

					printText = '',
					textWidth = 0,
					textHeight = 0,
					textOffsetX = 0,
					textOffsetY = 0;

				ctx.font = setting.fontSize + 'px ' + setting.fontFamily;
				ctx.fillStyle = setting.textColor;
				textHeight = setting.fontSize*0.6;

				for (const val of setting.ticks) {
					if (val >= setting.domain[0] && val <= setting.domain[1]) {

						printText = (setting.fontDigital===undefined)?val.toDigit():val.toDigit(setting.fontDigital);
						textWidth = ctx.measureText(printText).width;
						setting.fontWidth = textWidth;

						if (position === 'Bottom') {
							direction = setting.tickDirection==='outer'?1:-1;
							tickLength = setting.tickSize*direction;
							tickHere = interpolate(val, setting.domain[0], setting.domain[1], setting.xStart, setting.xEnd);

							textOffsetX = -1*textWidth/2;
							textOffsetY = (textHeight + setting.tickSize + setting.fontMarginTop)*direction;

							ctx.fillText(printText, tickHere + textOffsetX, setting.yStart + textOffsetY);
						} else if (position === 'Top') {
							direction = setting.tickDirection==='outer'?-1:1;
							tickLength = setting.tickSize*direction;
							tickHere = interpolate(val, setting.domain[0], setting.domain[1], setting.xStart, setting.xEnd);

							textOffsetX = -1*textWidth/2;
							textOffsetY = (setting.tickSize + setting.fontMarginBottom)*direction;

							ctx.fillText(printText, tickHere + textOffsetX, setting.yStart + textOffsetY);
						} else if (position === 'Left') {
							direction = setting.tickDirection==='outer'?-1:1;
							tickLength = setting.tickSize*direction;
							tickHere = interpolate(val, setting.domain[0], setting.domain[1], setting.yStart, setting.yEnd);

							textOffsetX = (textWidth + setting.tickSize + setting.fontMarginLeft)*direction;
							textOffsetY = textHeight/2;

							if (!aliasOffset || aliasOffset>textOffsetX) aliasOffset = textOffsetX;

							ctx.fillText(printText, setting.xStart + textOffsetX, tickHere + textOffsetY);
						} else if (position === 'Right') {
							direction = setting.tickDirection==='outer'?1:-1;
							tickLength = setting.tickSize*direction;
							tickHere = interpolate(val, setting.domain[0], setting.domain[1], setting.yStart, setting.yEnd);

							textOffsetX = (setting.tickSize + setting.fontMarginRight)*direction;
							textOffsetY = textHeight/2;

							ctx.fillText(printText, setting.xStart + textOffsetX, tickHere + textOffsetY);
						}
					}
				}
			}

			if (setting.showBorder) {
				ctx.beginPath();
				ctx.lineWidth = setting.spineWidth;
				ctx.strokeStyle = setting.spineColor;

				ctx.moveToS(setting.xStart, setting.yStart);
				ctx.lineToS(setting.xEnd, setting.yStart);
				ctx.lineToS(setting.xEnd, setting.yEnd);
				ctx.lineToS(setting.xStart, setting.yEnd);
				ctx.lineToS(setting.xStart, setting.yStart);
				ctx.stroke();
			}

			if (setting.showAlias) {
				if (setting.position === 'Left') {
					ctx.save();
					ctx.rotate(Math.PI/2*3);
					ctx.fillText(setting.alias, -1*(setting.yEnd + setting.yStart)/2, setting.xStart + aliasOffset - 7);
					ctx.restore();
				}				
			}
		}
		//console.timeEnd('drawAxis');

		function layout(axis) {
			const domainMode = axis.setting.domainMode;

			if (domainMode === 'original') {
				// original模式：坐标轴的domain的起止值，严格依照设置的数值。
				// tickCount设置将失效，因为系统会自动计算合适的tick步长进行显示。
				const position = axis.setting.position;
				let [dmin, dmax] = axis.setting.domain,
					axisRange = [NaN, NaN],
					axisLength = 0,
					tickMinDistance = 48, // tick之间间隔的最小距离(px)，横坐标和纵坐标不同
					tickCount,
					maxTickStep = 0; // tick step的最大值，即在axisLength内最多能容纳多少个step

				if (position === 'Bottom' || position === 'Top') {
					axisRange = [axis.setting.xStart, axis.setting.xEnd];
					axisLength = Math.abs(axis.setting.xEnd - axis.setting.xStart);
					tickMinDistance = 80;
				}
				if (position === 'Left' || position === 'Right') {
					axisRange = [axis.setting.yStart, axis.setting.yEnd];
					axisLength = Math.abs(axis.setting.yStart - axis.setting.yEnd);
					tickMinDistance = 40;
				}

				maxTickStep = Math.floor(axisLength / tickMinDistance);

				if (maxTickStep >= 10) {
					axis.setting.tickCount = 11;
				} else if (maxTickStep >= 5) {
					axis.setting.tickCount = 6;
				} else axis.setting.tickCount = 4;

				axis.optimizeTicks('original');


			} else if (domainMode === 'round-center') {
				// round-center模式：坐标轴的domain会被调整，刻度步长为1、2、5或10的倍数
				// tickCount被严格执行，计算出新的domain范围后，旧的domain被居中显示
				axis.optimizeTicks('round-center');
			}
		};
	};

	canvas.optimizeTicks = function (mode) {
		const domain = this.setting.domain;
		const position = this.setting.position;
		const diff = domain[1] - domain[0];
		const tickCount = this.setting.tickCount; // main tick的数量

		let length = 0, // 轴的像素长度
			e = '', // diff转换成科学计数法的字符串,例如'2.34e+2'
			a = 0,	// 科学计数法的系数
			n = 0,  // 科学计数法的幂
			i1 = 0, // 实际domain计算出的main tick之间的间隔
			i2 = 0, // 优化后的main tick之间的间隔
			d1 = 0, // 优化后的起始tick
			dn = 0, // 优化后的终止tick
			outputTicks = [];

		i1 = diff/(tickCount-1);
		e  = i1.toExponential().split('e');
		a  = parseFloat(e[0]);
		n  = parseInt(e[1]);

		
		length = this.setting.xEnd - this.setting.xStart;

		if (a > 5) i2 = 10;
		else i2 = Math.ceil(a);
		/*else if (a === 5) i2 = 5;
		else if (a > 1) i2 = 2;
		else i2 = 1;*/

		i2 = i2 * Math.pow(10, n);

		d1 = Math.floor((domain[0] - (i2 * (tickCount - 1) - diff)/2) / i2) * i2;

		if (mode === 'round-center') {
			if (d1 + (tickCount -1) * i2 < domain[1]) {
				i2 = i2 * 2;
				d1 = Math.floor((domain[0] - (i2 * (tickCount - 1) - diff)/2) / i2) * i2;
			}
		}

		for (let k = 0; k < tickCount; k++){
			dn = d1 + k*i2;
			if (mode === 'original' && (dn < domain[0] || dn > domain[1]) ) continue;
			outputTicks.push(dn);
		}

		if (mode === 'round-center') {
			this.setting.domain = [d1, dn];
		}

		this.setting.ticks = outputTicks;		
	};

	Object.defineProperty(canvas.setting, 'axisHeight', {
		get: function () {
			return this.fontSize + this.tickSize + this.fontMarginBottom + this.fontMarginTop + this.marginTop + this.marginBottom + this.spineWidth;
		},
	});

	Object.defineProperty(canvas.setting, 'axisWidth', {
		get: function () {
			return (this.fontWidth || 120) + this.tickSize + this.fontMarginLeft + this.fontMarginRight + this.marginTop + this.marginBottom + this.spineWidth;
		},
	});

	Object.defineProperty(canvas.setting, 'range', {
		get: function () {
			const _p = this.position;
			if (_p === 'Left' || _p === 'Right') return [this.yStart, this.yEnd];
			if (_p === 'Bottom' || _p === 'Top') return [this.xStart, this.xEnd];
		},
	});

	return canvas;
};
