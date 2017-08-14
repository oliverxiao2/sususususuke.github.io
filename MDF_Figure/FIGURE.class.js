var FIGURE = function (parent) {
	const me = this;

	const staticImage = document.createElement('img');
	staticImage.style.width = '100%';
	staticImage.style.height= '100%';
	staticImage.style.border = '1px solid #666';
	parent.appendChild(staticImage);
	staticImage.parent = me; console.log(parent.clientWidth)

	const fullScreenWrapper = document.createElement('div');
	fullScreenWrapper.style.position = 'absolute';
	fullScreenWrapper.style.width = parent.clientWidth*2//(window.screen.width-2);
	fullScreenWrapper.style.height = parent.clientHeight*2;
	fullScreenWrapper.style.left = '0px';
	fullScreenWrapper.style.top = '0px';
	fullScreenWrapper.style.boxSizing = 'border-box';
	fullScreenWrapper.style.backgroundColor = '#fffaf0'; //floralwhite
	fullScreenWrapper.style.display = 'none';
	parent.appendChild(fullScreenWrapper);
	fullScreenWrapper.rootParent = me;
	me.fullScreenWrapper = fullScreenWrapper;

	me.img = staticImage;
	me.figure = new Figure(fullScreenWrapper);
	me.figure.rootParent = me;

	staticImage.addEventListener('dblclick', function (e) {
		$(fullScreenWrapper).fadeIn();
		//me.figure.draw({action: 'rebuild'});
	});
}