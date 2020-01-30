import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { AuthenticationService } from '../services/auth.service';
import { ProgressService } from '../services/progress.service';
import { MatSnackBar } from '@angular/material';
import { ToastrService } from 'ngx-toastr';

@Component(
    { templateUrl: 'login.component.html',
    styleUrls: ['./login.component.scss'] }
    )
export class LoginComponent implements OnInit {
    loginForm: FormGroup;
    loading = false;
    submitted = false;
    returnUrl: string;

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private authenticationService: AuthenticationService, 
        private progressService : ProgressService, 
        private snackBar : MatSnackBar, 
        private toastr: ToastrService
    ) {
        // redirect to home if already logged in
        if (this.authenticationService.currentUserValue) {
            this.router.navigate(['/']);
        }
    }

    ngOnInit() {
        this.loginForm = this.formBuilder.group({
            username: ['', Validators.required],
            password: ['', Validators.required]
        });

        // get return url from route parameters or default to '/'
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    }

    // convenience getter for easy access to form fields
    get f() { return this.loginForm.controls; }

    onSubmit() {
        this.submitted = true;

        // reset alerts on submit
        // this.alertService.clear();

        // stop here if form is invalid
        if (this.loginForm.invalid) {
            return;
        }

        this.loading = true;
        this.progressService.loaderIsLoading();

        this.authenticationService.login(this.f.username.value, this.f.password.value)
            .pipe(first())
            .subscribe(
                userData => {
                    this.snackBar.open(`Willkommen ${userData.userName}`, null, {
                        duration: 1500,
                      });

                    this.router.navigate([this.returnUrl]);
                    this.progressService.loaderIsComplete();
                },
                error => {
                    // this.alertService.error(error);
                    this.loading = false;
                    this.progressService.loaderIsComplete();
                    this.toastr.error("Login", "Das hat leider nicht geklappt, bitte erneut versuchen.")
                });
    }
}