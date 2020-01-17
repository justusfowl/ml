import { Component, OnInit, ViewEncapsulation, EventEmitter, Output, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ApiService } from '../api.service';
import { Router } from "@angular/router";

import { PDFJS, PDFJSStatic } from 'pdfjs-dist'; 
import { NgxFileDropEntry, FileSystemFileEntry, FileSystemDirectoryEntry } from 'ngx-file-drop';
import { MatSnackBar } from '@angular/material';
import { ProgressService } from '../services/progress.service';

import { ToastrService } from 'ngx-toastr';
import { timeout } from 'q';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'], 
  encapsulation: ViewEncapsulation.None
})
export class HomeComponent implements OnInit, AfterViewInit {

  @Output() uploadChange = new EventEmitter();

  textInput : string = ""; 

  pdfSrc: string; 

  fileUploaded : boolean = false; 
  fileName : string = ""; 

  public files: NgxFileDropEntry[] = [];

  uploadForm: FormGroup;
  uploadFile : any; 

  currentObjId : string = ""; 

  constructor(
    public api: ApiService, 
    private router: Router, 
    public snackBar: MatSnackBar,
    private formBuilder: FormBuilder, 
    public progressService : ProgressService, 
    private toastr: ToastrService
  ) { }

  ngOnInit() {

    this.uploadForm = this.formBuilder.group({
      file: ['']
    });

    this.progressService.getProgressLog().subscribe((message: string) => {

      let itm = {
        "_id" : this.currentObjId,
        "message": message
      };

      this.progressService.logs.push(itm);

      this.toastr.info(this.currentObjId, message, {timeOut: 6000});
    });
  
  }

  ngAfterViewInit(){

    this.uploadChange.subscribe((data) => {
      this.goToNlp()
    })

  }


  public dropped(files: NgxFileDropEntry[]) {

    // first file only: 

    this.api.fileName = files[0].relativePath;
    
    this.api.fileUploaded = true;

    this.files = files;
    const self = this; 

    for (const droppedFile of files) {
 
      // Is it a file?
      if (droppedFile.fileEntry.isFile) {
        const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;

        fileEntry.file((file: File) => {
 
          // Here you can access the real file
          console.log(droppedFile.relativePath, file);

          self.uploadFile = file;           
      
          if (typeof FileReader !== 'undefined') {
            const reader = new FileReader();
      
            reader.onload = (e: any) => {
      
              var baseString = e.target.result;
      
              var docType = baseString.substring(baseString.indexOf(":")+1,baseString.indexOf(";")); 
              
              if (!self.checkDocType(docType)){
                //@TODO: abort furter do
              }
      
              self.pdfSrc = baseString;
      
              var array = self.convertDataURIToBinary(baseString)
      
              self.api.setDocument(array, docType);
              
            };
      
            reader.readAsDataURL(file);
          }

 
        });
      } else {
        // It was a directory (empty directories are added, otherwise only files)
        const fileEntry = droppedFile.fileEntry as FileSystemDirectoryEntry;
        console.log(droppedFile.relativePath, fileEntry);
      }
    }
  }
 
  public fileOver(event){
    console.log(event);
  }
 
  public fileLeave(event){
    console.log(event);
  }


  analyzeItem(){
    this.api.isLoading = true;
    const self = this; 
    console.log("Analzing input text...")

    self.api.docType = "text"; 
    self.tagInputText()
    
  }

  sendDocumentForWF(){
    this.api.isLoading = true;

    this.inputDocToWF().then((res : any) => {

      this.api.isLoading = false;

      this.snackBar.open('Dokument bestätigt.', null, {
        duration: 1500,
      });

      if (typeof(res.data.dict._id) != "undefined"){

        let objId = res.data.dict._id;

        this.currentObjId = objId;

        this.progressService.subscribeLogs(objId);

      }

      
    }).catch(err => {

    })
  }
  
  
  inputDocToWF(){

    const self = this; 

    return new Promise(function(resolve, reject) {

      console.log("Uploading...")

      self.uploadForm.get('file').setValue(self.uploadFile);

      const formData = new FormData();
      formData.append('file', self.uploadForm.get('file').value);

      self.api.processFileIntoWorkflow(formData).then((res : any) => {
        
        resolve(res);
      }).catch(err => {
        self.api.handleAPIError(err);
        reject(err)
      })

    });

  }

  sendDocumentForProcessing(){
    this.api.isLoading = true;
    this.analyzeTBody().then((result : any) => {
      this.api.isLoading = false;

      if (typeof(result.data.pages) == "undefined"){
        result.data.pages = []
      }

      result.data.pages.forEach(element => {
        if (typeof(element.entities) == "undefined"){
          element.entities = []
        }
        if (typeof(element.detections) == "undefined"){
          element.detections = []
        }
      });

      this.api.fileResData = result.data;

      this.goToNlp()
    })
  }

  analyzeTBody(){
    const self = this; 

    return new Promise(function(resolve, reject) {

      console.log("Uploading...")

      self.uploadForm.get('file').setValue(self.uploadFile);

      const formData = new FormData();
      formData.append('file', self.uploadForm.get('file').value);

      self.api.evaluateFileForBbox(formData).then((res : any) => {
        resolve(res);
      }).catch(err => {
        self.api.handleAPIError(err);
        reject(err)
      })

    });
 
  }

  checkDocType(mime){
    //@TODO: check mimetypes here
    return true
  }

  onFileSelected(){

  }

  convertDataURIToBinary(dataURI) {
    var BASE64_MARKER = ';base64,',
      base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length,
      base64 = dataURI.substring(base64Index),
      raw = window.atob(base64),
      rawLength = raw.length,
      array = new Uint8Array(new ArrayBuffer(rawLength));

    for (var i = 0; i < rawLength; i++) {
      array[i] = raw.charCodeAt(i);
    }
    return array;
  }



  tagInputText(){

    const self = this;
    self.api.isLoading = true; 

    self.api.tagText(this.api.inputText).then( (data : any) => {

      console.log(data)
      if (typeof(data.data) != "undefined"){
        self.api.nerDemoResponse = data;
        this.toNERLabel();
      }else{
        console.error("No attribute data found in response")
      }
      
      self.api.isLoading = false; 
    })
    
  }


  // display result of inputtext tagging
  toNERLabel(){
    const self = this;
   
     self.router.navigate(["/admin/nerlabel"], { queryParams: { demo: 'true'} }).then( (e) => {

      self.api.isLoading = false; 
    });

  }

  // display result of tbody analysis
  goToNlp(){

    const self = this; 

    self.api.isLoading = true; 

    self.router.navigate(["/nlp"]).then( (e) => {
      self.api.isLoading = false; 
    });

  }

}
