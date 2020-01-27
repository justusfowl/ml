import { MatSidenav, MatDrawer } from '@angular/material';
import { ViewChild } from '@angular/core';



export class NavDrawerService {

      
    myNavDrawer : any; 

    constructor() {

    }

    closeNav(){
        this.myNavDrawer.close();
    }

    setMyNavDrawer(navDrawer){
        console.log("Setting drawers....")
        this.myNavDrawer = navDrawer; 
    }


}