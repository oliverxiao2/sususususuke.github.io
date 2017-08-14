Figure.prototype.draw = function(options){
	console.time('rebuild');
	var defaultStyle = {
		// 绘图动作
		// 'rebuild': canvasElement删除重建,意味着画布尺寸被修改，需要重建canvas 
		// 'repaint': 画布内容清空，重新绘制
		// 'pan': 平移操作，只有该通道组 
		action: 'rebuild',


	};

	this.setting = Object.assign(defaultStyle, this.setting, options);

	let channels = this.data.channels;

	initBgLayer(this);

	if (this.setting.action === 'rebuild' && this.setting.mode === 'multiY' && this.setting.shareYAxisMode === 'signal') {

		// 清除所有轴，包括数据和canvas
		clearAxisCollection(this);
		clearPlotCollection(this);
		clearBgLayer(this);

		let groups = [], bitGroup = [];
		let groupCount = 0, axisLeftCountInOneGroupMax = 0, axisRightCountInOneGroupMax = 0, axisBottomCount = 0;
		let totalAxisBottomHeight = 0;
		const bgLayerCtx = this.bgLayer.getContext('2d');

		for (const [i, channel] of channels.entries()) {
			// 先搞定y轴，因为是multiY && signal模式，因此每个通道都有跟独立的y轴
			// 把bit型的通道放入bitGroup，单独伺候
			if (channel.isBit) bitGroup.push(channel);
			else {
				const groupId = channel.group;
				const newYAxis = this.addAxis({
					position: channel.yAxisPosition,
					group: channel.group,
					channels: [channel],
					domain: channel.yDomain,
					alias: channel.shortname,
				});
				channel.yAxis = newYAxis;
				if (groups[groupId] == undefined) {
					groups[groupId] = {
						axisLeftCount:0, 
						axisRightCount:0, 
						axisLeftCollection: [], 
						axisRightCollection:[],
						channels: [],
						background: channel.background,
					};
				}
				if (channel.yAxisPosition === 'Left') {
					groups[groupId].axisLeftCount++;
					groups[groupId].axisLeftCollection.push(channel.yAxis);
				}
				if (channel.yAxisPosition === 'Right') {
					groups[groupId].axisRightCount++;
					groups[groupId].axisRightCollection.push(channel.yAxis);
				}
				groups[groupId].channels.push(channel);
			}	
			

			// 再搞定时间轴
			const foundTimeAxis = getTimeAxis(this, channel.mdfSource);
			channel.xAxis = foundTimeAxis?foundTimeAxis:(this.addAxis({
				position: 'Bottom',
				channels: [],
				fileSource: channel.mdfSource,
				domain: channel.xDomain,
			}));
			channel.xAxis.setting.channels.push(channel);
			channel.xAxis.setting.domain = extendDomain(channel.xAxis.setting.domain, channel.xDomain);
			if (!foundTimeAxis) axisBottomCount++;
		}

		for (const group of groups) {
			if (group) {
				if (group.axisLeftCount > axisLeftCountInOneGroupMax) axisLeftCountInOneGroupMax = group.axisLeftCount;
				if (group.axisRightCount > axisRightCountInOneGroupMax) axisRightCountInOneGroupMax = group.axisRightCount;
			}
		}
		if (axisLeftCountInOneGroupMax > 4) axisLeftCountInOneGroupMax = 4;
		if (axisRightCountInOneGroupMax > 1) axisRightCountInOneGroupMax = 1;

		totalAxisBottomHeight = axisBottomCount * this.setting.axisBottomFixedHeight;
		const _xStart = axisLeftCountInOneGroupMax * this.setting.axisLeftFixedWidth;
		const _xEnd = this.width - this.setting.legendTableWidth - this.setting.legendTablePadding - axisRightCountInOneGroupMax * this.setting.axisRightFixedWidth;
		for (const [i, axisBottom] of this.axisCollection.axisBottomCollection.entries()) {
			axisBottom.setting.yStart = this.height - (axisBottomCount - i)*this.setting.axisBottomFixedHeight;
			axisBottom.setting.xStart = axisLeftCountInOneGroupMax * this.setting.axisLeftFixedWidth;
			axisBottom.setting.xEnd = _xEnd;
			axisBottom.draw();
		};

		let bitGroupHeight = 0, fluidGroupEachHeight = 0, fluidGroupCount = groups.length;
		if (bitGroup.length > 0) bitGroupHeight = bitGroup.length * (this.setting.bitChannelFixedHeight + this.setting.bitChannelFixedMargin);
		fluidGroupEachHeight = (this.height - this.setting.axisTopHeight - totalAxisBottomHeight - bitGroupHeight - (fluidGroupCount - 1 + (bitGroup.length?1:0)) * this.setting.fluidGroupMargin) / fluidGroupCount;
		let groupIndex = 0;
		for (const groupId in groups) {
			groupIndex++;

			for (const [i, axisLeft] of groups[groupId]['axisLeftCollection'].entries()) {
				axisLeft.setting.xStart = (axisLeftCountInOneGroupMax - i) * this.setting.axisLeftFixedWidth;
				axisLeft.setting.xEnd = _xEnd;
				axisLeft.setting.yStart = this.setting.axisTopHeight + groupIndex * fluidGroupEachHeight + (groupIndex - 1) * this.setting.fluidGroupMargin;
				axisLeft.setting.yEnd = axisLeft.setting.yStart - fluidGroupEachHeight;
				axisLeft.setting.domainMode = 'round-center';
				if (i === 0) {
					if (groups[groupId].background) axisLeft.setting.background = groups[groupId].background;
					axisLeft.setting.showBorder = true;
				}

				const range = axisLeft.setting.yStart - axisLeft.setting.yEnd;
				if (range < 48) axisLeft.setting.tickCount = 2;
				else if (range < 120) axisLeft.setting.tickCount = 4;
				else if (range < 240) axisLeft.setting.tickCount = 6;
				else axisLeft.setting.tickCount = 11;
				
				axisLeft.draw();
			}			
		}

		// 画bitGroup		
		for (const [k, channel] of bitGroup.entries()) {
			let _yStart = this.height - totalAxisBottomHeight - bitGroupHeight + this.setting.bitChannelFixedHeight * (k + 1) + this.setting.bitChannelFixedMargin * k;
			if (!channel.color) channel.color = getColor(k);
			channel.yAxis = this.addAxis({
				position: 'Left',
				xStart: _xStart,
				xEnd: _xEnd,
				yStart: _yStart,
				yEnd: _yStart - this.setting.bitChannelFixedHeight,
				domain: [0 , 1],
			});
			
			const newPlot = this.addPlot(channel);
			newPlot.draw();
			channel.plot = newPlot;
		}

		// 画bitGroup的border
		let _yEndBitGroup = this.height - totalAxisBottomHeight - bitGroupHeight;
		let _yStartBitGroup = this.height - totalAxisBottomHeight;
		bgLayerCtx.beginPath();
		bgLayerCtx.lineWidth = this.axisCollection.axisBottomCollection[0].setting.spineWidth;
		bgLayerCtx.strokeStyle = this.axisCollection.axisBottomCollection[0].setting.spineColor;
		bgLayerCtx.moveToS(_xStart, _yStartBitGroup);
		bgLayerCtx.lineToS(_xEnd, _yStartBitGroup);
		bgLayerCtx.lineToS(_xEnd, _yEndBitGroup);
		bgLayerCtx.lineToS(_xStart, _yEndBitGroup);
		bgLayerCtx.lineToS(_xStart, _yStartBitGroup);
		bgLayerCtx.stroke();

		
		// 画plot
		for (const group of groups) {
			for (const [k, channel] of group.channels.entries()){
				if (!channel.color) channel.color = getColor(k);
				const newPlot = this.addPlot(channel);
				newPlot.draw();
				channel.plot = newPlot;
			}	
		}

		this.layout.groups = groups;
		this.layout.bitGroup = bitGroup;

		this.legendTable = this.addLegendTable();
		this.legendTable.draw();
	}
	console.timeEnd('rebuild');

	function initBgLayer (fig) {
		const bgLayer = document.createElement('canvas');
		bgLayer.width = fig.width;
		bgLayer.height= fig.height;
		bgLayer.setAttribute('data-element-type', 'bgLayer');
		bgLayer.style.position = 'absolute';
		fig.wrapper.appendChild(bgLayer);
		fig.bgLayer = bgLayer;
	}

	function refreshLayout (fig, options) {
		//options
		/*
			{
				axis: {
					axisBottom: [],
				}
			}
		*/

		var channels = fig.data.channels,
			width = fig.wrapper.clientWidth,
			height = fig.wrapper.clientHeight,
			winMarginLeft = 0, // 主绘图区左侧离画布边缘的距离
			winMarginTop = 0,
			winMarginRight = 0,
			winMarginBottom = 0,
			winLeftTopX1 = 0,
			winLeftTopY1 = 0,
			winRightBottomX2 = 0,
			winRightBottomY2 = 0,
			fileExist = [],
			groupExist = [],
			unitExist = [],
			groupCount = 0,
			axisLeftCount = 0,
			axisRightCount = 0,
			axisTopCount = 1,
			axisBottomCount = 0;

		if (fig.setting.action === 'rebuild') {
			fig.resetLayout();
		}

		// Step1. 先将通道进行分组,并对通道所用到的mdf文件源进行统计，存成数组fileExist,确认好时间轴总共所需要的高度
		channels.forEach(function(channel){
			let group = channel.group;

			fig.layout.groups[group] = fig.layout.groups[group] || {
				channels: [],
				axisLeftRef: {},
				axisRightRef: {},

				bitGroup: false,
				fixedHeight: NaN,
				groupHeight: NaN,
				groupBackground: '',
			};

			fig.layout.groups[group].channels.push(channel);
			fig.layout.groups[group].bitGroup = fig.layout.groups[group].bitGroup && channel.isBit;

			let mdfSource = channel.mdfSource;
			if (fileExist.indexOf(mdfSource) == -1) {
				fileExist.push(mdfSource);
			}
			
		});

		// 计算时间轴的数量,并确定时间轴的domain
		let totalAxisBottomHeight = 0, totalAxisTopHeight = 0;
		fileExist.forEach(function(mdf, index){
			let dmin = Infinity,
				dmax = -Infinity,
				range = [],
				axisHeight;

			mdf.channelsQuoted.forEach(function(channel){
				if (dmin > channel.xDomain[0]) dmin = channel.xDomain[0];
				if (dmax < channel.xDomain[1]) dmax = channel.xDomain[1];
			});

			const newAxisBottom = fig.addAxis( 
				{
					position: 'Bottom',
					domain: [dmin, dmax],
				}
			);
			mdf.channelsQuoted.forEach(function (channel) { channel.xAxis = newAxisBottom; });
			fig.axisCollection.axisBottomCollection.push(newAxisBottom);
			fig.axis.axisBottom.configs[index] = Object.assign(
				fig.axis.axisBottom.configs[index] || fig.axis.axisBottom.defaultSetting,
				
			);

			const _c = fig.axis.axisBottom.configs[index];
			totalAxisBottomHeight += _c.fontSize + _c.tickSize + _c.fontMarginBottom + _c.fontMarginTop + _c.marginTop + _c.marginBottom + _c.spineWidth;
			console.log(totalAxisBottomHeight);
		});

		// 确定好axisBottom在y方向上的位置
		let baseOffset = fig.height - totalAxisBottomHeight;
		fig.axisCollection.axisBottomCollection.forEach(function (axisBottom) {
			let setting = axisBottom.setting;
			setting.yStart = baseOffset;
			baseOffset += setting.axisHeight;
		});

		// Step2. 分好组后，每一个通道组，根据y轴显示模式（单y轴、多y轴）以及y轴共享模式（按通道、按单位），算出实际需要的y轴数量，并确定y轴的domain
		let axisLeftMaxCount = 0, axisRightMaxCount = 0, totalAxisLeftWidth = 0, totalAxisRightWidth = 0, axisLeftBaseOffset = 0, axisRightBaseOffset = 0;		
		fig.layout.groups.forEach(function(theGroup){
			if (theGroup.bitGroup) {
				theGroup.fixedHeight = theGroup.channels.length * fig.setting.bitChannelFixedHeight + (1+theGroup.channels.length)*fig.setting.bitChannelFixedMargin;
			} else {

				// 如果是多y轴模式，并且按照单位来共享y轴
				if (fig.setting.mode === 'multiY' && fig.setting.shareYAxisMode === 'unit') {
					unitExist = [];
					theGroup.channels.forEach(function(channel){
						let unit = (channel.unit === '' || channel.unit === '-')?'no_unit':channel.unit;
						let yAxisPosition = channel.yAxisPosition;

						if (unitExist.indexOf(unit) === -1) {
							unitExist.push(unit);

							const newAxis = fig.addAxis({
								position: yAxisPosition,
							});
							
							theGroup['axis'+yAxisPosition+'Ref'][unit] = newAxis;

						}

						//theGroup['axis'+yAxisPosition+'Ref'][unit].channels.push(channel);
					});

					// 统计按单位共享y轴时，axisLeft共有多少条
					for (const unit in theGroup['axisLeftRef']) {
						const n = Object.keys(theGroup['axisLeftRef']).length;
						if (axisLeftMaxCount < n) axisLeftMaxCount = n;
					}

					// 统计按单位共享y轴时，axisRight共有多少条
					for (const unit in theGroup['axisRightRef']) {
						const n = Object.keys(theGroup['axisRightRef']).length;
						if (axisRightMaxCount < n) axisRightMaxCount = n;
					}
					

					let i = 0;
					for (const unit in theGroup['axisLeftRef']) {
						let yDomain = getChannelsSharedDomain(theGroup['axisLeftRef'][unit].channels, 'y');
						const newAxisLeft = fig.addAxis({
							position: 'Left',
							domain: yDomain,
							domainMode: 'round-center',
							tickCount: 11,
							alias: unit,
							
						});
						fig.axisCollection.axisLeftCollection.push(newAxisLeft);
						
						i++;
					}

					i = 0;
					for (const unit in theGroup['axisRightRef']) {
						let yDomain = getChannelsSharedDomain(theGroup['axisRightRef'][unit].channels, 'y');
						const newAxisRight = fig.addAxis({
							position: 'Right',
							domain: yDomain,
							domainMode: 'round-center',
							tickCount: 11,
							alias: unit,
							
						});
						fig.axisCollection.axisRightCollection.push(newAxisRight);
						i++;
					}					
				}



				// 如果是多y轴模式，并且每个信号都有一个y轴
				if (fig.setting.mode === 'multiY' && fig.setting.shareYAxisMode === 'signal') {
					theGroup.channels.forEach(function(channel, index){
						let yAxisPosition = channel.yAxisPosition;

						theGroup['axis'+yAxisPosition+'Ref'][index] = {
							channels: [channel],
							domain: [],
							range: [],
							mode: '',
						};
					});
				}

				// 如果是单y轴模式
				if (fig.setting.mode === 'singleY') {									
					theGroup.channels.forEach(function(channel){
						let yAxisPosition = channel.yAxisPosition;
						theGroup['axis'+yAxisPosition+'Ref'][0] = theGroup['axis'+yAxisPosition+'Ref'][0] || {
							channels: [],
							domain: [],
							range: [],
							mode: '',
						};
						theGroup['axis'+yAxisPosition+'Ref'][0].channels.push(channel);
					});
				}

				// 计算每个轴的domain和range
				Object.keys(theGroup.axisLeftRef).forEach(function (key){
					const channels = theGroup.axisLeftRef[key].channels;
					let dmin = Infinity, dmax = -Infinity;

					channels.forEach(function (channel) {
						if (dmin > channel.yDomain[0]) dmin = channel.yDomain[0];
						if (dmax < channel.yDomain[1]) dmax = channel.yDomain[1];
					});
					
					theGroup.axisLeftRef[key].domain = [dmin, dmax];

				});

			}
		});

		if (fig.setting.mode === 'multiY') {

			let baseYOffset = 50; // 顶部留空50px
			let fluidGroupCount = 0, fluidGroupTotalHeight = 0, fluidGroupEachHeight = 0;
			fluidGroupTotalHeight = fig.height - totalAxisBottomHeight - baseYOffset;

			fig.layout.groups.forEach(function (theGroup) {
				if (theGroup.fixedHeight > 0) fluidGroupTotalHeight -= theGroup.fixedHeight;
				else fluidGroupCount++;
			});

			fluidGroupEachHeight = fluidGroupTotalHeight / fluidGroupCount; console.log(fluidGroupEachHeight)
			
			fig.axisCollection.axisLeftCollection.forEach(function (axisLeft, i) {
				axisLeft.setting.xStart = (axisLeftMaxCount - i)*65;
			});


			fig.layout.group.forEach(function (theGroup) {
				for (const unit in theGroup.axisLeftRef) {
					//theGroup.axisLeftRef.unit
				}
			});
		}

		// 计算主绘图区、各个坐标轴的位置
		/*fig.axis.axisLeft.forEach(function(element){ winMarginLeft += 50 });
		fig.axis.axisBottom.forEach(function(element){ winMarginBottom += 50 });
		fig.axis.axisRight.forEach(function(element){ winMarginRight += 50; });
		fig.axis.axisTop.forEach(function(element){ winMarginTop += 50; });

		fig.mainCanvas.width  = width - winMarginLeft - winMarginRight - fig.setting.legendTableWidth;
		fig.mainCanvas.height = height - winMarginTop - winMarginBottom;
		fig.mainCanvas.marginLeft = winMarginLeft;
		fig.mainCanvas.marginTop = winMarginTop;*/		
	};

	function layoutAxis (fig, baseOffset) {
		let axisBottomCollection = fig.axisCollection.axisBottomCollection;
		axisBottomCollection.forEach(function (axisBottom) {
			const setting = axisBottom.setting;
			setting.yStart = baseOffset;
			baseOffset += setting.axisHeight; 
		});
	};

	function getTimeAxis(fig, mdf) {
		for (const axisBottom of fig.axisCollection.axisBottomCollection) {
			if (mdf === axisBottom.setting.fileSource) return axisBottom
		}

		for (const axisTop of fig.axisCollection.axisTopCollection) {
			if (mdf === axisTop.setting.fileSource) return axisTop
		}
		return null;
	};

	function clearAxisCollection (fig) {
		const position = ['Left', 'Bottom', 'Right', 'Top'];
		for (const pos of position) {
			for (const axis of fig.axisCollection['axis'+pos+'Collection']) {
				axis.remove();
			}
		}
		fig.axisCollection = {
			axisLeftCollection: [],
			axisBottomCollection: [],
			axisRightCollection: [],
			axisTopCollection: [],
		};
	};

	function clearPlotCollection (fig) {
		for (const plot of fig.plotCollection) {
			plot.remove();
		}
		fig.plotCollection = [];
	}

	function clearBgLayer (fig) {
		fig.bgLayer.getContext('2d').clearRect(0, 0, fig.bgLayer.width, fig.bgLayer.height);
	}

	function extendDomain(d1, d2) {
		return [Math.min(d1[0], d2[0]), Math.max(d1[1], d2[1])];
	};

	function getColor (index, mode = 'normal') {
		const lib = [
			'#d32f2f', // paper-red-700
			'#7b1fa2', // paper-purple-700
			'#303f9f', // paper-indigo-700
			'#1976d2', // paper-blue-700
			'#0097a7', // paper-cyan-700
			'#388e3c', // paper-green-700
			'#afb42b', // paper-lime-700
			'#fbc02d', // paper-yellow-700
			'#f57c00', // paper-orange-700
			'#795548', // paper-brown-500

		];

		if (mode === 'normal'){
			return lib[index % (lib.length)];
		}
	};
};