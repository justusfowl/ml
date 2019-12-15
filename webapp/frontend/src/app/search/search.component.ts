import { Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

import { debounceTime, distinctUntilChanged} from 'rxjs/operators';


@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {

  searchText : any = "";
  modelChanged: Subject<string> = new Subject<string>();

   

  constructor() {

            this.modelChanged.pipe(
              debounceTime(300), 
              distinctUntilChanged())
              .subscribe(model => {
                this.searchText = model
                console.log(model)
              });
  }

  ngOnInit() {

  }

  changed(text: string) {
    this.modelChanged.next(text);
  }
  

}
