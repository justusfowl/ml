import { Component, OnInit, OnDestroy, ViewEncapsulation, EventEmitter, Output, AfterViewInit } from '@angular/core';
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
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {

  @Output() uploadChange = new EventEmitter();

  textInput : string = ""; 

  pdfSrc: string; 

  fileUploaded : boolean = false; 
  fileName : string = ""; 

  public files: NgxFileDropEntry[] = [];

  uploadForm: FormGroup;
  uploadFile : any; 

  currentObjId : string = ""; 

  selectedChoice : any;

  choicesWFSteps = [
    {
      display: "store", 
      choices : []
    },
    {
      display: "ocr/bbox", 
      choices : ["ocr"]
    }, 
    {
      display: "pretag", 
      choices : ["ocr", "pretag"]
    }
  ]

  wfResultingLinks = []

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

  }

  ngAfterViewInit(){

    // set default choice for WF injection
    this.selectedChoice = this.choicesWFSteps[0]

    this.uploadChange.subscribe((data) => {
      this.goToNlp()
    });


    this.progressService.getObjectProgressLog().subscribe((message: any) => {
      if (typeof(message.message) != "undefined"){
        this.toastr.info(message.category, message.message, {timeOut: 6000});
        this.resetWFResultingLinks(); 
        
        if (typeof(message.details) != "undefined"){
          if (typeof(message.details.complete) != "undefined"){

            this.progressService.loaderIsComplete()
            console.log("completed..."); 
            this.handleWfInjectComplete(); 
          }

          if (typeof(message.details.start) != "undefined" || typeof(message.details.progress) != "undefined"){
            this.progressService.loaderIsLoading()
            console.log("started..."); 
            
          }
        }
      }
    });

  }

  resetWFResultingLinks(){
    this.wfResultingLinks = [];
  }

  handleWfInjectComplete(){

    this.resetWFResultingLinks(); 

    this.selectedChoice.choices.forEach(element => {

      let routerLink, queryParams, display; 

      queryParams = {objId :  this.currentObjId}

      if (element == "ocr"){
        routerLink = "/admin/label"
        display = "OCR Ergebnis"
      }else if (element == 'pretag'){
        routerLink = "/admin/nerlabel"
        display = "NER Ergebnis"
      }
      
      if (routerLink){
        this.wfResultingLinks.push({
          "routerLink" : routerLink,
          "queryParams" : queryParams,
          "display" : display
        })
      }

    });

  }

  ngOnDestroy(){
    this.progressService.leaveObjLogRoom(this.currentObjId);
    this.resetFileDropped();
  }

  resetFileDropped(){
    this.files = null; 
    this.api.fileName = null; 
    this.api.fileUploaded = false;
    this.uploadFile = null;
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
    this.progressService.loaderIsLoading();
    const self = this; 
    console.log("Analzing input text...")

    self.api.docType = "text"; 
    self.tagInputText()
    
  }

  sendDocumentForWF(){
    this.progressService.loaderIsLoading();



    this.inputDocToWF().then((res : any) => {

      this.progressService.loaderIsComplete()

      this.snackBar.open('Dokument bestätigt.', null, {
        duration: 1500,
      });

      if (typeof(res.data.dict._id) != "undefined"){

        let objId = res.data.dict._id;

        this.currentObjId = objId;

        this.progressService.joinObjLogRoom(objId);

      }
      
    }).catch(err => {
      console.error(err);
      this.progressService.loaderIsComplete()
    })
  }
  
  
  inputDocToWF(){

    let wfsteps = this.selectedChoice.choices;

    const self = this; 

    return new Promise(function(resolve, reject) {

      console.log("Uploading...")

      self.uploadForm.get('file').setValue(self.uploadFile);

      const formData = new FormData();
      formData.append('file', self.uploadForm.get('file').value);
      formData.append('wfsteps', wfsteps);

      self.api.processFileIntoWorkflow(formData).then((res : any) => {
        resolve(res);
      }).catch(err => {
        self.api.handleAPIError(err);
        reject(err)
      })

    });

  }

  sendDocumentForProcessing(){
    this.progressService.loaderIsLoading();
    this.analyzeTBody().then((result : any) => {
      this.progressService.loaderIsComplete();

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
    self.progressService.loaderIsLoading();
    
    let flagOnlyNLP = true;

    if (confirm("Erweiterte Analyse?")){
      flagOnlyNLP = false;
    }


    self.api.tagText(this.api.inputText, flagOnlyNLP).then( (data : any) => {

      console.log(data)
      if (typeof(data.data) != "undefined"){
        self.api.nerDemoResponse = data;
        this.toNERLabel();
      }else{
        console.error("No attribute data found in response")
      }
      
      self.progressService.loaderIsComplete();
      
    })
    
  }


  // display result of inputtext tagging
  toNERLabel(){
    const self = this;
   
     self.router.navigate(["/admin/nerlabel"], { queryParams: { demo: 'true'} }).then( (e) => {

      self.progressService.loaderIsComplete(); 
    });

  }

  // display result of tbody analysis
  goToNlp(){

    const self = this; 

    self.progressService.loaderIsLoading(); 

    self.router.navigate(["/nlp"]).then( (e) => {
      self.progressService.loaderIsComplete(); 
    });

  }

}
