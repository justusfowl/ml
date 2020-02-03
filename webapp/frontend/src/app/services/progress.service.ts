import * as io from 'socket.io-client';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

import { MatTableDataSource } from '@angular/material/table';
import { ElementRef } from '@angular/core';

export class ProgressService {

    ENV : string = ""; 

    private url = 'http://localhost:8000';

    private socket;

    public logs = new MatTableDataSource()

    private globalSpinner : ElementRef;
    private globalBackdrop : ElementRef;

    public hbElement : any;
    public hbElementList : any;
    public flagAppOnline : boolean = false; 

    public globalBackdropMsg : string = "";

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
            
            this.logs.data.unshift(message);
            this.logs._updateChangeSubscription();
        });

        this.socket.on('hb', (message) => {
            this.updateHb(message);
        });

        this.socket.on('disconnect', (message) => {
            this.updateHb({});
            console.warn("The backend has gone away.");
         });

         this.globalBackdropMsg = "Die Anwendung ist offline."

        
    }


    updateHb(hbElement){

        let hbItems = []

        Object.keys(hbElement).forEach((key, val) => {

            hbItems.push({
                type : key, 
                worker : hbElement[key]
            })

        })

        this.hbElementList = hbItems;
        this.hbElement = hbElement;

        if (typeof(this.hbElement.app) != "undefined"){
            this.flagAppOnline = true;
            this.backdropHide();
        }else{
            this.flagAppOnline = false;
            this.backdropShow("Die Anwendung ist offline.");
        }

    }


    public getMessages = () => {
        return Observable.create((observer) => {
            this.socket.on('new-message', (message) => {
                this.logs.data.unshift(message);
                this.logs._updateChangeSubscription();
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
        console.log("joining room.." + objId)
        this.socket.emit('newobj', objId);
    }

    public leaveObjLogRoom(objId) {
        this.socket.emit('leaveobj', objId);
        console.log("leave the room....");
    }


    setGlobalBackdrop(backdropRef){
        this.globalBackdrop = backdropRef;
    }

    setGlobalSpinner(spinnerElemRef){
        this.globalSpinner = spinnerElemRef
    }

    
    backdropShow(msg=""){
        this.globalBackdropMsg = msg;
        this.globalBackdrop.nativeElement.classList.remove("hide")
    }

    backdropHide(){
        this.globalBackdropMsg = "";
        this.globalBackdrop.nativeElement.classList.add("hide")
    }

    loaderIsLoading(){
        this.globalSpinner.nativeElement.classList.remove("hideLoader")
    }

    loaderIsComplete(){
        this.globalSpinner.nativeElement.classList.add("hideLoader")
    }

}