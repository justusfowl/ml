import * as io from 'socket.io-client';
import { Observable } from 'rxjs';

export class ProgressService {
    private url = 'http://localhost:8000';
    private socket;    

    constructor() {
        this.socket = io(this.url);
    }

    public sendMessage(message) {
        this.socket.emit('new-message', message);
    }

    public getMessages = () => {
        console.log("get message")
        return Observable.create((observer) => {
            this.socket.on('new-message', (message) => {
                observer.next(message);
            });
        });
    }


}