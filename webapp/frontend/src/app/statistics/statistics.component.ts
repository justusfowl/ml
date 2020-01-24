import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../api.service';
import { ActivatedRoute } from '@angular/router';
import { ProgressService } from '../services/progress.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit {

  displayedColumnsWorkflow: string[] = ['_id', 'count'];
  workflowStats : any = [];

  displayedColumnsBbox: string[] = ['bboxcount'];

  bboxLabelStats : any = []
  bboxLabelCount : number = 0; 


  displayedColumnsNER: string[] = ['value', 'count'];
  nerLabelStats : any;

  constructor(
    private api: ApiService, 
    private route: ActivatedRoute, 
    public progressService : ProgressService
  ) { }

  @ViewChild('sortWF', {static: false}) sortWF: MatSort;
  @ViewChild('sortNER', {static: false}) sortNER: MatSort;
  @ViewChild('sortBbox', {static: false}) sortBbox: MatSort;
  

  ngOnInit() {
    this.getWorkflowStats();
    this.getBboxLabelStats(); 
    this.getNerLabelStats();

    console.log(this.route.snapshot.paramMap.get('objId'));
    
  }

  getWorkflowStats(){

    this.api.getStatsWorkflow().then((result : any) => {
      this.workflowStats = new MatTableDataSource(result);
      this.workflowStats.sort = this.sortWF;
    }).catch(err => {
      console.log(err);
    })

  }

  getBboxLabelStats(){
    this.api.getBboxLabelStats().then((result : any) => {
      this.bboxLabelStats = result;
      console.log(result.bbox_count);
      try{
        this.bboxLabelCount = result.bbox_count; 
        this.bboxLabelStats = new MatTableDataSource([{"bboxcount" : result.bbox_count}]); 
        this.bboxLabelStats.sort = this.sortBbox; 
      }catch(err){
        console.error(err);
      }
    }).catch(err => {
      console.log(err);
    })
  }

  getNerLabelStats(){

    this.api.getNERStats().then((result : any) => {

      this.nerLabelStats = new MatTableDataSource(result.nertags); 
      this.nerLabelStats.sort = this.sortNER;

    }).catch(err => {
      console.log(err);
    })

  }



}
