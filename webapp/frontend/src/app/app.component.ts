import { Component, ViewChild, AfterViewInit, ElementRef } from '@angular/core';

import { ApiService } from './api.service';
import { Title } from '@angular/platform-browser';
import { ProgressService } from './services/progress.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title = 'Medizinisches Freitextverständnis';

  @ViewChild('globalSpinner', {static: true}) public globalSpinner: ElementRef;
  @ViewChild('globalBackdrop', {static: true}) public globalBackdrop: ElementRef;
  
  constructor(
    public api: ApiService, 
    private titleService: Title, 
    private progressService : ProgressService
  ){

    this.titleService.setTitle( "medlines.tech - Medizinisches Freitextverständnis" );

    this.progressService.init();

  }

  ngAfterViewInit(){

    this.progressService.setGlobalSpinner(this.globalSpinner);
    this.progressService.setGlobalBackdrop(this.globalBackdrop);
    this.progressService.loaderIsComplete();
  }

}
