class VtonApi extends EventTarget {
    #registered = new Set()

    constructor() {
        super();
		this.api_base = "9qpg1kcavbsyx5-3000.proxy.runpod.net";
		this.initialClientId = sessionStorage.getItem("clientId");
    }

    apiURL(route) {
		return `https://${this.api_base}${route}`;
    }

    fetchApi(route, options) {
        if(!options) {
            options = {};
        }
        if(!options.headers) {
            options.headers = {};
        }
        return fetch(this.apiURL(route), options);
    }
    
    addEventListener(type, callback, options) {
		super.addEventListener(type, callback, options);
		this.#registered.add(type);
	}
    /**
	 * Poll status  for colab and other things that don't support websockets.
	 */
	#pollQueue() {
		setInterval(async () => {
			try {
				const resp = await this.fetchApi("/prompt");
				const status = await resp.json();
				this.dispatchEvent(new CustomEvent("status", { detail: status }));
			} catch (error) {
				this.dispatchEvent(new CustomEvent("status", { detail: null }));
			}
		}, 1000);
	}

    /**
	 * Creates and connects a WebSocket for realtime updates
	 * @param {boolean} isReconnect If the socket is connection is a reconnect attempt
	 */
    #createSocket(isReconnect) {
        if (this.socket) {
			return;
		}

		let opened = false;
		let existingSession = window.name;
		if (existingSession) {
			existingSession = "?clientId=" + existingSession;
		}
		this.socket = new WebSocket(`wss://${this.api_base}/ws${existingSession}`);
		this.socket.binaryType = "arraybuffer";

        this.socket.addEventListener("open", () => {
			opened = true;
			if (isReconnect) {
				this.dispatchEvent(new CustomEvent("reconnected"));
			}
		});

        this.socket.addEventListener("error", () => {
            if (this.socket) this.socket.close();
            if (!isReconnect && !opened) {
				this.#pollQueue();
			}
        })

        this.socket.addEventListener("close", () => {
			setTimeout(() => {
				this.socket = null;
				this.#createSocket(true);
			}, 300);
			if (opened) {
				this.dispatchEvent(new CustomEvent("status", { detail: null }));
				this.dispatchEvent(new CustomEvent("reconnecting"));
			}
		});

        this.socket.addEventListener("message", (event) => {
            try {
                if (event.data instanceof ArrayBuffer) {
                    const view = new DataView(event.data);
					const eventType = view.getUint32(0);
					const buffer = event.data.slice(4);
					switch (eventType) {
					case 1:
						const view2 = new DataView(event.data);
						const imageType = view2.getUint32(0)
						let imageMime
						switch (imageType) {
							case 1:
							default:
								imageMime = "image/jpeg";
								break;
							case 2:
								imageMime = "image/png"
						}
						const imageBlob = new Blob([buffer.slice(4)], { type: imageMime });
						this.dispatchEvent(new CustomEvent("b_preview", { detail: imageBlob }));
						break;
					default:
						throw new Error(`Unknown binary websocket message of type ${eventType}`);
					}
                }
                else {
                    const msg = JSON.parse(event.data);
				    switch (msg.type) {
					    case "status":
						    if (msg.data.sid) {
							    this.clientId = msg.data.sid;
							    window.name = this.clientId; // use window name so it isnt reused when duplicating tabs
								sessionStorage.setItem("clientId", this.clientId); // store in session storage so duplicate tab can load correct workflow
						    }
						    this.dispatchEvent(new CustomEvent("status", { detail: msg.data.status }));
						    break;
					    case "progress":
						    this.dispatchEvent(new CustomEvent("progress", { detail: msg.data }));
						    break;
					    case "executing":
						    this.dispatchEvent(new CustomEvent("executing", { detail: msg.data.node }));
						    break;
					    case "executed":
						    this.dispatchEvent(new CustomEvent("executed", { detail: msg.data }));
						    break;
					    case "execution_start":
						    this.dispatchEvent(new CustomEvent("execution_start", { detail: msg.data }));
						    break;
					    case "execution_error":
						    this.dispatchEvent(new CustomEvent("execution_error", { detail: msg.data }));
						    break;
					    case "execution_cached":
						    this.dispatchEvent(new CustomEvent("execution_cached", { detail: msg.data }));
						    break;
					    default:
						    if (this.#registered.has(msg.type)) {
							    this.dispatchEvent(new CustomEvent(msg.type, { detail: msg.data }));
						    } else {
							    throw new Error(`Unknown message type ${msg.type}`);
						    }
				    }
                }
            } catch (error) {
                console.warn("Unhandled message: ", event.data, error);
            }
        })
    }

    /**
	 * Initialises sockets and realtime updates
	 */
    init() {
        this.#createSocket();
    }

    async queuePrompt() {
		if (window.generating) return;

		if (!window.model) {
			alert("upload model image");
		} else if(!window.clothes) {
			alert("upload cloth image");
		}

		prompt = {
			"1": {
			  "inputs": {
				"image": window.model.name,
				"upload": "image"
			  },
			  "class_type": "LoadImage",
			  "_meta": {
				"title": "Load Image"
			  }
			},
			"3": {
			  "inputs": {
				"seed": 863992698985211,
				"steps": 20,
				"cfg": 2.0300000000000002,
				"category": "Upper body",
				"pipe": [
				  "10",
				  0
				],
				"cloth_image": [
				  "4",
				  0
				],
				"model_image": [
				  "1",
				  0
				]
			  },
			  "class_type": "OOTDGenerate",
			  "_meta": {
				"title": "OOTDiffusion Generate"
			  }
			},
			"4": {
			  "inputs": {
				"image": window.clothes.name,
				"upload": "image"
			  },
			  "class_type": "LoadImage",
			  "_meta": {
				"title": "Load Image"
			  }
			},
			"5": {
			  "inputs": {
				"images": [
				  "3",
				  0
				]
			  },
			  "class_type": "PreviewImage",
			  "_meta": {
				"title": "Preview Image"
			  }
			},
			"7": {
			  "inputs": {
				"images": [
				  "3",
				  1
				]
			  },
			  "class_type": "PreviewImage",
			  "_meta": {
				"title": "Preview Image"
			  }
			},
			"10": {
			  "inputs": {
				"type": "Half body"
			  },
			  "class_type": "LoadOOTDPipelineHub",
			  "_meta": {
				"title": "Load OOTDiffusion from Hub🤗"
			  }
			},
			"11": {
			  "inputs": {
				"filename_prefix": "ComfyUI",
				"images": [
				  "3",
				  0
				]
			  },
			  "class_type": "SaveImage",
			  "_meta": {
				"title": "Save Image"
			  }
			}
		}

		window.generating = true;

        const body = {
            client_id: this.clientId,
            prompt: prompt,
        }

        const res = await this.fetchApi("/prompt", {
            method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
        })

        if (res.status !== 200) {
			window.generating = false;
            throw {
                response: await res.json(),
            }
        }

        return await res.json();
    } 

    async uploadFile(file, type) {
        try {
            // Wrap file in formdata so it includes filename
            const body = new FormData();
            body.append("image", file);
            
            const resp = await api.fetchApi("/upload/image", {
                method: "POST",
                body,
            });

            if (resp.status === 200) {
                const data = await resp.json();
                let path = data.name;
                if (data.subfolder) path = data.subfoler + "/" + path;
                console.log("Uploaded File: ", data);
				if (type === "model") {
					window.model = data;
				} else if (type === "clothes") {
					window.clothes = data;
				}
            } else {
                alert(`${resp.status} - ${resp.statusText}`);
            }
        } catch (error) {
            alert(error);
        }
    }
}


export const api = new VtonApi();