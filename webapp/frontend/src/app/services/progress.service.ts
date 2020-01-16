import * as io from 'socket.io-client';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export class ProgressService {

    ENV : string = ""; 

    private url = 'http://localhost:8000';

    private socket;

    public logs = [];

    constructor() {

        this.ENV = environment.env;

        this.url = "http://" + environment.apiBase

        if (typeof(environment.socketPort) != "undefined"){
            this.url= this.url + ":" + environment.socketPort;
        }else{
            this.url = "";
        }
        
        console.log("SocketIO - env:" + environment.env)

        this.socket = io(this.url);

    }

    public sendMessage(message) {
        this.socket.emit('new-message', message);
    }

    public getMessages = () => {
        console.log("get message")
        return Observable.create((observer) => {
            this.socket.on('new-message', (message) => {
                this.logs.push(message);
                observer.next(message);
            });
        });
    }


}