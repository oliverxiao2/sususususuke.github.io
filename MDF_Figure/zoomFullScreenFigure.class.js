var FIGURE = function (parent) {

	const staticImage = document.createElement('img');
	staticImage.style.width = '100%';
	staticImage.style.height= '100%';
	parent.appendChild(staticImage);
	staticImage.parent = this;

	const bigFigure = document.createElement('div');
	bigFigure.style.position = 'absolute';
	bigFigure.style.width = '100%';
	bigFigure.style.height = '100%';
	bigFigure.style.left = '0px';
	bigFigure.style.top = '0px';
	bigFigure.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
	bigFigure.style.display = 'none';
	parent.appendChild(bigFigure);
	bigFigure.parent = this;

	this.img = staticImage;
	this.figure = new Figure(bigFigure);

	staticImage.addEventListener('dblclick', function (e) {
		bigFigure.style.display = 'block';
	});
}