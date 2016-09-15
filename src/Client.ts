import {ClientSocketOptions, ClientSocket} from "./ClientSocket";

export interface ClientOptions extends ClientSocketOptions {

}

export class Client {
    protected options:ClientOptions;
    protected socket:ClientSocket;

    constructor(options:ClientOptions) {
        this.options = options;
    }

    execute(method, ...args)  {
        if (!this.socket || this.socket.isClosed()) {
            this.socket = this.createSocket();
        }
        return this.socket.execute(method, ...args);
    }

    end() {
        if (this.socket) {
            this.socket.end();
        }
    }

    protected createSocket():ClientSocket {
        let socket = new ClientSocket(this.options);
        socket.connect();
        return socket;
    }
}



