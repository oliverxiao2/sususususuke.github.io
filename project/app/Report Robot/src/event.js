if (document.getElementById('panel_file_preview')){
    document.getElementById('panel_file_preview').addEventListener('dragover', function(evt){
        evt.preventDefault();
    });

    document.getElementById('panel_file_preview').addEventListener('drop', function(evt){
        evt.preventDefault();
        let data = evt.dataTransfer.getData('filename');
        let file = $global_file_manager.files[data];
        if (file){
            let channels = file.data.searchChannelsByRegExp(/.*/);
            let newJSON = {};
            let repeatedName = {};
            for (const [i, channel] of channels.entries()){
                let name = channel.shortSignalName;
                if (newJSON[name]){
                    if (!repeatedName[name]) repeatedName[name] = {count: 1};
                    else repeatedName[name]["count"] += 1;
                    name = name + repeatedName[name]["count"];
                }

                let ordername = (i+1+'.'+name);
                newJSON[ordername] = {
                    name: channel["shortSignalName"],
                    samplingRate: channel["samplingRate"],
                    unit: channel.ccBlock.physicalUnit
                }
            }

            let previewBody = $('#panel_file_preview div[role=body]');
            previewBody.append(jsonToDetailTree(newJSON, undefined, file.name));
        }
    });
}


