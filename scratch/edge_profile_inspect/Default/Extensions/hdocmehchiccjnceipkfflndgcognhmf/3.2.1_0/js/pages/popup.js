new class {

    #chkDisableToolbar = document.querySelector(".chk-disable-toolbar");

    constructor() {
        this.#chkDisableToolbar.addEventListener("change", () => void this.#onDisableToolbarChanged());

        void this.#init();
    }

    async #init() {
        const options = await this.#getOptionsAsync();

        this.#chkDisableToolbar.checked = options.disableToolbar;
    }

    async #onDisableToolbarChanged() {
        const checked = this.#chkDisableToolbar.checked;

        const options = await this.#getOptionsAsync();
        options.disableToolbar = checked;

        await Common.saveOptionsAsync(options);
    }

    async #getOptionsAsync() {
        return await new Promise(r => Common.getOptions(r));
    }

}();