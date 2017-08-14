Figure.prototype.addLegendTable = function () {
	const canvas = document.createElement('canvas');
	canvas.width  = this.width;
	canvas.height = this.height;
	canvas.style.position = 'absolute';
	canvas.setAttribute('data-figure-element', 'legend-table');
	canvas.parent = this;
	canvas.setting = {
		channels: [],
	};
	this.wrapper.appendChild(canvas);

	
	canvas.draw = function () {
		const fig = this.parent;

		const ctx = this.getContext('2d');
		ctx.font = '12px Consolas';

		const layout = fig.layout;
		const _baseX = fig.width - fig.setting.legendTableWidth;
		const _marginTop = 5;

		let rowId = 0;
		for (const groupId in layout.groups) {
			
			for (const channel of layout.groups[groupId].channels) {
				rowId ++;
				ctx.fillStyle = channel.color;
				ctx.fillRect(_baseX + 2, 16*(rowId-1)+_marginTop, 12, 12);

				ctx.fillStyle = '#000';
				ctx.textBaseline = 'top';
				ctx.fillText(channel.shortname, _baseX + 20, 16*(rowId-1)+_marginTop );

				this.setting.channels.push(channel);
			}
			
		}
	};

	return canvas;
};