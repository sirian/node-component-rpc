import * as net from "net";
import {Stream} from "./Stream";

export interface ClientSocketOptions {
    port:number;
    host?:string;
    timeout?:number;
}

export interface ClientRequest {
    resolve:Function,
    reject:Function,
    timeout
}

export class ClientSocket {
    protected options:ClientSocketOptions = {
        port: 0,
        host: '127.0.0.1',
        timeout: 5000
    };

    protected requests:{[id:string]:ClientRequest} = {};
    protected msgIdSequence:number = 0;
    protected closed:boolean = false;
    protected socket:net.Socket;
    protected requestLimit:number = 1000;

    constructor(options:ClientSocketOptions) {
        for (let key in options) {
            this.options[key] = options[key];
        }

        this.socket = new net.Socket();

        let stream = new Stream(this.socket);

        this.socket.on('close', () =>  {
            this.endRequests(new Error('Socket closed'));
        });

        this.socket.on('error', (e) => {
            this.endRequests(new Error('Socket error: ' + e.message));
        });

        stream.on('msg', (msg) => {
            if (1 === msg[0]) {
                let [tmp, msgId, err, result] = msg;
                this.response(msgId, err, result);
            }
        });
    }

    connect() {
        let o = this.options;
        this.socket.connect(o.port, o.host);
    }

    execute(method, ...params) {
        return new Promise((resolve, reject) => {
            let msgId:number = ++this.msgIdSequence;

            if (msgId >= this.requestLimit) {
                this.closed = true;
            }

            let data = JSON.stringify([0, msgId, method, params]) + '\n';

            let timeout = setTimeout(() => this.response(msgId, new Error('Request timeout')), this.options.timeout);

            this.requests[msgId] = {
                resolve: resolve,
                reject: reject,
                timeout: timeout
            };

            this.send(data);
        });
    }

    isClosed() {
        return this.closed;
    }

    end() {
        if (this.closed) {
            return;
        }
        this.closed = true;
        this.socket.end();
    }

    protected send(data) {
        this.socket.write(data);
    };

    protected endRequests(err:Error) {

        this.closed = true;

        for (let msgId in this.requests) {
            if (!this.requests.hasOwnProperty(msgId)) {
                continue;
            }

            this.response(+msgId, err);
        }
    }

    protected response(msgId:number, err?:Error, result?:any):void {
        if (!this.requests.hasOwnProperty(msgId)) {
            return;
        }

        let request = this.requests[msgId];
        clearTimeout(request.timeout);

        if (err) {
            request.reject(err);
        } else {
            request.resolve(result);
        }

        delete this.requests[msgId];

        if (this.closed && Object.keys(this.requests).length == 0) {
            this.socket.end();
        }
    }
}



