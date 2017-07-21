window.algorithmObj = function(){
  this.init();
};

algorithmObj.prototype.init = function(){
  this.name = '';
  this.id = '';
  this.code = {
    type: 'Javascript',// 'Javascript' | 'Matlab' | 'Excel description'
    data: '',
  };
  this.input = {
    data: [{
      filename: '',
      channels: [],
    }],
  };
  this.output = {
    type: 'timeDomain', // 'number' | 'numberArray' | 'stringArray' | 'timeDomain' | 'valueDomain' | 't-vDomain' | 'string' | 'bool'
    data: undefined,
  };
  this.bind = {
    type: '', // ''
    target: null,
  };
  this.tags = [];
};

/**********************************************************************/
