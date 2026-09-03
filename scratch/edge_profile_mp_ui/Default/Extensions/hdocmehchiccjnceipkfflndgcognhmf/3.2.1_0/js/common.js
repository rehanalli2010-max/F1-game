//export 
class Common {
    static initializeAsync() {
        let infoEl = document.querySelector("#info-youtube-extender");
        if (!infoEl) {
            return;
        }

        Common.extId = infoEl.getAttribute("data-ext-id");
        Common.extUrl = infoEl.getAttribute("data-ext-base");
    }

    static initializeAsync2() {

        Common.extId = chrome.runtime.id;
        Common.extUrl = `chrome-extension://${chrome.runtime.id}/`;//infoEl.getAttribute("data-ext-base");
    }

    static getOptionsAsync() {
        return new Promise(resolve => {
            
            chrome.runtime.sendMessage(Common.extId, {
                op: "getOptions",
            }, resolve);
        });
    }

    static getOptions(callback) {
        
        chrome.storage.local.get("options", result => {
            if (!result || !result["options"]) {
                callback(Common.getDefaultSettings());
            }
            else{
                callback(result["options"]);
            }
        });                    
        /*
        chrome.runtime.sendMessage(Common.extId, {
            op: "getOptions",
        }, function(resp){
            debugger;
            callback(resp);
        });
        */
    }

    static saveOptionsAsync(options) {
        return new Promise(resolve => {
            chrome.runtime.sendMessage(Common.extId, {
                op: "setOptions",
                data: options
            }, resolve);
        });
    }
    
    static getDefaultSettings() {
        return {
            volumeScroll: true,
            theaterOnStart: false,
            disableToolbar: false,
            player_ads:'block_all',
            is_manual:false
        }
    }


}

Common.SERVER_URL = "https://www.cinemamode.co/";
//Common.SERVER_URL = "../html/options.html";