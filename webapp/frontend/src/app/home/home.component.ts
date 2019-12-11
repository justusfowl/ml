import { Component, OnInit, ViewEncapsulation, EventEmitter, Output, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ApiService } from '../api.service';
import { Router } from "@angular/router";

import { PDFJS, PDFJSStatic } from 'pdfjs-dist'; 
import { NgxFileDropEntry, FileSystemFileEntry, FileSystemDirectoryEntry } from 'ngx-file-drop';


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

  constructor(
    public api: ApiService, 
    private router: Router, 
    private formBuilder: FormBuilder
  ) { }

  ngOnInit() {

    this.uploadForm = this.formBuilder.group({
      file: ['']
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
    this.api.isLoading = true; 
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

              self.analyzeTBody().then((result : any) => {
                self.api.isLoading = false;

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

                self.api.fileResData = result.data;
              })
              /*
      
              self.api.processFile(null).then((data:any) => {
                self.api.isLoading = false;

                if (typeof(data.entities) == "undefined"){
                  data.entities = []
                }

                self.api.fileResData = data;
                // this.uploadChange.emit(true);
              })

              */
              
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
    console.log("Analzing...")

    self.api.docType = "text"; 
    self.goToNlp()
    
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
    /*
    this.api.isLoading = true; 
    const $pdf: any = document.querySelector('#file');
    console.log($pdf)
    const self = this; 

    if (typeof FileReader !== 'undefined') {
      const reader = new FileReader();

      reader.onload = (e: any) => {

        var baseString = e.target.result;

        var docType = baseString.substring(baseString.indexOf(":")+1,baseString.indexOf(";")); 
        
        if (!self.checkDocType(docType)){
          //@TODO: abort furter do
        }

        var pdfjsLib = window['pdfjs-dist/build/pdf'];

        this.pdfSrc = baseString;

        var array = self.convertDataURIToBinary(baseString)

        self.api.setDocument(array, docType);

        self.api.processFile(null).then(data => {
          self.api.isLoading = false;
          self.api.fileResData = data;
          self.goToNlp()
        })
        
      };

      reader.readAsDataURL($pdf.files[0]);
    }
    */
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

  goToNlp(){

    const self = this; 

    self.api.isLoading = true; 

    self.router.navigate(["/nlp"]).then( (e) => {

      self.api.isLoading = false; 

      if (e) {
        console.log("Navigation is successful!");
      } else {
        console.log("Navigation has failed!");
      }
    });

  }

}
