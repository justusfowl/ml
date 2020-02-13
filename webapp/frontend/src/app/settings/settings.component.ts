import { Component, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../api.service';
import { ProgressService } from '../services/progress.service';
import { MatTableDataSource, MatSort, MatSnackBar, MatChipInputEvent } from '@angular/material';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {Subject} from "rxjs";
import {debounceTime, distinctUntilChanged} from "rxjs/internal/operators";
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '../services/auth.service';
import { first } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';


@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  users: any = [];
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  visible = true;
  selectable = true;
  removable = true;
  addOnBlur = true;
  
  // register
  loginForm: FormGroup;
  loading = false;
  submitted = false;


  tags : any = [];
  rowChanged = new Subject<any>();
  valChanged = new Subject<any>();
  displayedColumnsTags: string[] = ['_id', 'value', 'shortcut', 'prod'];

  @ViewChild('sortTags', {static: false}) sortTags: MatSort;

  constructor(
    public api : ApiService, 
    public progressService : ProgressService, 
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder, 
    private auth: AuthenticationService, 
    private toastr: ToastrService
  ) { }

  ngOnInit() {
    this.getNerLabelTag();
    this.getUsers();

    this.loginForm = this.formBuilder.group({
        username: ['', Validators.required],
        password: ['', Validators.required]
    });

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

  getUsers(){
    this.api.getUsers().then((users : any) => {
      this.users = users.data;
    }).catch(err => {
      console.error(err);
    })
  }

  updateUser(user){
    this.api.updateUser(user).then(res => {
      this.snackBar.open('User aktualisiert.', null, {
        duration: 1500,
      });
    }).catch(err => {
      this.snackBar.open('FEHLER | bitte Konsole prüfen.', null, {
        duration: 1500,
      });
      console.error(err);
    })
  }

  addRole(userIdx, event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    let user = this.users[userIdx]; 

    if ((value || '').trim()) {
      user.roles.push(value.trim());
      this.updateUser(user);
    }
    
    // Reset the input value
    if (input) {
      input.value = '';
    }

    
  }

  removeRole(userIdx, role): void {
    let user = this.users[userIdx]; 
    const index = user.roles.indexOf(role);

    if (index >= 0) {
      this.users[userIdx].roles.splice(index, 1);
      this.updateUser(user);
    }
  }

  get f() { return this.loginForm.controls; }

  registerUser() {
    this.submitted = true;

    // reset alerts on submit
    // this.alertService.clear();

    // stop here if form is invalid
    if (this.loginForm.invalid) {
        return;
    }

    this.loading = true;
    this.progressService.loaderIsLoading();

    this.auth.register(this.f.username.value, this.f.password.value)
        .pipe(first())
        .subscribe(
            userData => {
              this.getUsers();
              this.loginForm.reset();
            
              this.snackBar.open(`Neuer Nutzer zugefügt: ${this.f.username.value}, Rollen definieren.`, null, {
                  duration: 1500,
                });

              this.progressService.loaderIsComplete();
            },
            error => {
              // this.alertService.error(error);
              this.loading = false;
              this.progressService.loaderIsComplete();
              this.toastr.error("Register", "Das hat leider nicht geklappt, bitte erneut versuchen.")
            });
}

}
