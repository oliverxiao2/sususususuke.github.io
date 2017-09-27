Figure.prototype.initBgLayer = function () {
	if (!this.bgLayer) {
		const bgLayer = document.createElement('canvas');
		bgLayer.width = this.width;
		bgLayer.height= this.height;
		bgLayer.setAttribute('data-element-type', 'bgLayer');
		bgLayer.style.position = 'absolute';
		this.wrapper.appendChild(bgLayer);
		this.bgLayer = bgLayer;
	}
};