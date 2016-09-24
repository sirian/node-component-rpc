import {Server} from "../Server";
import * as tape from "tape";
import {Client} from "../Client";

tape('testServer', async (t) => {
    t.plan(1);

    let options = {host: '127.0.0.1', port: 12345};
    let server = new Server(options);
    server.setHandler('sum', async (a, b) => {
        return a + b;
    });

    await server.listen();

    let client = new Client(options);
    try {
        let res = await client.execute('sum', 1, 2);

        t.equal(res, 3);
        
        await server.close();
    } catch (e) {
        t.fail(e);
    }
});
