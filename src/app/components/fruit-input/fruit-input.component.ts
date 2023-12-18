import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
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
import { Observable, Subject, debounceTime, distinctUntilChanged, filter, map, startWith, takeUntil, tap } from 'rxjs';

export type appearance = 'outline' | 'standard' | 'fill' | 'legacy';
interface ItemList {
  value: number;
  description: string;
}

@Component({
  selector: 'app-fruit-input',
  template: `
    <ng-container *ngIf="parentForm">
      <div [formGroup]="parentForm">
        <mat-label *ngIf="label">{{ label }}</mat-label>
        <mat-form-field [appearance]="appearance" [style.width.%]="inputWidth">
          <mat-chip-list #itemChipList [formControlName]="formInputControlName!">
            <mat-chip
              *ngFor="let itemSelected of selectedOptions"
              [removable]="removable"
              [selectable]="selectable"
              (removed)="onRemoveItem(itemSelected)"
              class="mat-chip-list-custom"> 
                {{ itemSelected.description }}
              <mat-icon matChipRemove *ngIf="removable">cancel</mat-icon>
            </mat-chip>
            <input
              #searchInput
              [placeholder]="placeholder"
              [matChipInputFor]="itemChipList"
              [matChipInputSeparatorKeyCodes]="separatorKeysCodes"
              [matChipInputAddOnBlur]="addOnBlur"
              (matChipInputTokenEnd)="onAddItem($event)"
              [matAutocomplete]="itemsListAutocomplete"
              [formControlName]="formInputSearchControlName"
            />
          </mat-chip-list>
          <mat-autocomplete #itemsListAutocomplete="matAutocomplete" (optionSelected)="onSelectItem($event)">
            <mat-option [disabled]="allItemsAreSelected">
              <mat-checkbox [checked]="allItemsAreSelected" [disabled]="allItemsAreSelected">
                {{ selectAllPlaceholder }}
              </mat-checkbox>
            </mat-option>
            <mat-option *ngFor="let item of filteredItems$ | async" [value]="item">
              <mat-checkbox [checked]="selectedOptions.includes(item)">
                {{ item.description }}
              </mat-checkbox>
            </mat-option>
            <div class="mat-autocomplete-footer-custom">
              <button mat-flat-button color="default" (click)="clearAllSelection()"> Limpiar </button>
              <button mat-raised-button color="primary" (click)="acceptSelections()"> Aceptar </button>
            </div>
          </mat-autocomplete>
          <mat-error *ngIf="hasError(formInputControlName!, 'noDataSelected')">
            {{ errorMessage }}
          </mat-error>
        </mat-form-field>
      </div>
    </ng-container>
  `,
  styleUrls: ['./fruit-input.component.css'],
})
export class FruitInputComponent implements OnInit, AfterViewInit, OnDestroy {
  /* ViewChild for manage the component */
  @ViewChild(MatAutocompleteTrigger) matAutoComplete!: MatAutocompleteTrigger;
  @ViewChildren('itemList') itemList!: MatChipList;

  private destroy$: Subject<void> = new Subject<void>();
  protected readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  /* Inputs for manage the component */
  @Input() public parentForm?: FormGroup;
  @Input() public formInputControlName?: string;
  @Input() public formInputSearchControlName: string = 'searchAutoCompleteInput';
  @Input() public items: ItemList[] = [];
  @Input() public required = false;

  /* Inputs for personalize the component */
  @Input() public label: string = '';
  @Input() public placeholder: string = 'Seleccionar una opción';
  @Input() public selectAllPlaceholder: string = 'Seleccionar todos';
  @Input() public errorMessage: string = 'Debe seleccionar al menos un elemento';
  @Input() public selectable = true;
  @Input() public removable = true;
  @Input() public addOnBlur = true;

  /* Inputs for style the component */
  @Input() public inputWidth: number = 100;
  @Input() public appearance: appearance = 'outline';

  /* Local Variables for manage the component */
  protected selectedOptions: ItemList[] = [];
  protected filteredItems$?: Observable<ItemList[]>;

  protected hasError = (controlName: string, errorName: string) => {
    return this.parentForm?.controls[controlName].hasError(errorName);
  };

  ngOnInit(): void {
    /* Add a new formControl for manage the search items in the autocomplete*/
    this.parentForm?.addControl(this.formInputSearchControlName, new FormControl(null));

    /* Add mapped values to the selectedOptions, based on the items array selected included in the parentForm */
    this.selectedOptions = this.parentForm?.get(this.formInputControlName!)?.value.map((id: number) => this.items.find((element) => element.value === id)) ?? [];

    /* Add a new validator to the formControl for manage the selected items, if the required input is true */
    if (this.required) {
      const formInputControl = this.parentForm?.get(this.formInputControlName!);
      if (formInputControl) {
        formInputControl.setValidators(this.validateItemsSelected);
        formInputControl.updateValueAndValidity();
      }
    }

    /* Add a new observable for manage the filtered items in the autocomplete */
    this.filteredItems$ = this.parentForm
      ?.get(this.formInputSearchControlName)
      ?.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        takeUntil(this.destroy$),
        filter((value) => value !== null && value !== undefined),
        map((value) => this.filterItemsList(value))
      );
  }

  ngAfterViewInit(): void {
    this.parentForm?.get(this.formInputControlName!)?.statusChanges.subscribe((status) => (this.itemList.errorState = status === 'INVALID'));
  }

  public onSelectItem(event: MatAutocompleteSelectedEvent): void {
    if (!event.option) return;

    const value = event.option.value;

    if (value == undefined) {
      this.selectAllOptions();
    } else if ( value && value instanceof Object && !this.selectedOptions.includes(value)) {
      this.selectedOptions.push(value);
      this.updateFormValue();
    }
  }

  private filterItemsList(value: string | object): ItemList[] {
    const filterValue = value === null || value instanceof Object ? '' : value.toLowerCase();

    const optionMatches = this.items.filter((element) => element.description.toLowerCase().includes(filterValue));
    const formValue = this.parentForm?.get(this.formInputControlName!)?.value;

    return formValue === null
      ? optionMatches
      : optionMatches.filter((item) => !formValue.find((y: ItemList) => y.value === item.value));
  }

  public onAddItem(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value.trim().replace(/ /g, '').toLowerCase();

    const normalizeValue = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const matches = this.items.filter((element) => element.description.toLowerCase().includes(normalizeValue(value)));

    if (value && matches) {
      const formValue = this.parentForm?.get(this.formInputControlName!)?.value;
      const matchesNotYetSelected = formValue === null
                                    ? matches
                                    : matches.filter((x) => !formValue.find((y: ItemList) => y.value === x.value));

      if (matchesNotYetSelected.length === 1) {
        this.selectedOptions.push(matchesNotYetSelected[0]);
        this.updateFormValue();
      }
    }

    if (input) {
      input.value = '';
    }
  }

  public onRemoveItem(item: ItemList) {
    const index = this.selectedOptions.indexOf(item);
    if (index >= 0) {
      this.selectedOptions.splice(index, 1);
      this.updateFormValue();
    }
  }

  private validateItemsSelected( control: AbstractControl ): ValidationErrors | null {
    const items = control.value;
    if (!items || items.length === 0) {
      return { noDataSelected: { valid: false } };
    }
    return null;
  }

  private updateFormValue(): void {
    this.parentForm?.get(this.formInputControlName!)?.setValue(this.selectedOptions);
    this.parentForm?.get(this.formInputSearchControlName)?.setValue('');
  }

  /* Manage Massive select Options */
  public get allItemsAreSelected(): boolean {
    return this.selectedOptions.length === this.items.length;
  }

  public selectAllOptions(): void {
    if (this.allItemsAreSelected) {
      this.selectedOptions = [];
      this.updateFormValue();
    } else {
      this.selectedOptions = [...this.items];
      this.updateFormValue();
    }
  }

  public clearAllSelection(): void {
    this.selectedOptions = [];
    this.updateFormValue();
  }

  public acceptSelections(): void {
    this.parentForm?.get(this.formInputSearchControlName)?.setValue('');
    this.matAutoComplete?.closePanel();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
