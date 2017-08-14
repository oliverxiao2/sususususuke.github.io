refreshLayout = function(fig, options) {
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
		fig.layout.init();
	}

	// Step1. 先将通道进行分组,并对通道所用到的mdf文件源进行统计，存成数组fileExist,确认好时间轴总共所需要的高度
	channels.forEach(function(channel){
		let group = channel.group;

		fig.layout.groups[group] = fig.layout.groups[group] || {
			channels: [],
			axisLeftRef: {},
			axisRightRef: {},
			axisBottomRef: {},
			axisTopRef: {},
			bitGroup: false,
			fixedHeight: NaN,	
		};

		fig.layout.groups[group].channels.push(channel);
		fig.layout.groups[group].bitGroup = fig.layout.groups[group].bitGroup && channel.isBit;

		let mdfSource = channel.mdfSource;
		if (fileExist.indexOf(mdfSource) == -1) fileExist.push(mdfSource);
		
	});

	// 计算时间轴的数量,并确定时间轴的domain,

	// Step2. 分好组后，每一个通道组，根据y轴显示模式（单y轴、多y轴）以及y轴共享模式（按通道、按单位），算出实际需要的y轴数量，并确定y轴的domain
	fig.layout.groups.forEach(function(theGroup){
		if (theGroup.bitGroup) {
			theGroup.fixedHeight = theGroup.channels.length * fig.setting.bitChannelFixedHeight + (1+theGroup.channels.length)*fig.setting.bitChannelFixedMargin;
		} else {

			// 如果是多y轴模式，并且按照单位来共享y轴
			if (fig.setting.mode === 'multiY' && fig.setting.shareYAxisMode === 'unit') {
				theGroup.channels.forEach(function(channel){
					let unit = (channel.unit === '' || channel.unit === '-')?'no unit':channel.unit;
					let yAxisPosition = channel.yAxisPosition;

					if (unitExist.indexOf(unit) === -1) {
						unitExist.push(unit);
						theGroup['axis'+yAxisPosition+'Ref'][unit] = {
							channels: [],
							domain: [],
							range: [],
							mode: '',
						};
					}

					theGroup['axis'+yAxisPosition+'Ref'][unit].channels.push(channel);
				});	
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

	// 计算主绘图区、各个坐标轴的位置
	fig.axis.axisLeft.forEach(function(element){ winMarginLeft += 50 });
	fig.axis.axisBottom.forEach(function(element){ winMarginBottom += 50 });
	fig.axis.axisRight.forEach(function(element){ winMarginRight += 50; });
	fig.axis.axisTop.forEach(function(element){ winMarginTop += 50; });

	fig.mainCanvas.width  = width - winMarginLeft - winMarginRight - fig.setting.legendTableWidth;
	fig.mainCanvas.height = height - winMarginTop - winMarginBottom;
	fig.mainCanvas.marginLeft = winMarginLeft;
	fig.mainCanvas.marginTop = winMarginTop;
	
};