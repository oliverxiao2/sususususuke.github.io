Figure.addPolyLoadDataMethod = function(object, method, fn){
	var old = object[method];

	object[method] = function(){
		if (fn.length === arguments.length) {
			return fn.apply(this, arguments);
		} else if (typeof old === 'function') {
			return old.apply(this, arguments);
		}
	}
};

Figure.addPolyLoadDataMethod(Figure.prototype, 'loadData', function(mdf){
	// 参数只有mdf
	if (this.data.channels.length === 0) return false;

	var channelNames = [];
	this.data.channels.forEach(function(channel){
		channelNames.push(channel.shortname);
	});

	this.data.channels = [];
	this.addData(mdf, channelNames);	
});

Figure.addPolyLoadDataMethod(Figure.prototype, 'loadData', function(mdf, channelNames){
	if (typeof channelNames === 'array' && channelNames.length > 0){
		this.data.channels = [];
		this.addData(mdf, channelNames);
	}
});