import { Component, ViewChild, AfterViewInit, ElementRef } from '@angular/core';

import { ApiService } from './api.service';
import { Title } from '@angular/platform-browser';
import { ProgressService } from './services/progress.service';
import { DeviceDetectorService } from 'ngx-device-detector';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title = 'Medizinisches Freitextverständnis';
  deviceInfo = null;

  @ViewChild('globalSpinner', {static: true}) public globalSpinner: ElementRef;
  @ViewChild('globalBackdrop', {static: true}) public globalBackdrop: ElementRef;
  
  constructor(
    public api: ApiService, 
    private titleService: Title, 
    public progressService : ProgressService,
    private deviceService: DeviceDetectorService
  ){

    this.titleService.setTitle( "medlines.tech - Medizinisches Freitextverständnis" );

    this.progressService.init();

   

  }

  ngAfterViewInit(){
    
    this.progressService.setGlobalSpinner(this.globalSpinner);
    this.progressService.setGlobalBackdrop(this.globalBackdrop);
    this.progressService.loaderIsComplete();

    this.validatePlatform();
  }
  
  validatePlatform(){
    this.getPlatformInfo();
    let self = this;
    if (this.deviceInfo.browser.toLowerCase() != "chrome"){
      setTimeout(function(){
        self.progressService.backdropShow(`Die Anwendung verlangt Google Chrome. Aktuell wird ${self.deviceInfo.browser} verwendet.`, true)
      }, 1000)
    }
  }

  getPlatformInfo(){
    console.log('hello `Home` component');
    this.deviceInfo = this.deviceService.getDeviceInfo();
    const isMobile = this.deviceService.isMobile();
    const isTablet = this.deviceService.isTablet();
    const isDesktopDevice = this.deviceService.isDesktop();
    console.log(JSON.stringify(this.deviceInfo));
    console.log(isMobile);  // returns if the device is a mobile device (android / iPhone / windows-phone etc)
    console.log(isTablet);  // returns if the device us a tablet (iPad etc)
    console.log(isDesktopDevice); // returns if the app is running on a Desktop browser.
  }

}
