import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  myTransactions : any[]; 
  currentTransactionAgg : any; 

  numberOfCols : number = 1;


  constructor(
    private api : ApiService
  ) { }

  ngOnInit() {
    this.getMyTransactionAggs(); 
  }

  getMyTransactionAggs(){
    this.api.getMyTransactionAggs().then((result:any) => {

      console.log(result);

      this.myTransactions = result;

      let currentIdx = result.findIndex(x => (x.current));

      if (currentIdx < 0){
        currentIdx = 0;
      }
      this.selectMonthYear(currentIdx);

    }).catch(err => {
      console.error(err);
    })
  }

  selectMonthYear(idx){
    this.currentTransactionAgg = this.myTransactions[idx];
  }

  getWfStatusDescription(wfstatus){

    if (wfstatus == 2){
      return "Korrekturlesen eines Briefes nach der Texterkennung.";
    }else if(wfstatus == 4){
      return "Entitäten benennen als Vorbereitung für das Modelltraining.";
    }else if(wfstatus == 5){
      return "Der Gesamttext wird in zusammenhängende Textstücke eingeteilt.";
    }else{
      return "Wfstatus : " + wfstatus
    }
  }

  getDateFromTag(tag){
    let month = tag.substring(tag.indexOf("_")+1,tag.length);
    let year = tag.substring(0,4);

    if (month.length == 1){
      month = "0"+month;
    }

    let today = new Date(year + "-" + month + "-01");

    return today
  }

  sumIncome(monthItem){
    let totalIncome = 0;
    monthItem.wfsteps.forEach(element => {
      totalIncome = totalIncome + parseFloat(element.income);
    });
    return totalIncome;
  }
}
