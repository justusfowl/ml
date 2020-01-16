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

    this.api.isLoading = true; 

    this.api.searchQueryHandler(this.api.searchQryString).then((res : any) =>{
        this.api.searchResults = res.data.search_result; 
        this.api.lastSearchTime = res.data.search_time;
        this.api.lastEmbedTime = res.data.embed_time; 

        this.api.flagHasSearched = true; 
        this.api.isLoading = false; 

    }).catch(err => {
      console.error(err);
    })

  }
  

}
