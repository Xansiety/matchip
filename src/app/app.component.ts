import { Component, OnInit } from '@angular/core';
import {
FormBuilder,
FormGroup,
Validators
} from '@angular/forms';
import { User } from './user';

const user = {
  firstName: 'Lindsey',
  lastName: 'Broos',
  fruits: [],
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [],
})
export class AppComponent implements OnInit {
  public userForm!: FormGroup;
  public user!: User;
  public fruits = [
    { id: 1, name: 'lemon' },
    { id: 2, name: 'lime' },
    { id: 3, name: 'orange' },
    { id: 4, name: 'strawberry' },
    { id: 5, name: 'raspberry' },
  ];

  constructor(public fb: FormBuilder) {}
 
  ngOnInit(): void {
    this.user = user;
    this.buildUserForm();
  }

  public hasError = (controlName: string, errorName: string) => {
    return this.userForm.controls[controlName].hasError(errorName);
  };
  

  public submitForm(): void {

    if(this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    } 
    console.log(this.userForm.value);
  }

  private buildUserForm(): void {
    
    this.userForm = this.fb.group({
      firstName: [this.user.firstName, Validators.required],
      lastName: [this.user.lastName, Validators.required],
      states: [this.user.fruits],
    });
  } 
}
