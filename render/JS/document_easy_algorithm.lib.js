function U_getStartSE(mdf, ch){
  let result = U_initChannel(mdf, ch);
  if (result.response === 'OK'){
    const timeArray = result.data.timeArray;
    const valueArray = result.data.physicalDataArray;
    const time_firstSet = U_firstSet(timeArray, valueArray).time;
    let startTime = (time_firstSet > 2)?(time_firstSet - 2):timeArray[0];
    let endTime = ((time_firstSet+30) < timeArray[timeArray.length-1])?(time_firstSet+30):timeArray[timeArray.length-1];
    return [startTime, endTime];
  }
}

function U_firstSet(t, v){
  for (let i = 0; i < t.length; i++){
    if (v[i] === 1){
      console.log({
        time: t[i],
        value: v[i],
        index: i,
      });
      return {
        time: t[i],
        value: v[i],
        index: i,
      };
    }
  }
}

function U_initChannel(mdf, ch){
  let cnBlock, convert, response;
  try {
    const searchResult = mdf.searchChannelsByRegExp(new RegExp("^"+ch+"\\\\"));
    if (searchResult.length > 0){
      cnBlock = searchResult[0];
      mdf.readDataBlockOf(cnBlock, mdf.arrayBuffer);
      mdf.readDataBlockOf(cnBlock.parent.cnBlocks[0], mdf.arrayBuffer);
      convert = cnBlock.ccBlock.additionalConversionData;
      if (convert.length === 4 && convert[3] === 'TRUE'){ // sometimes convert[1] == '----' | 'FALSE'
        cnBlock.physicalDataArray = cnBlock.rawDataArray;
      } else {
        cnBlock.physicalDataArray = cnBlock.getPhysicalDataArray();
      }
      cnBlock.timeArray = cnBlock.parent.cnBlocks[0].rawDataArray;

      if (cnBlock.physicalDataArray.length > 0 && cnBlock.timeArray.length > 0 && cnBlock.physicalDataArray.length === cnBlock.timeArray.length){
        response = 'OK';
      }
    } else {
      response = 'not exist';
    }
  } catch (e) {
    response = 'error';
    console.log(e);
  } finally {
    return {
      response: response,
      data: cnBlock,
    }
  }
}
