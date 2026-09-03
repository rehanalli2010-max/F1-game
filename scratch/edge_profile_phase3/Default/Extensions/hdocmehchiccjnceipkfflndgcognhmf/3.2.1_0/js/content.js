//import { YouTubeUI } from "./youtube-ui.js";
//import { Common } from "./common.js";

class ContentApp {

    async initializeAsync(config) {
        this.onAutoHide = null;
        this.opts = config;
        await new Promise(resolve => window.setTimeout(resolve, 1000));



        await Common.initializeAsync();
        this.ui = new YouTubeUI();

        window.addEventListener("yt-navigate-finish",
            () => this.onYoutubePageNavigateFinished());

        document.body.addEventListener("keydown", (e) => {
            switch (e.keyCode) {
                case 27:
                    this.turnOffTheaterMode();
                    break;
            }
        });

        Common.getOptions((currOptions) => {
            this.ensureAutoHideAds(currOptions);
            chrome.storage.onChanged.addListener((changes) => {
                this.mesOnChange(changes);
            });

            if (currOptions.theme == "dark") {
                this.onSwitchThemeButtonClickAsync();
            }
        });


        window.setInterval(() => {
            if (!this.ui.isInYTTheaterMode()) {
                this.turnOffTheaterMode();
            }
        }, 500);

        setTimeout(async _ => {
            await this.onYoutubePageNavigateFinished();
        }, 500);


    }

    async onYoutubePageNavigateFinished() {
        Common.getOptions((options) => {
            this.ensureAutoHideAds(options);
        });
        //this.ensureThemeButton();
        this.ensurePlayerBar();
        this.ensureRightBar();

        Common.getOptions((currOptions) => {
            if (this.ui.isWatching()) {

                if (currOptions.theaterOnStart) {
                    this.onTheaterModeButtonClick();
                }

                if (currOptions.volumeScroll) {
                    this.enableVolumeScroll();
                }
            }

        });
    }

    ensureAutoHideAds(options) {
        if (this.ui.isWatching()) {
            if (options["player_ads"] === "all_videos" || options["player_ads"] === "block_all") {
                this.onAutoHide = setInterval(() => {

                    this.turnonBlock();


                }, 100);
            }
        }
    }

    stopAutoHide() {
        if (this.onAutoHide) {
            clearInterval(this.onAutoHide);
        }
    }

    mesOnChange(changes) {

        for (let pref in changes) {
            const storageChange = changes[pref];
            //console.log("pref:", pref)
            //console.log("changes:", JSON.stringify(storageChange));

            if (pref === "options") {
                if (storageChange.newValue["player_ads"] === "all_videos" || storageChange.newValue["player_ads"] === "block_all") {
                    this.stopAutoHide();
                    Common.getOptions((options) => {
                        this.ensureAutoHideAds(options);
                    });

                }
                else {
                    this.stopAutoHide();
                }
            }
        }
    }

    enableVolumeScroll() {
        let video = this.ui.getPlayerVideoEl();

        if (!video) {
            return;
        }

        if (this.volumeScrollEventHandler) {
            video.removeEventListener("wheel", this.volumeScrollEventHandler);
        } else {
            this.volumeScrollEventHandler = (e) => this.onVideoElScroll(e);
        }

        if (this.lblVolume) {
            this.lblVolume.remove();
        }

        this.lblVolume = document.createElement("div");
        this.lblVolume.classList.add("yt-ext-volume-label");

        video.addEventListener("wheel", this.volumeScrollEventHandler);
    }

    onVideoElScroll(e) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        let delta = 0;
        if (e.deltaY == 0) {
            return;
        } else if (e.deltaY < 0) {
            delta = -5;
        } else {
            delta = 5;
        }

        const video = this.ui.getPlayerVideoEl();
        let volume = parseInt(video.volume * 100) + delta;

        if (volume < 0) {
            volume = 0;
        }

        if (volume > 100) {
            volume = 100;
        }

        video.volume = volume / 100;

        this.lblVolume.innerHTML = parseInt(volume);
        video.parentElement.append(this.lblVolume);

        video.setAttribute("data-remove-time", Date.now() + 3000);
        window.setTimeout(() => {
            let removeTime = parseInt(video.getAttribute("data-remove-time"));
            if (Date.now() >= removeTime) {
                this.lblVolume.remove();
            }
        }, 3500);
    }

    async ensureThemeButton() {
        const existingButton = document.querySelector("#yt-extender-btn-theme");
        if (existingButton) {
            return;
        }

        const btnTop = this.getTopButton();
        await this.ui.insertToTopbarAsync(btnTop);
    }

    async ensurePlayerBar() {
        if (!this.ui.isWatching()) {
            return;
        }

        const options = (await chrome.storage.local.get("options"))["options"];
        if (options.disableToolbar) { return; }

        const existingBar = document.querySelector("#yt-extender-feature-bar");
        if (existingBar) {
            return;
        }

        const extBar = this.getExtensionBar();
        this.ui.insertBelowPlayer(extBar);


        var stepSlider = document.getElementById('slider-range');
        noUiSlider.create(stepSlider, {
            start: [100],
            step: 50,
            connect: [true, false],
            range: {
                'min': [0],
                'max': [600]
            }
        });
        var stepSliderValueElement = document.getElementById('slider-step-value');
        let that = this;
        stepSlider.noUiSlider.on('update', function (values, handle) {
            stepSliderValueElement.innerHTML = `${parseInt(values[handle])}%`;
            //debugger;
            const video = that.ui.getPlayerVideoEl();
            const needNewBoosting = that.currentAudioHook != video;

            that.audioBoostingIndex = parseInt(values[handle] / 50);
            if (that.audioBoostingIndex >= ContentApp.BOOST_VALUES.length) {
                that.audioBoostingIndex = 11;
            }

            const boostingValue = ContentApp.BOOST_VALUES[that.audioBoostingIndex];
            if (needNewBoosting) {
                const audioContext = new AudioContext();
                const source = audioContext.createMediaElementSource(video);

                that.gainNode = audioContext.createGain();
                that.gainNode.gain.value = boostingValue;
                source.connect(that.gainNode);

                that.gainNode.connect(audioContext.destination);

                that.currentAudioHook = video;
            } else {
                that.gainNode.gain.value = boostingValue;
            }

            //const btn = event.target;
            //btn.innerHTML = `<span class="boots-value">x${boostingValue}</span>`;

        });

    }

    ensureRightBar() {

        if (!this.ui.isWatching()) {
            return;
        }
        var player = this.ui.getPlayerEl();
        const existingBar = player.querySelector(".ytp-right-controls");
        if (!existingBar || (existingBar && existingBar.querySelector(".yt-extender-keyboard-shortcuts"))) {
            return;
        }

        var icon;
        var m = document.createElement("div");
        var e = document.createElement("div");
        var el = document.createElement("span");
        var me = document.createElement("button");
        var node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        var circle = document.createElementNS("http://www.w3.org/2000/svg", "path");
        var contentOfA = existingBar.querySelector('button:not([style*="display"])');
        el.className = "ytp-tooltip-text ytp-tooltip-text-custom";
        el.textContent = (this.opts.keyboard_shortcuts ? this.opts.keyboard_shortcuts : "") + " \ud83d\uddd7";
        e.appendChild(el);
        e.className = "ytp-tooltip-text-wrapper";
        m.appendChild(e);
        m.className = "ytp-bottom";
        m.style.display = "none";
        player.appendChild(m);
        me.className = "ytp-button yt-extender-keyboard-shortcuts";
        let that = this;
        me.addEventListener("click", function () {
            window.open(`${that.opts.homepage}keyboard-shortcuts`, "_blank");
        });
        me.addEventListener("mouseenter", function (event) {
            contentOfA.dispatchEvent(new Event("mouseover"));
            contentOfA.dispatchEvent(new Event("mouseout"));
            if (!icon) {
                icon = player.querySelector(".ytp-tooltip");
            }
            if (icon && "" !== icon.style.top) {
                m.classList.add("ytp-tooltip");
                m.style.display = "block";
                m.style.top = icon.style.top;
                m.style.left = me.offsetLeft + event.target.getBoundingClientRect().width - m.getBoundingClientRect().width / 2 + "px";
            }
        });
        me.addEventListener("mouseleave", function () {
            /** @type {string} */
            m.style.display = "none";
            m.classList.remove("ytp-tooltip");
        });
        node.setAttributeNS(null, "version", "1.1");
        node.setAttributeNS(null, "viewBox", "0 0 36 36");
        node.setAttributeNS(null, "height", "100%");
        node.setAttributeNS(null, "width", "100%");
        circle.setAttributeNS(null, "d", "m26 11h-16c-1.1 0-1.99.9-1.99 2l-.01 10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-10c0-1.1-.9-2-2-2zm-9 3h2v2h-2zm0 3h2v2h-2zm-3-3h2v2h-2zm0 3h2v2h-2zm-1 2h-2v-2h2zm0-3h-2v-2h2zm9 7h-8v-2h8zm0-4h-2v-2h2zm0-3h-2v-2h2zm3 3h-2v-2h2zm0-3h-2v-2h2z");
        circle.setAttributeNS(null, "fill", "#fff");
        me.appendChild(node);
        node.appendChild(circle);
        existingBar.insertBefore(me, existingBar.firstChild);

        if (!existingBar || (existingBar && existingBar.querySelector(".yt-extender-loop"))) {
            return;
        }

        var icon2;

        var m2 = document.createElement("div");

        var e2 = document.createElement("div");

        var el2 = document.createElement("span");

        var me2 = document.createElement("button");

        el2.className = "ytp-tooltip-text ytp-tooltip-text-custom";

        el2.textContent = (this.opts.loop_video ? this.opts.loop_video : "") + " \ud83d\uddd7";
        e2.appendChild(el2);

        e2.className = "ytp-tooltip-text-wrapper";
        m2.appendChild(e2);

        m2.className = "ytp-bottom";

        m2.style.display = "none";
        player.appendChild(m2);

        me2.className = "ytp-button yt-extender-loop";
        me2.addEventListener("click", function () {
            //window.open(`${that.opts.homepage}player?v=${that.ui.getVParam()}`, "_self");
            document.location.href = `${that.opts.homepage}player?v=${that.ui.getVParam()}`;
        });
        me2.addEventListener("mouseenter", function (event) {
            if (!icon2) {
                icon2 = player.querySelector(".ytp-tooltip");
            }
            if (icon2 && "" !== icon2.style.top) {
                m2.classList.add("ytp-tooltip");

                m2.style.display = "block";
                m2.style.top = icon2.style.top;

                m2.style.left = me2.offsetLeft + event.target.getBoundingClientRect().width - m2.getBoundingClientRect().width / 2 + "px";
            }
        });
        me2.addEventListener("mouseleave", function () {
            m2.style.display = "none";
            m2.classList.remove("ytp-tooltip");
        });
        try {
            existingBar.insertBefore(me2, existingBar.firstChild.nextSibling);
        }
        catch (ex) {
            console.log(ex);
        }


    }

    turnOffTheaterMode() {
        document.body.classList.remove("yt-ext-theater-mode");
    }

    onScreenshotButtonClick() {
        const videoEl = this.ui.getPlayerVideoEl();

        const canvas = document.createElement("canvas");
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const canvasContext = canvas.getContext("2d");
        canvasContext.drawImage(videoEl, 0, 0);

        canvas.toBlob(blob => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "screenshot.png";
            a.target = "_blank";

            a.click();
        });
    }

    getExtensionBar() {
        const barEl = document.createElement("div");
        barEl.id = "yt-extender-feature-bar";
        barEl.classList.add("yt-ext-bar");

        const sliderWrapEl = document.createElement("div");
        sliderWrapEl.id = "slider-range-wrap";
        sliderWrapEl.classList.add("hidden-el");
        barEl.append(sliderWrapEl);

        const sliderEl = document.createElement("div");
        sliderEl.id = "slider-range";
        sliderWrapEl.append(sliderEl);

        const sliderStepEl = document.createElement("div");
        sliderStepEl.id = "slider-step-value";
        sliderWrapEl.append(sliderStepEl);

        // const icon = document.createElement("img");
        // icon.classList.add("icon")
        // icon.src = Common.extUrl + "img/icon-32.png";
        // barEl.append(icon);

        const btnAdsBlock = document.createElement("button");
        btnAdsBlock.id = "btn-yt-ext-ads-block";
        btnAdsBlock.classList.add("btn-yt-ext");
        btnAdsBlock.title = "Remove Ads";
        btnAdsBlock.addEventListener("click",
            () => this.turnonBlock());
        barEl.append(btnAdsBlock);

        const btnTheater = document.createElement("button");
        btnTheater.title = "Turn on Theater Mode";
        btnTheater.id = "theater-mode";
        btnTheater.classList.add("btn-yt-ext");
        btnTheater.addEventListener("click",
            () => this.onTheaterModeButtonClick());
        barEl.append(btnTheater);



        const btnScreenshot = document.createElement("button");
        btnScreenshot.title = "Screenshot";
        btnScreenshot.id = "btn-yt-extended-screenshot";
        btnScreenshot.classList.add("btn-yt-ext");
        btnScreenshot.addEventListener("click",
            () => this.onScreenshotButtonClick());
        barEl.append(btnScreenshot);

        const btnVolumeBoost = document.createElement("button");
        btnVolumeBoost.title = "Boost Volume";
        btnVolumeBoost.classList.add("btn-yt-ext");
        btnVolumeBoost.id = "btn-yt-ext-volume-boost";
        btnVolumeBoost.addEventListener("click",
            () => this.onVolumeBoostButtonClick());
        barEl.append(btnVolumeBoost);



        /*
        const cboFilter = document.createElement("select");
        cboFilter.setAttribute("class", "yt-ct-select");
        cboFilter.title = "Choose Filter";
        for (let filter of ContentApp.FILTERS) {

            let opt = document.createElement("option");
            opt.innerHTML = filter.name;
            opt.value = filter.value;
            cboFilter.append(opt);
        }

        cboFilter.addEventListener("change",
            () => this.onFilterSelected());
        barEl.append(cboFilter);*/



        const btnFloat = document.createElement("button");
        btnFloat.id = "btn-yt-ext-float";
        btnFloat.classList.add("turn-on");
        btnFloat.classList.add("btn-yt-ext");
        btnFloat.title = "Float Video";
        btnFloat.addEventListener("click",
            () => this.turnOnFloatMode());
        barEl.append(btnFloat);

        const btnLoop = document.createElement("button");
        btnLoop.id = "btn-yt-ext-loop";
        btnLoop.classList.add("btn-yt-ext");
        btnLoop.title = "Loop Video";
        btnLoop.addEventListener("click",
            () => this.openLoopFeature());
        barEl.append(btnLoop);

        const btnOptions = document.createElement("button");
        btnOptions.id = "btn-yt-ext-options";
        btnOptions.classList.add("btn-yt-ext");
        btnOptions.title = "Options";
        btnOptions.addEventListener("click",
            () => this.showOptions());
        barEl.append(btnOptions);

        return barEl;
    }

    showOptions() {
        window.open(`${Common.extUrl}options.html`, "_blank");

    }

    turnOnFloatMode() {
        javascript: document.getElementsByTagName('video')[0].requestPictureInPicture();

    }
    openLoopFeature() {
        document.location.href = `${this.opts.homepage}player?v=${this.ui.getVParam()}`;

    }
    async turnonBlock() {

        //alert("Your youtube has been blocked from ads, please enjoy!!!");
        /*
        let opts = await Common.getOptionsAsync();
        if(opts){
            debugger;
            opts.old_player_ads = opts.player_ads;
            opts.is_manual = true;
            opts.player_ads = 'block_all';
            Common.saveOptionsAsync(opts);
        }
        */
        /*
        if(!window.xxx_injext_xxx){
            const body = document.body || document.querySelector("body") || document.documentElement;
            const scriptEl = document.createElement("script");
            //scriptEl.setAttribute("type", "module");
            scriptEl.src = `${Common.extUrl}js/skipad.js`;
            body.append(scriptEl);
    
        }
        */
        //    chrome.runtime.sendMessage(Common.extId, {
        //         op: "blockAdOnce"
        //     });

    }

    onFilterSelected() {
        const video = this.ui.getPlayerVideoEl();
        if (!video) {
            return;
        }

        const value = event.target.value;
        video.style.filter = value;
    }

    onVolumeBoostButtonClick() {
        var rangeSlider = document.getElementById('slider-range-wrap');
        rangeSlider.classList.toggle("hidden-el");

    }

    onTheaterModeButtonClick() {
        if (!this.ui.isInYTTheaterMode()) {
            this.ui.toggleYTTheaterMode();
        }

        window.setTimeout(() => {
            const videoEl = this.ui.getPlayerVideoEl();

            let w = videoEl.clientWidth;
            let h = videoEl.clientHeight;

            const vpW = Math.max(document.documentElement.clientWidth, window.innerWidth);
            const vpH = Math.max(document.documentElement.clientHeight, window.innerHeight);

            const scale = Math.min(vpW / w, vpH / h);
            w = w * scale;
            h = h * scale;

            const x = (vpW - w) / 2;
            const y = (vpH - h) / 2;

            document.body.classList.toggle("yt-ext-theater-mode");
            videoEl.style.width = w + "px";
            videoEl.style.height = (h - 80) + "px";
            videoEl.style.left = x + "px";
            videoEl.style.top = y + "px";
        }, 500);
    }

    getTopButton() {
        const container = document.createElement("yt-icon-button");
        container.id = "yt-extender-btn-theme";

        const btn = document.createElement("button");
        btn.setAttribute("id", "set-theme");
        btn.setAttribute("class", "set-theme");

        btn.addEventListener("click",
            () => this.onSwitchThemeButtonClickAsync());

        container.append(btn);
        return container;
    }



    async onSwitchThemeButtonClickAsync() {
        const currTheme = document.body.getAttribute("data-theme");
        let theme = "dark";
        const setThemeEl = document.querySelector("#set-theme");

        if (currTheme == "dark") {
            theme = "light";
            setThemeEl.classList.remove("dark-theme");
            setThemeEl.classList.add("set-theme");
        } else {
            setThemeEl.classList.add("dark-theme");
            setThemeEl.classList.remove("set-theme");
        }

        document.body.setAttribute("data-theme", theme);

        let currOptions = Common.getOptions((options) => {
            options.theme = theme;
            Common.saveOptionsAsync(options);

        });
    }

}

ContentApp.BOOST_VALUES = [0, 0.4, 0.7, 1.1, 1.4, 1.7, 2.1, 2.4, 2.7, 3, 3.2, 3.5];
ContentApp.FILTERS = [
    { name: "None", value: "" },
    { name: "Blur", value: "blur(5px)" },
    { name: "Brighten", value: "brightness(200%)" },
    { name: "Contrast", value: "contrast(200%)" },
    { name: "Grayscale", value: "grayscale(1)" },
    { name: "Invert", value: "invert(1)" },
    { name: "Sepia", value: "sepia(1)" },
];

//export { ContentApp };
(function () {
    const info = document.createElement("div");
    info.id = "info-youtube-extender";
    info.setAttribute("data-ext-id", chrome.runtime.id);

    const baseUrl = chrome.runtime.getURL("/");
    info.setAttribute("data-ext-base", baseUrl);

    document.body.append(info);
    let homepage = function () { return chrome.runtime.getManifest().homepage_url };
    var YT_EXTENDER_OPTS = {
        keyboard_shortcuts: `${chrome.i18n.getMessage("keyboard_shortcuts")}`,
        loop_video: "Loop Video",
        homepage: `${homepage()}`
    }
    window.contentApp = new ContentApp();
    window.contentApp.initializeAsync(YT_EXTENDER_OPTS);

    chrome.runtime.onMessage.addListener(function (a, b, c) {
        if (b = document.querySelector("#yt-extender-feature-bar")) switch (a.command) {
            case "remove-ads":
                b.querySelector("#btn-yt-ext-ads-block")
                    .click();
                break;
            case "create-screenshot":
                b.querySelector('#btn-yt-extended-screenshot')
                    .click();
                break;
            case "cinema-mode":
                b.querySelector("#theater-mode")
                    .click();
                break;
            case "float-video":
                b.querySelector("#btn-yt-ext-float")
                    .click()
        }
    });


})();