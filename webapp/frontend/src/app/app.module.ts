import { BrowserModule } from '@angular/platform-browser';

import { HashLocationStrategy, LocationStrategy } from '@angular/common';

import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { LayoutModule } from '@angular/cdk/layout';

import { HttpClientModule } from '@angular/common/http'; 

import { MaterialModule } from './material.module';

import { NavComponent } from './nav/nav.component';
import { NlpComponent } from './nlp/nlp.component';
import { HomeComponent } from './home/home.component';
import { StatisticsComponent } from './statistics/statistics.component';
import { SettingsComponent } from './settings/settings.component';
import { SearchComponent } from './search/search.component';

import { TrimLongStr, LogFilterPipe, NERTagFilterPipe } from './pipes/pipes';

import { LabelComponent } from './admin/label/label.component';
import { NerlabelComponent } from './admin/nerlabel/nerlabel.component';
import { LogsComponent } from './admin/applogs/logs.component';

import { ApiService } from './api.service';
import { ProgressService } from './services/progress.service';
import { NavDrawerService } from './services/nav.service';

import { NgxFileDropModule } from 'ngx-file-drop';
import { ToastrModule } from 'ngx-toastr';



@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    NlpComponent,
    HomeComponent,
    StatisticsComponent, 
    LogsComponent,
    LabelComponent,
    SettingsComponent, 
    NerlabelComponent, 
    SearchComponent,
    TrimLongStr,
    LogFilterPipe, 
    NERTagFilterPipe
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    LayoutModule,
    MaterialModule, 
    FormsModule, 
    ReactiveFormsModule,
    NgxFileDropModule, 
    ToastrModule.forRoot()
  ],
  providers: [
    {provide: LocationStrategy, useClass: HashLocationStrategy},
    ProgressService,
    ApiService, 
    NERTagFilterPipe, 
    NavDrawerService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
