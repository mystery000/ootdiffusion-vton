import { api } from "./api.js";

export class VTON {
    constructor () {}

    #addApiUpdateHandlers() {
        api.addEventListener("status", ({ detail }) => {
            console.log("status: ", detail)
		});

		api.addEventListener("reconnecting", () => {
            console.log("Reconnecting...");
		});

		api.addEventListener("reconnected", () => {
            console.log("Reconnected.")
		});

		api.addEventListener("progress", ({ detail }) => {
			this.progress = detail;
            console.log("progress: ", detail)
		});

		api.addEventListener("executing", ({ detail }) => {
			this.progress = null;
            console.log("executing: ", detail)
		});

		api.addEventListener("executed", ({ detail }) => {
			console.log("executed: ", detail)
			if (detail.node === "11") {
				document.getElementById("img_final").src = api.apiURL(`/view?filename=${detail.output.images[0].filename}&subfolder=${detail.output.images[0].subfolder}&type=${detail.output.images[0].type}`);
			}
			window.generating = false;
		});

		api.addEventListener("execution_start", ({ detail }) => {
			console.log("execution_start", detail);
		});

		api.addEventListener("execution_error", ({ detail }) => {
			this.lastExecutionError = detail;
            console.log("execution_error: ", detail)
		});

		api.addEventListener("b_preview", ({ detail }) => {
			const blob = detail
			const blobUrl = URL.createObjectURL(blob)
            console.log("b_preview", blobUrl);
		});

		api.init();
    }

    async setup() {
        this.#addApiUpdateHandlers();
    }
}

export const app = new VTON();