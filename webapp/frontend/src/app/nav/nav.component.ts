import { Component } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent {

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  constructor(
    private breakpointObserver: BreakpointObserver, 
    public router : Router, 
    public api : ApiService, 
    private route: ActivatedRoute
  ) {}

  execSearch(){

    this.api.isLoading = true; 

    this.api.searchQueryHandler(this.api.searchQryString).then((res : any) =>{


        if (typeof(res.data.search_result) == "undefined"){
          this.api.searchResults = [];
          this.api.lastSearchTime = 0;
          this.api.lastEmbedTime = 0;
          this.api.flagHasSearched = false;
        }else{
          this.api.searchResults = res.data.search_result; 
          this.api.lastSearchTime = res.data.search_time;
          this.api.lastEmbedTime = res.data.embed_time; 
          this.api.flagHasSearched = true; 
        }

        
        this.api.isLoading = false; 

    }).catch(err => {
      console.error(err);
    })

  }

  isSearchActive(){
    if (this.api.flagHasSearched){
      let state : any = this.route.pathFromRoot[0];
      if (state._routerState.snapshot.url.indexOf("search") > -1){
        return true; 
      }else{
        return false; 
      }
    }else{
      return false; 
    } 
  }

}
