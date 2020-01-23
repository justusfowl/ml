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

        if (environment.env == "dev"){
            this.url = "http://" + environment.apiBase + ":8000"

        }else{
            this.url = "http://" + environment.apiBase
        }


    }

    public init(){
        console.log("SocketIO - env:" + environment.env)
        this.socket = io(this.url);

        this.getProgressLog()
        .subscribe((message: string) => {
            console.log(message);
            
            // add message at beginning of array
            this.logs.unshift(message);
        });
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

    public getProgressLog = () => {
        console.log("get logs...")
        return Observable.create((observer) => {
            this.socket.on("log", (message) => {
                observer.next(message);
            });
        });
    }

    // process the logs 
    public getObjectProgressLog = () => {
        console.log("get object individual logs...")
        return Observable.create((observer) => {
            this.socket.on("objlog", (message) => {
                observer.next(message);
            });
        });
    }

    public joinObjLogRoom(objId) {
        this.socket.emit('newobj', objId);
    }

    public leaveObjLogRoom(objId) {
        this.socket.emit('leaveobj', objId);
    }

}