import {ClientSocketOptions, ClientSocket} from "./ClientSocket";

export interface ClientOptions extends ClientSocketOptions {

}

export class Client {
    protected options:ClientOptions;
    protected socket:ClientSocket;

    constructor(options:ClientOptions) {
        this.options = options;
    }

    async execute(method, ...args)  {
        let socket = this.createSocket();
        let result = await socket.execute(method, ...args);
        socket.end();
        return result;
    }

    protected createSocket():ClientSocket {
        let socket = new ClientSocket(this.options);
        socket.connect();
        return socket;
    }
}



