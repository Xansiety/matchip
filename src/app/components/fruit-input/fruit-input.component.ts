import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  AfterViewInit,
  Component,
  Input,
  OnInit,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
} from '@angular/forms';
import {
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatChipInputEvent, MatChipList } from '@angular/material/chips';
import { Observable, filter, map, startWith } from 'rxjs';
import { Fruit } from '../../fruit';

@Component({
  selector: 'app-fruit-input',
  template: `
    <ng-container *ngIf="parentForm">
      <div [formGroup]="parentForm">
        <mat-form-field appearance="outline">
          <mat-chip-list #fruitList [formControlName]="formInputControlName!">
            <mat-chip
              *ngFor="let fruit of selectedOptions"
              [removable]="removable"
              selectable
              (removed)="remove(fruit)"
              class="mat-chip-list-custom"
            >
              {{ fruit.name }}
              <mat-icon matChipRemove *ngIf="removable">cancel</mat-icon>
            </mat-chip>
            <input
              #fruitInput
              placeholder="Add your favorite fruits"
              [matChipInputFor]="fruitList"
              [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
              [matChipInputAddOnBlur]="addOnBlur"
              (matChipInputTokenEnd)="addFruit($event)"
              [matAutocomplete]="fruitsAutocomplete"
              [formControlName]="formInputSearchControlName"
            />
          </mat-chip-list>
          <mat-autocomplete
            #fruitsAutocomplete="matAutocomplete"
            (optionSelected)="selectFruit($event)"
          >
            <mat-option [disabled]="allItemsAreSelected">
              <mat-checkbox
                [checked]="allItemsAreSelected"
                [disabled]="allItemsAreSelected"
              >
                Seleccionar Todos
              </mat-checkbox>
            </mat-option>
            <mat-option
              *ngFor="let fruit of filteredFruits$ | async"
              [value]="fruit"
            >
              <mat-checkbox [checked]="selectedOptions.includes(fruit)">
                {{ fruit.name }}
              </mat-checkbox>
            </mat-option>
            <div class="mat-autocomplete-footer-custom">
              <button
                mat-flat-button
                color="default"
                (click)="clearAllSelection()"
              >
                Limpiar
              </button>
              <button
                mat-raised-button
                color="primary"
                (click)="acceptSelections()"
              >
                Aceptar
              </button>
            </div>
          </mat-autocomplete>
          <mat-error *ngIf="hasError(formInputControlName!, 'required')"
            >Required</mat-error
          >
          <mat-error
            *ngIf="hasError(formInputControlName!, 'validateFruitsArray')"
          >
            At least one fruit is required
          </mat-error>
        </mat-form-field>
      </div>
    </ng-container>
  `,
  styleUrls: ['./fruit-input.component.css'],
})
export class FruitInputComponent implements OnInit, AfterViewInit {
  @Input() public selectable = true;
  @Input() public removable = true;
  @Input() public addOnBlur = true;
  @Input() public isRequired = false;

  @Input() public formInputControlName?: string;
  @Input() public formInputSearchControlName: string =
    'searchAutoCompleteInput';

  @Input() public parentForm?: FormGroup;
  @Input() public fruits: Fruit[] = [];

  public selectedOptions: Fruit[] = [];

  public filteredFruits$?: Observable<Fruit[]>;

  @ViewChild(MatAutocompleteTrigger) matAutoComplete!: MatAutocompleteTrigger;
  @ViewChildren('fruitList') fruitList!: MatChipList;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  public hasError = (controlName: string, errorName: string) => {
    // console.log(this.parentForm?.controls[controlName].errors);
    return this.parentForm?.controls[controlName].hasError(errorName);
  };

  ngOnInit(): void {
    this.parentForm?.addControl(
      this.formInputSearchControlName,
      new FormControl(null)
    );

    // this.selectedOptions = this.parentForm?.get(this.formInputControlName!)?.value ?? [];

    this.selectedOptions =
      this.parentForm
        ?.get(this.formInputControlName!)
        ?.value.map((id: number) =>
          this.fruits.find((fruit) => fruit.id === id)
        ) ?? [];

    if (this.isRequired) {
      const fruitsControl = this.parentForm?.get(this.formInputControlName!);
      if (fruitsControl) {
        fruitsControl.setValidators(this.validateFruits);
        fruitsControl.updateValueAndValidity();
      }
    }

    this.filteredFruits$ = this.parentForm
      ?.get(this.formInputSearchControlName)
      ?.valueChanges.pipe(
        startWith(''),
        filter((value) => value !== null && value !== undefined),
        map((value) => this.fruitFilter(value))
      );
  }

  ngAfterViewInit(): void {
    this.parentForm
      ?.get(this.formInputControlName!)
      ?.statusChanges.subscribe(
        (status) => (this.fruitList.errorState = status === 'INVALID')
      );
  }

  public selectFruit(event: MatAutocompleteSelectedEvent): void {
    if (!event.option) {
      return;
    }

    const value = event.option.value;

    console.log({ value });

    if (value == undefined) {
      console.log('value is undefined, and needs select all');
      this.selectAllOptions();
    } else if (
      value &&
      value instanceof Object &&
      !this.selectedOptions.includes(value)
    ) {
      this.selectedOptions.push(value);
      console.log({ selectedOptions: this.selectedOptions });
      this.parentForm
        ?.get(this.formInputControlName!)
        ?.setValue(this.selectedOptions);
      this.parentForm?.get(this.formInputSearchControlName)?.setValue('');
    }
  }

  private fruitFilter(value: any): Fruit[] {
    const filterValue =
      value === null || value instanceof Object ? '' : value.toLowerCase();
    const matches = this.fruits.filter((fruit) =>
      fruit.name.toLowerCase().includes(filterValue)
    );
    const formValue = this.parentForm?.get(this.formInputControlName!)?.value;
    return formValue === null
      ? matches
      : matches.filter((x) => !formValue.find((y: any) => y.id === x.id));
  }

  public addFruit(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    if (value.trim()) {
      const matches = this.fruits.filter(
        (fruit) => fruit.name.toLowerCase() === value
      );
      const formValue = this.parentForm?.get(this.formInputControlName!)?.value;
      const matchesNotYetSelected =
        formValue === null
          ? matches
          : matches.filter((x) => !formValue.find((y: any) => y.id === x.id));

      if (matchesNotYetSelected.length === 1) {
        this.selectedOptions.push(matchesNotYetSelected[0]);
        this.parentForm
          ?.get(this.formInputControlName!)
          ?.setValue(this.selectedOptions);
        this.parentForm?.get(this.formInputSearchControlName)?.setValue('');
      }
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  public remove(fruit: Fruit) {
    const index = this.selectedOptions.indexOf(fruit);
    if (index >= 0) {
      this.selectedOptions.splice(index, 1);
      this.parentForm
        ?.get(this.formInputControlName!)
        ?.setValue(this.selectedOptions);
      this.parentForm?.get(this.formInputSearchControlName)?.setValue('');
    }
  }

  private validateFruits(control: AbstractControl): ValidationErrors | null {
    const fruits = control.value;
    if (!fruits || fruits.length === 0) {
      return {
        validateFruitsArray: { valid: false },
      };
    }
    return null;
  }

  /* Manage Massive select Options */
  public get allItemsAreSelected(): boolean {
    return this.selectedOptions.length === this.fruits.length;
  }

  public selectAllOptions(): void {
    if (this.allItemsAreSelected) {
      this.selectedOptions = []; // unselect all
      this.parentForm?.get(this.formInputControlName!)?.setValue([]);
      this.parentForm?.get(this.formInputSearchControlName)?.setValue('');
    } else {
      this.selectedOptions = [...this.fruits]; // select all
      this.parentForm
        ?.get(this.formInputControlName!)
        ?.setValue(this.selectedOptions);
      this.parentForm?.get(this.formInputSearchControlName)?.setValue('');
    }
  }

  public clearAllSelection(): void {
    this.selectedOptions = [];
    this.parentForm?.get(this.formInputControlName!)?.setValue([]);
    this.parentForm?.get(this.formInputSearchControlName)?.setValue('');
  }

  public acceptSelections(): void {
    this.parentForm?.get(this.formInputSearchControlName)?.setValue('');
    this.matAutoComplete?.closePanel();
  }
}
