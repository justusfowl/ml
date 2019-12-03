import { BrowserModule } from '@angular/platform-browser';
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

import { LabelComponent } from './admin/label/label.component';
import { NerlabelComponent } from './admin/nerlabel/nerlabel.component';

import {ApiService} from './api.service';
import { NgxFileDropModule } from 'ngx-file-drop';


@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    NlpComponent,
    HomeComponent,
    StatisticsComponent, 
    LabelComponent, 
    SettingsComponent, 
    NerlabelComponent
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
    NgxFileDropModule 
  ],
  providers: [
    ApiService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
