import dotenv from 'dotenv';
import { makeApp } from './app';

dotenv.config({ path: '../.env' });

const app = makeApp('/');
const port = parseInt(process.argv[2] || '8080');
let server = app.listen(port, function() {
    const allocPort = server.address().port;
    console.log(`Listening on ${allocPort}`);
    if(process.send) {
        process.send({port: allocPort});
    }
});
//TODO: Why does removing this cause the app to terminate immediately?
console.log(server);
