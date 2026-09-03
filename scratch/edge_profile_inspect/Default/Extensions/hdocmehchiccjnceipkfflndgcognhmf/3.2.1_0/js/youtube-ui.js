//export 
class YouTubeUI {

    async insertToTopbarAsync(el) {
        const topbar = document.querySelector("ytd-masthead");

        let container = null;

        await new Promise(resolve => {
            let trySetContainer = null;

            trySetContainer = () => {
                container = topbar.querySelector("#container");

                if (container) {
                    resolve();
                } else {
                    window.setTimeout(() => trySetContainer(), 500);
                }
            };

            trySetContainer();
        });

        container.insertBefore(el, container.firstChild);
    }

    insertBelowPlayer(el) {
        const metadata = document.querySelector("ytd-watch-metadata");
        const parent = metadata.parentElement;

        parent.insertBefore(el, metadata);
    }

    getPlayerEl() {
        
        return this.getPlayerVideoEl().closest("#player,#player-theater-container");
    }

    getPlayerVideoEl() {
        return document.querySelector("video");
    }

    isInYTTheaterMode() {
        return this.getPlayerEl() ? this.getPlayerEl().id.toLowerCase() == "player-theater-container" : false;
    }

    toggleYTTheaterMode() {
        let btn = document.querySelector(".ytp-size-button");

        if (btn) {
            btn.click();
        }
    }

    isWatching() {
        return window.location.pathname.toLowerCase().startsWith("/watch");
    }

    getVParam(){
        const params = new URLSearchParams(window.location.search);
        if (params.has("v")) {
            return params.get("v");
        }
        return null;
    }

}