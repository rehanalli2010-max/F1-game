//export 
class Settings {

    constructor(key, defaultValueFunc) {
        this.key = key;
        this.defaultValueFunc = defaultValueFunc || (() => ({}));
    }

    getAsync() {
        return new Promise(resolve => {
            chrome.storage.local.get([this.key], result => {
                if (!result || !result[this.key]) {
                    resolve(this.defaultValueFunc());
                }

                resolve(result[this.key]);
            });
        });
    }

    setAsync(value) {
        return new Promise(resolve => {
            const obj = {};
            obj[this.key] = value;

            chrome.storage.local.set(obj, resolve);
        });
    }

}