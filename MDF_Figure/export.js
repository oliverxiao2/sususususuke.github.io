Figure.prototype.export = function () {
	const container = this.wrapper;
	const allCanvas = container.querySelectorAll('canvas');
	width = container.clientWidth;
	height= container.clientHeight;
	const total = document.createElement('canvas');
	const ctx = total.getContext('2d');
	total.width = width;
	total.height = height;

	let left, top, left_parent, top_parent;
	for (const canvas of allCanvas){
		left = parseFloat(canvas.style.left);
		top = parseFloat(canvas.style.top);
		left = left?left:0;
		top = top?top:0;

		const box = canvas.parentElement;
		left_parent = parseFloat(box.style.left);
		top_parent = parseFloat(box.style.top);
		left_parent = left_parent?left_parent:0;
		top_parent = top_parent?top_parent:0;
		ctx.drawImage(canvas, Math.ceil(left+left_parent), Math.ceil(top+top_parent));
	}

	/*let DOMURL = window.URL || window.webkitURL || window;
	const legendTableWidth = this.legendTable.clientWidth;
	const legendTableHeight= this.legendTable.clientHeight;
	const legendTableLeft = parseInt(this.legendTable.style.left);
	this.legendTable.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
	const legendTable = '<svg xmlns = "http://www.w3.org/2000/svg" width="'+this.width+'" height="'+this.height+'">'
					  + '<foreignObject width="100%" height="100%">'
					  +	this.legendTable.outerHTML
					  + '</foreignObject>'
					  + '</svg>';
					  window.lt = legendTable;
	const img = new Image();
	img.crossOrigin = 'Anonymous';
	 window.k2 = img;
	const svg = new Blob([legendTable], {type:'image/svg+xml'});window.k1 = svg;
	const url = DOMURL.createObjectURL(svg);

	img.onload = function (e) {
		ctx.drawImage(img, 0, 0);
		DOMURL.revokeObjectURL(url);
		window.kkk = total;
	}
	img.src = url;
	*/

	return total.toDataURL('img/png');
};