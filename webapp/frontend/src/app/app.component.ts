import { Component } from '@angular/core';

import {ApiService} from './api.service';
import { Title } from '@angular/platform-browser';
import { ProgressService } from './services/progress.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Medizinisches Freitextverständnis';

  constructor(
    public api: ApiService, 
    private titleService: Title, 
    private progressService : ProgressService
  ){
    this.titleService.setTitle( "medlines.tech - Medizinisches Freitextverständnis" );

    this.progressService.init();


  }
}
