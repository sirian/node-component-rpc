import * as net from "net";
import {Stream} from "./Stream";
import {Socket} from "net";

export interface ServerOptions {
    port: number;
    host: string;
}

export class Server {
    protected options: ServerOptions;
    protected connected = false;
    protected retryTimeout;
    protected handlers = {};
    protected socket: net.Server;

    constructor(options:ServerOptions) {
        this.options = options;
        this.createSocket();
    }

    createSocket() {
        let socket = net.createServer((conn:Socket) => this.handleConnection(conn));

        socket.on('listening', () => {
            this.connected = true;
        });

        socket.on('close', () => {
            this.connected = false;
        });

        socket.on('error', async (e) => {
            try {
                await this.close();
            } catch (ignored) {
            }


            clearTimeout(this.retryTimeout);
            this.retryTimeout = setTimeout(() => this.listen(), 1000);
        });

        this.socket = socket;
    }

    handleConnection(conn:Socket) {
        let stream = new Stream(conn);

        stream.on('msg', (msg) => {
            switch (msg[0]) {
                case 0:
                    let [tmp, msgId, method, params] = msg;

                    let promise = new Promise((resolve, reject) => {
                        try {
                            if (!this.handlers.hasOwnProperty(method)) {
                                reject(new Error("Unknown method " + method));
                                return;
                            }

                            let handler = this.handlers[method];
                            let result = handler(...params);

                            result
                                .then(resolve)
                                .catch(reject)
                            ;
                        } catch (e) {
                            reject(e)
                        }
                    });

                    promise
                        .then((result) => this.responseHandler(conn, msgId, null, result))
                        .catch((error) => this.responseHandler(conn, msgId, error))
                    ;
                    break;
            }
        });

        conn.on('end', () => {});

        conn.on('error', (e) => {
            conn.end();
        });
    };


    setHandler(method, listener:(...args) => Promise<any>) {
        this.handlers[method] = listener;
        return this;
    };

    responseHandler(conn:Socket, msgId:number, err:any = null, result:any = null) {
        if (err && err.stack) {
            err = err.stack;
        }

        let response = [1, msgId, err, result];

        let packed = JSON.stringify(response);

        conn.write(packed + '\n');
    };

    start() {
        return this.listen();
    };

    async listen() {
        clearTimeout(this.retryTimeout);

        let o = this.options;

        if (this.connected) {
            await this.close();
        }
        return new Promise((resolve) => this.socket.listen(o.port, o.host, resolve))
    };

    async close() {
        if (!this.connected) {
            return;
        }
        return new Promise((resolve) => this.socket.close(resolve));
    }
}

