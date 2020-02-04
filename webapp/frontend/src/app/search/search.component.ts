import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

import { debounceTime, distinctUntilChanged} from 'rxjs/operators';
import { ApiService } from '../api.service';
import { MatSnackBar } from '@angular/material';
import { ProgressService } from '../services/progress.service';


@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {

  

  searchText : any = "";
  modelChanged: Subject<string> = new Subject<string>();

  wfstatusRoutes = [
    {
      "wfstatus" : 1,
      "routeBase" : "/admin/label"
    },
    {
      "wfstatus" : 15,
      "routeBase" : "/admin/speller"
    },
    {
      "wfstatus" : 2,
      "routeBase" : "/admin/speller"
    },
    {
      "wfstatus" : 3,
      "routeBase" : "/admin/nerlabel"
    },
    {
      "wfstatus" : 4,
      "routeBase" : "/admin/nerlabel"
    },
    {
      "wfstatus" : 5,
      "routeBase" : "/admin/sentences"
    }
  ]

   

  constructor(
    public api : ApiService,
    public snackBar: MatSnackBar, 
    public progressService : ProgressService
  ) {

    this.modelChanged.pipe(
      debounceTime(300), 
      distinctUntilChanged())
      .subscribe(model => {
        console.log("Updated field...") 
        // this.api.searchQryString = model
      });
  }

  ngOnInit() {

    this.progressService.getMessages()
    .subscribe((message: string) => {

        console.log("From search: " + message)
    });


  }

  changed(text: string) {
    this.modelChanged.next(text);
  }


  execSearch(){

    this.api.searchQryStringText = this.api.searchQryString;

    this.progressService.loaderIsLoading()

    this.api.searchQueryHandler(this.api.searchQryString).then((res : any) =>{

        res.data.documents.forEach(element => {
          if (typeof(element.wfstatus_change) == "undefined"){
            element.wfstatus_change = [];
          }
        });

        this.api.searchResults = res.data.documents; 
        this.api.lastSearchTime = res.data.search_time;
        this.api.lastEmbedTime = res.data.embed_time; 

        this.api.flagHasSearched = true; 
        this.progressService.loaderIsComplete();

    }).catch(err => {
      console.error(err);
    })

  }

  getIfWfUpdateHasRoute(wfstatus_change){
    let routeIdx = this.wfstatusRoutes.findIndex((x : any) => parseInt(x.wfstatus) == Math.abs(parseInt(wfstatus_change.wfstatus))); 
    if (routeIdx > -1){
      return true;
    }else{
      return false;
    }
  }

  getWfRoute(wfstatus_change){
    let routeIdx = this.wfstatusRoutes.findIndex((x : any) => parseInt(x.wfstatus) == Math.abs(parseInt(wfstatus_change.wfstatus))); 
    if (routeIdx > -1){
      let route = this.wfstatusRoutes[routeIdx].routeBase;
      return route;
    }else{
      return "#"
    }

  }

  getWfToolTip(wfstatus_change){
    let date = new Date(wfstatus_change.timeChange);
    return date.toLocaleString()
  }


}
