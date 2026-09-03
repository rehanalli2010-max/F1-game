String.prototype.formatUnicorn = String.prototype.formatUnicorn ||
    function () {
        "use strict";
        var str = this.toString();
        if (arguments.length) {
            var t = typeof arguments[0];
            var key;
            var args = ("string" === t || "number" === t) ?
                Array.prototype.slice.call(arguments)
                : arguments[0];

            for (key in args) {
                str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
            }
        }

        return str;
    };

HTMLElement.prototype.addDelegate = function (eventName, cssMatch, callback) {
    this.addEventListener(eventName, function (e) {
        for (let target = e.target; target && target != this; target = target.parentNode) {
            if (target.matches(cssMatch)) {
                callback(e, target);

                break;
            }
        }
    });
};

HTMLElement.prototype.findClosestAttr = function (attr) {
    let el = this.closest(`[${attr}]`);

    if (el) {
        return el.getAttribute(attr);
    }

    return null;
}

HTMLElement.prototype.checkElDisabled = function () {
    return this.closest(".disabled");
};

HTMLElement.prototype.mutualDisplay = function () {
    var parent = this.parentElement;

    parent.childNodes.forEach(c => {
        if (c.classList) {
            c.classList.add("d-none");
        }
    });

    this.classList.remove("d-none");
};

HTMLElement.prototype.mutualVisibility = function () {
    var parent = this.parentElement;

    parent.childNodes.forEach(c => {
        if (c.classList) {
            c.classList.add("invisible");
        }
    });

    this.classList.remove("invisible");
};

HTMLElement.prototype.setDisabled = function (disabled) {
    if (disabled) {
        this.setAttribute("disabled", "");
    } else {
        this.removeAttribute("disabled");
    }
};


//import { Common } from "../common.js";

class OptionsPage {

    container = document.querySelector("container");

    async initializeAsync() {
        await Common.initializeAsync2();

        /*
        const templateUrl = Common.extUrl + "html/options.html";

        const html = await fetch(templateUrl)
            .then(r => r.text());
        this.container.innerHTML = html;
        */
        await this.showOptionsAsync();

        this.addEventListeners();
    }

    addEventListeners() {
        document.body.addDelegate("change", "input[type=checkbox][data-setting]",
            (e, target) => this.setCheckboxOptions(e, target));

        [].forEach.call(this.getOptionRadio(), a => a.addEventListener("change", this.adsHandle.bind(this)));            
    }

    async setCheckboxOptions(e, target) {
        let prop = target.getAttribute("data-setting");
        this.currOptions[prop] = target.checked;
        chrome.storage.local.set({
            options:this.currOptions
        }, () => {});
    }

    async showOptionsAsync() {
        let that = this;
        Common.getOptions(function(resp){
            
            that.currOptions = resp;
            that.getOptionCheckboxes().forEach(el => {
                let prop = el.getAttribute("data-setting")
                el.checked = that.currOptions[prop];
            });
            that.getOptionRadio().forEach(el => {
                /*let prop = el.getAttribute("data-setting")
                el.checked = that.currOptions[prop];*/
                if(that.currOptions["player_ads"] === el.value){
                    el.checked = true;
                }
            });

        });
    }

    async adsHandle(a) {
        this.currOptions["player_ads"] = a.target.value;
        chrome.storage.local.set({
            options:this.currOptions,
            migrated: false
        }, () => {})
    }    

    getOptionCheckboxes() {
        return document.querySelectorAll("input[type=checkbox][data-setting]");
    }
    getOptionRadio() {
        return document.querySelectorAll("input[type=radio][name=player_ads]");
    }

}

(function () {
    new OptionsPage().initializeAsync();
})();