Figure.prototype.addData = function(mdf, channelNames, group=0){
	// 如果文件为空，或者文件的data属性非法，或者文件的data不是mdf对象，则返回false
	if(!(mdf && mdf.constructor.name === 'MDF')) return false;

	// 如果mdf文件合法，则继续执行
	console.time('addData');
	var theChannel	= {},
		shortname 	= '',
		regexp		= undefined,
		result		= null,
		theCNBlock 	= null,
		theTimeBlock= null,
		theConv		= null,
		timeArray 	= [],
		timeDomain 	= [],
		valueArray	= [],
		valueDomain	= [];
		
	for (const channelname of channelNames){
		// 初始化theChannel
		theChannel = {
			shortname :  '',
			fullname: '',
			sampleRate: 0,
			x	 : 	[],
			y	 : 	[],
			unit : '',
			isBit: 	false,
			xDomain: [],
			yDomain: [],
			group: group,
			xAxis: null, // axisBottom
			mdfSource: mdf,
			yAxisPosition: 'Left',
			yAxis: null, // axisLeft
			background: '#fafafa',

		};

		// shortname等于channelname中字符“\”前的部分
		shortname = (channelname.match(/\\/)?channelname.match(/^(.*)\\/)[1]:channelname);

		// 通过字符串拼接RegExp，注意替换“[”、“]”
		regexp = new RegExp('^'+shortname.replace(/\[/g, '\\\[').replace(/\]/g, '\\\]')+'\\\\');

		result = mdf.searchChannelsByRegExp(regexp);

		// 如果没有找到符合名称的通道，跳过此次循环
		if (!result.length) continue;

		// 检查属性rawDataArray有没有数据，没有的话，调用读取函数
		theCNBlock =  result[0];
		theCNBlock = (theCNBlock.rawDataArray.length)?theCNBlock:(mdf.readDataBlockOf(theCNBlock, mdf.arrayBuffer));
		theConv	   = theCNBlock.ccBlock.additionalConversionData;
		valueArray = theCNBlock.getPhysicalDataArray();

		// 如果经过转换后的值为字符串，则使用转换前的值，以保证y值总是数字
		if (typeof valueArray[0] === 'string') valueArray = theCNBlock.rawDataArray;

		theTimeBlock = theCNBlock.parent.cnBlocks[0];
		theTimeBlock = (theTimeBlock.rawDataArray.length)?theTimeBlock:(mdf.readDataBlockOf(theTimeBlock, mdf.arrayBuffer));
		timeArray = theTimeBlock.getPhysicalDataArray();

		// 如果数组为空，跳过此次循环
		if (!(valueArray.length && timeArray.length)) continue;

		// 判断是否为布尔型数据通道
		if (theConv 
			&& theConv.constructor.name === 'Array'
			&& theConv.length === 4 
			&& theConv[3] === 'TRUE') { theChannel.isBit = true; valueDomain = [0, 1];}
		else { valueDomain = Figure.extent(valueArray); }

		// 计算x的最大值和最小值, 理论上应该为timeArray[0], timeArray[timeArray.length-1]
		timeDomain = Figure.extent(timeArray);

		theChannel.shortname  = shortname;
		theChannel.fullname   = theCNBlock.shortSignalName;
		theChannel.sampleRate = theCNBlock.samplingRate;

		theChannel.x = timeArray;
		theChannel.y = valueArray;

		theChannel.xDomain = timeDomain;
		theChannel.yDomain = valueDomain;

		this.data.channels.push(theChannel);

		if (this.data.mdfs.indexOf(mdf) === -1) this.data.mdfs.push(mdf);
		if (mdf.channelsQuoted === undefined) mdf.channelsQuoted = [];
		mdf.channelsQuoted.push(theChannel);
	}
	console.timeEnd('addData');	
};