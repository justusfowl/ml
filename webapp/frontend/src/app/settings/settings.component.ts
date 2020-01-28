import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../api.service';
import { ProgressService } from '../services/progress.service';
import { MatTableDataSource, MatSort, MatSnackBar } from '@angular/material';

import {Subject} from "rxjs";
import {debounceTime, distinctUntilChanged} from "rxjs/internal/operators";

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  tags : any = [];
  rowChanged = new Subject<any>();
  valChanged = new Subject<any>();
  displayedColumnsTags: string[] = ['_id', 'value', 'shortcut', 'prod'];

  @ViewChild('sortTags', {static: false}) sortTags: MatSort;

  constructor(
    public api : ApiService, 
    private progressService : ProgressService, 
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() {
    this.getNerLabelTag();


    this.valChanged.pipe(
      debounceTime(1000), 
      distinctUntilChanged())
      .subscribe(model => {
        this.updateTag(this.rowChanged);
        // this.api.searchQryString = model
      });
    
  }

  getNerLabelTag(){

    this.progressService.loaderIsComplete();

    this.api.getNerLabelTag().then( (data : any) => {
      this.tags = data;
      this.progressService.loaderIsComplete();
    }).catch(err => {
      console.error(err);
      this.progressService.loaderIsComplete();
    })
  }

  handleTagChange(row, evt){
    this.rowChanged = row;
    this.valChanged.next(evt);
    // this.updateTag(row);
  }

  test(){
    console.log(this.tags)
  }

  changeColor(color, row){
    this.updateTag(row);
  }

  updateTag(tag){
    this.api.updateNerLabelTag(tag).then(res => {
      this.snackBar.open('Tag aktualisiert.', null, {
        duration: 1500,
      });
    }).catch(err => {
      this.snackBar.open('FEHLER | bitte Konsole prüfen.', null, {
        duration: 1500,
      });
      console.error(err);
    })
  }

}
