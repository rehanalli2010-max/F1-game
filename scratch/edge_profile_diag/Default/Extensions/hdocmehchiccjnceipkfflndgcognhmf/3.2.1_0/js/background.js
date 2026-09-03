//import { Settings } from "./settings.js";
//import { Common } from "./common.js";


/*-----------------------------------------------------------------------------
1.0 GLOBAL VARIABLES
-----------------------------------------------------------------------------*/

var locale_code = 'en',
    browser_icon = false,
    is_legacy_icon = true;


var homepage = function () {return chrome.runtime.getManifest().homepage_url};
var version = function () {return chrome.runtime.getManifest().version};

/*-----------------------------------------------------------------------------
2.0 FUNCTIONS
-----------------------------------------------------------------------------*/

function isset(variable) {
    if (typeof variable === 'undefined' || variable === null) {
        return false;
    }

    return true;
}

function getTranslations(path) {
    var xhr = new XMLHttpRequest();

    xhr.addEventListener('load', function() {
        if (chrome && chrome.tabs) {
            chrome.tabs.query({}, function(tabs) {
                for (var i = 0, l = tabs.length; i < l; i++) {
                    if (tabs[i].hasOwnProperty('url')) {
                        chrome.tabs.sendMessage(tabs[i].id, {
                            name: 'translation_response',
                            value: xhr.responseText
                        });
                    }
                }
            });
        }

        chrome.runtime.sendMessage({
            name: 'translation_response',
            value: xhr.responseText
        });
    });

    xhr.open('GET', path, true);
    xhr.send();
}

class BackgroundApp {

    async initializeAsync() {
        this.options = new Settings("options", () => Common.getDefaultSettings());
        let curr_opt = await this.options.getAsync();
        await this.options.setAsync(curr_opt);
        this.migrated = new Settings("migrated", () => {return false;});
        await this.migrated.setAsync(false);

        this.addEventListeners();
    }

    addEventListeners() {
    
        chrome.runtime.onMessageExternal.addListener(
            (request, sender, sendResponse) => this.onMessageReceived(request, sender, sendResponse));

        /*-----------------------------------------------------------------------------
        4.0 MESSAGE LISTENER
        -----------------------------------------------------------------------------*/

        chrome.runtime.onMessage.addListener(function(request, sender) {
            if (isset(request) && typeof request === 'object') {
                if (request.enabled === true && browser_icon !== 'always') {
                    /*
                    var folder = is_legacy_icon === true ? 'icons-legacy' : 'icons';
                    
                    chrome.action.setIcon({
                        path: 'assets/' + folder + '/32.png',
                        tabId: sender.tab.id
                    });
                    */
                }

                if (request.name === 'translation_request') {
                    getTranslations(request.path);
                }

                if (request.name === 'improvedtube-analyzer') {
                    var data = request.value,
                        date = new Date().toDateString(),
                        hours = new Date().getHours() + ':00';

                    chrome.storage.local.get(function(items) {
                        if (!items.analyzer) {
                            items.analyzer = {};
                        }

                        if (!items.analyzer[date]) {
                            items.analyzer[date] = {};
                        }

                        if (!items.analyzer[date][hours]) {
                            items.analyzer[date][hours] = {};
                        }

                        if (!items.analyzer[date][hours][data]) {
                            items.analyzer[date][hours][data] = 0;
                        }

                        items.analyzer[date][hours][data]++;

                        chrome.storage.local.set({
                            analyzer: items.analyzer
                        });
                    });
                }

                if (request.name === 'improvedtube-blacklist') {
                    chrome.storage.local.get(function(items) {
                        if (!items.blacklist || typeof items.blacklist !== 'object') {
                            items.blacklist = {};
                        }

                        if (request.data.type === 'channel') {
                            if (!items.blacklist.channels) {
                                items.blacklist.channels = {};
                            }

                            items.blacklist.channels[request.data.id] = {
                                title: request.data.title,
                                preview: request.data.preview
                            };
                        }

                        if (request.data.type === 'video') {
                            if (!items.blacklist.videos) {
                                items.blacklist.videos = {};
                            }

                            items.blacklist.videos[request.data.id] = {
                                title: request.data.title
                            };
                        }

                        chrome.storage.local.set({
                            blacklist: items.blacklist
                        });
                    });
                }

                if (request.name === 'improvedtube-watched') {
                    chrome.storage.local.get(function(items) {
                        if (!items.watched || typeof items.watched !== 'object') {
                            items.watched = {};
                        }

                        if (request.data.action === 'set') {
                            items.watched[request.data.id] = {
                                title: request.data.title
                            };
                        }

                        if (request.data.action === 'remove') {
                            delete items.watched[request.data.id];
                        }

                        chrome.storage.local.set({
                            watched: items.watched
                        });
                    });
                }

                if (request.name === 'download') {
                    chrome.permissions.request({
                        permissions: ['downloads'],
                        origins: ['https://www.youtube.com/*']
                    }, function(granted) {
                        if (granted) {
                            try {
                                var blob = new Blob([JSON.stringify(request.value)], {
                                    type: 'application/json;charset=utf-8'
                                });

                                chrome.downloads.download({
                                    url: URL.createObjectURL(blob),
                                    filename: request.filename,
                                    saveAs: true
                                });
                            } catch (err) {
                                chrome.runtime.sendMessage({
                                    name: 'dialog-error',
                                    value: err
                                });
                            }
                        } else {
                            chrome.runtime.sendMessage({
                                name: 'dialog-error',
                                value: 'permissionIsNotGranted'
                            });
                        }
                    });
                }

                if (request.name === 'improvedtube-play') {
                    chrome.tabs.query({}, function(tabs) {
                        for (var i = 0, l = tabs.length; i < l; i++) {
                            if (tabs[i].hasOwnProperty('url')) {
                                chrome.tabs.sendMessage(tabs[i].id, {
                                    name: 'improvedtube-play',
                                    id: request.id
                                });
                            }
                        }
                    });
                }

                if (isset(request.export)) {
                    chrome.storage.local.get(function(data) {
                        chrome.permissions.request({
                            permissions: ['downloads'],
                            origins: ['https://www.youtube.com/*']
                        }, function(granted) {
                            if (granted) {
                                var blob = new Blob([JSON.stringify(data)], {
                                        type: 'application/octet-stream'
                                    }),
                                    date = new Date();

                                chrome.downloads.download({
                                    url: URL.createObjectURL(blob),
                                    filename: 'improvedtube_' + (date.getMonth() + 1) + '_' + date.getDate() + '_' + date.getFullYear() + '.json',
                                    saveAs: true
                                });
                            }
                        });
                    });
                }


                /*if (isset(request.op)) {
                    switch (request.op) {
                        case "getOptions":
                            {
                                this.options.getAsync().then((r)=>sendResponse(r));
                                
                            }
            
                            break;
                        case "setOptions":
                            {
                                this.options.setAsync(request.data);
                                //sendResponse();
                            }
            
                            break;
                        case "blockAd":
                            this.blockAd(sender.tab.id);
                            //sendResponse();
                            break;
                        case "blockAdOnce":
                            this.blockAd(sender.tab.id, true);
                            //sendResponse();
                            break;                
                    }
            
                }*/

            }
        });

        chrome.runtime.onMessage.addListener((request, sender)=>this.onMessageReceived(request, sender))

             
        let that = this;
        chrome.commands.onCommand.addListener(function(a) {
            that.onSubmit({
              message : "yt-extender-keyboard-shortcut",
              command : a
            });
          });        

    }

    onSubmit(message){
        this.getActiveTabPromise().then(tab => {
            chrome.tabs.sendMessage(tab.id, message, function(a) {
                if (chrome.runtime.lastError) {
                  console.log(chrome.runtime.lastError);
                  
                }
              });            
        });    
    }

    getActiveTabPromise() {
        return new Promise(resolve => {
            chrome.tabs.query({
                active: true,
                currentWindow: true,
            }, tabs => resolve(tabs[0]));
        });
      }    

    async onMessageReceived(request, sender, sendResponse) {
        switch (request.op) {
            case "getOptions":
                {
                    const r = await this.options.getAsync();
                    return r;
                    //sendResponse(r);
                }
            case "setOptions":
                {
                    await this.options.setAsync(request.data);
                    //sendResponse();
                }

                break;
            case "blockAd":
                this.blockAd(sender.tab.id);
                //sendResponse();
                break;
            case "blockAdOnce":
                this.blockAd(sender.tab.id, true);
                //sendResponse();
                break;                
        }
    }

    blockAd(tabId, once) {
        chrome.scripting.executeScript({
            target: {
                tabId
            },
            files: [once ? "js/skipad-once.js" : "js/skipad.js"],
        })
    }    

}

(function () {
    new BackgroundApp().initializeAsync();
})();