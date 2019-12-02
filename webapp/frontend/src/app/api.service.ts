import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from './../environments/environment';


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

  navOpen : boolean = true; 

  constructor(
    public http: HttpClient
  ) {

    this.ENV = environment.env;

    this.apiURL = "http://" + environment.apiBase

    if (environment.apiPort != ""){
      this.apiURL= this.apiURL + ":" + environment.apiPort;
    }else{
      this.apiURL = "";
    }

    this.apiURL= this.apiURL + environment.apiEnd;
    

    console.log(environment.production)


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

  processFile(inFile){
    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.get(api.apiURL + '/process/file').subscribe(
        (data: any) => {
          setTimeout(function(){
            resolve(data)
          }, 1500) 
        },
        error => {
          api.handleAPIError(error);
          reject(error)
        }
      )
    });
  }

  handleAPIError(error){
    console.error(error);
    alert(error)
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
  

  // ### admin area : LABEL ### 


  getLabelObject(objectId?){

    let objId = ""; 

    if (objectId){
      objId = "/" + objectId
    }

    const api = this;

    return new Promise(function(resolve, reject) {
      
      api.http.get(api.apiURL + '/admin/label' + objId).subscribe(
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
}
