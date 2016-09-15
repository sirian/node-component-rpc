import * as events from "events";
import WritableStream = NodeJS.WritableStream;
import {Socket} from "net";

export class Stream extends events.EventEmitter{
    protected conn:Socket;
    protected buffer = '';

    constructor(conn:Socket) {
        super();
        this.conn = conn;
        conn.on('data', (chunk) => this.write(chunk));
        conn.on('end', () => {
            this.emit('end');
            this.removeAllListeners();
        })
    }

    protected write(chunk) {
        this.buffer += chunk;
        while (true) {
            let pos = this.buffer.indexOf('\n');
            if (-1 === pos) {
                break;
            }

            let msg = this.buffer.slice(0, pos);
            this.buffer = this.buffer.slice(pos +1);

            try {
                msg = JSON.parse(msg);
                this.emit('msg', msg);
            } catch (e) {
            }
        }
    }
}
