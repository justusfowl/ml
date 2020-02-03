import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from './../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { ProgressService } from './services/progress.service';


@Injectable({
  providedIn: 'root'
})
export class ApiService {

  ENV : string = ""; 

  apiURL: string = "http://localhost:8000/api/v01"

  isLoading : boolean = false;

  inputText : string = ""; 

  fileUploaded : boolean = false; 
  fileName : string = ""; 

  docArray : any; 
  docType : string;

  fileResData : any = []; 

  navOpen : boolean = false; 

  searchQryString : string = "";
  flagHasSearched : boolean = false; 

  searchResults : any[] = [];
  lastSearchTime : number = 0; 
  lastEmbedTime : number = 0; 

  // ## DEMO ## 

  nerDemoResponse : any; 

  // ## DEMO END ## 

  constructor(
    public http: HttpClient, 
    private toastr: ToastrService, 
    private progressService : ProgressService
  ) {

    this.ENV = environment.env;

    this.apiURL = "http://" + environment.apiBase

    if (environment.apiPort != ""){
      this.apiURL= this.apiURL + ":" + environment.apiPort;
    }else{
      this.apiURL = "";
    }

    this.apiURL= this.apiURL + environment.apiEnd;

    console.log(environment.production);
    
   }

  processText(inText){

    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.get(api.apiURL + '/data').subscribe(
        (data: any) => {    
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }

  searchQueryHandler(inText){

    const api = this;

    const params = new HttpParams()
      .set('q', inText);

    return new Promise(function(resolve, reject) {
      
      api.http.get(api.apiURL + '/medlang/search',{params}).subscribe(
        (data: any) => {    
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }



  handleAPIError(error){

    this.toastr.error("Netzwerk", "Etwas ist schief gelaufen. Bitte Console prüfen.", {timeOut: 6000});

    console.error(error);
    this.progressService.loaderIsComplete();
  }

  setDocument(array, type){
    this.docArray = array; 
    this.docType = type; 
    this.fileUploaded = true; 
  }

  isDocText(){
    if (this.docType == 'text'){
      return true; 
    }else{
      return false; 
    }
  }

  getDocument(array){
    return this.docArray; 
  }

  toggleNavOpen(){
    this.navOpen = true; 
  }

  toggleNavClose(){
    this.navOpen = false; 
  }
  
  // ### admin area : SPELLER ### 

  getSpellerObject(objectId?, flagUpdateWFStatus=false){

    let objId = ""; 

    if (objectId){
      objId = "/" + objectId
    }

    const api = this;

    const params = new HttpParams()
    .set('flagUpdateWFStatus', flagUpdateWFStatus.toString());

    return new Promise(function(resolve, reject) {
      
      api.http.get(api.apiURL + '/admin/speller' + objId, {params}).subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }  

  approveSpellerObject(txtLabelObject){

    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.put(api.apiURL + '/admin/speller', txtLabelObject).subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }

  disregardSpellerObject(txtLabelObject){
    
      const api = this;

      return new Promise(function(resolve, reject) {
        
        api.http.put(api.apiURL + '/admin/speller/disregard', txtLabelObject).subscribe(
          (data: any) => {
            resolve(data)
          },
          error => {
            api.handleAPIError(error);
            reject(error)
          }
        )
      });
    }

  // ### admin area: SENTENCES ###

  getSentenceObj(objectId?, flagUpdateWFStatus=false){

    let objId = ""; 

    if (objectId){
      objId = "/" + objectId
    }

    const api = this;

    const params = new HttpParams()
    .set('flagUpdateWFStatus', flagUpdateWFStatus.toString());

    return new Promise(function(resolve, reject) {
      
      api.http.get(api.apiURL + '/admin/sentence' + objId, {params}).subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }  

  approveSentences(txtLabelObject){

    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.put(api.apiURL + '/admin/sentence', txtLabelObject).subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  } 

  // ### admin area : NER LABEL ### 

  getNerLabelObject(objectId?, flagUpdateWFStatus=false){

    let objId = ""; 

    if (objectId){
      objId = "/" + objectId
    }

    const api = this;

    const params = new HttpParams()
    .set('flagUpdateWFStatus', flagUpdateWFStatus.toString());

    return new Promise(function(resolve, reject) {
      
      api.http.get(api.apiURL + '/admin/nerlabel' + objId, {params}).subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }  

  approveNerLabelObject(txtLabelObject){

    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.put(api.apiURL + '/admin/nerlabel', txtLabelObject).subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }

  disregardNerObject(txtLabelObject){
    
      const api = this;

      return new Promise(function(resolve, reject) {
        
        api.http.put(api.apiURL + '/admin/nerlabel/disregard', txtLabelObject).subscribe(
          (data: any) => {
            resolve(data)
          },
          error => {
            api.handleAPIError(error);
            reject(error)
          }
        )
      });
    }

  addNerLabelTag(tag){

    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.post(api.apiURL + '/admin/meta/nerlabel', tag).subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }

  updateNerLabelTag(tag){

    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.put(api.apiURL + '/admin/meta/nerlabel', tag).subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }

  getNerLabelTag(){

    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.get(api.apiURL + '/admin/meta/nerlabel').subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }

  // ### admin area : LABEL ### 


  getLabelObject(objectId?, flagUpdateWFStatus=false){

    let objId = ""; 

    if (objectId){
      objId = "/" + objectId
    }

    const api = this;

    const params = new HttpParams()
    .set('flagUpdateWFStatus', flagUpdateWFStatus.toString());

    return new Promise(function(resolve, reject) {
      
      api.http.get(api.apiURL + '/admin/label' + objId, {params}).subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }

  approveLabelObject(labelObject){

    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.put(api.apiURL + '/admin/label', labelObject).subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }

  disregardObject(labelObject){
    
    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.put(api.apiURL + '/admin/label/disregard', labelObject).subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }


  // ### admin area : STATS ### 


  getNERStats(){
    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.get(api.apiURL + '/admin/stats/nertags').subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }


  getStatsWorkflow(){
    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.get(api.apiURL + '/admin/stats/workflow').subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }

  getBboxLabelStats(){
    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.get(api.apiURL + '/admin/stats/bbox').subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }

  // ############ DEMO AREA ###############

  tagText(inputText){

    const api = this;

    let body = {
      "text" : inputText
    }

    return new Promise(function(resolve, reject) {
      
      api.http.post<any>(api.apiURL + '/demo/tner', body).subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });

  }

  evaluateFileForBbox(formData){

    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.post<any>(api.apiURL + '/demo/tbody', formData).subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });

  }

  processFileIntoWorkflow(formData){
    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.post(api.apiURL + '/wf/file', formData).subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }

  issueObjIdsToWf(body){
    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.post(api.apiURL + '/wf/objIds', body).subscribe(
        (data: any) => {
          resolve(data)
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }

}
