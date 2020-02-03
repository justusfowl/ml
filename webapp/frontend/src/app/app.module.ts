import { BrowserModule } from '@angular/platform-browser';

import { HashLocationStrategy, LocationStrategy } from '@angular/common';

import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { LayoutModule } from '@angular/cdk/layout';

import { HttpClientModule, HTTP_INTERCEPTORS  } from '@angular/common/http'; 

import { MaterialModule } from './material.module';

import { NavComponent } from './nav/nav.component';
import { NlpComponent } from './nlp/nlp.component';
import { HomeComponent } from './home/home.component';
import { StatisticsComponent } from './statistics/statistics.component';
import { SettingsComponent } from './settings/settings.component';
import { SearchComponent } from './search/search.component';

import { TrimLongStr, LogFilterPipe, NERTagFilterPipe } from './pipes/pipes';

import { LabelComponent } from './admin/label/label.component';
import { SpellerComponent } from './admin/speller/speller.component';
import { NerlabelComponent } from './admin/nerlabel/nerlabel.component';
import { LogsComponent } from './admin/applogs/logs.component';
import { LoginComponent } from './login/login.component';
import { SentencesComponent } from './admin/sentences/sentences.component';

import { ApiService } from './api.service';
import { ProgressService } from './services/progress.service';
import { NavDrawerService } from './services/nav.service';

import { NgxFileDropModule } from 'ngx-file-drop';
import { ToastrModule } from 'ngx-toastr';
import { ColorPickerModule } from 'ngx-color-picker';

import { JwtInterceptor } from './services/jwt.intercept';
import { ErrorInterceptor } from './services/error.intercept';




@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    NlpComponent,
    SpellerComponent,
    HomeComponent,
    StatisticsComponent, 
    SentencesComponent,
    LogsComponent,
    LabelComponent,
    SettingsComponent, 
    NerlabelComponent, 
    LoginComponent,
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
    ColorPickerModule ,
    ToastrModule.forRoot()
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
      { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    {provide: LocationStrategy, useClass: HashLocationStrategy},
    ProgressService,
    ApiService, 
    NERTagFilterPipe, 
    NavDrawerService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
