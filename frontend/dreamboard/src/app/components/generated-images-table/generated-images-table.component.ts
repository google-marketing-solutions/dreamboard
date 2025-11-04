import {
  AfterViewInit,
  Component,
  ViewChild,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule, MatSelectChange } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SelectionModel } from '@angular/cdk/collections';
import { Image } from '../../models/image-gen-models';
import { getImageSelectionTypeOptions } from '../../image-utils';
import { SelectItem } from '../../models/settings-models';

@Component({
  selector: 'app-generated-images-table',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './generated-images-table.component.html',
  styleUrl: './generated-images-table.component.css',
})
export class GeneratedImagesTableComponent implements AfterViewInit, OnChanges {
  @Input() generatedImages!: Image[];
  @Input() isImageGenerationSettings: boolean = true;
  @Output() generatedImageDeletedEvent = new EventEmitter<Image>();
  displayedColumns: string[] = ['id', 'name', 'imagePreview', 'actions'];
  dataSource: MatTableDataSource<Image>;
  selection = new SelectionModel<Image>(true, []);
  MAX_ALLOWED_SELECTED_IMAGES: number = 3;
  imageSelectionTypeOptions: SelectItem[] = getImageSelectionTypeOptions();
  imageSelectionType: string = 'Reference Image';
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private cdr: ChangeDetectorRef) {
    // Assign the data to the data source for the table to render
    this.dataSource = new MatTableDataSource(this.generatedImages);
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  ngOnChanges(changes: SimpleChanges) {
    this.refreshTable(false);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  clearAll() {
    this.selection.clear();
  }

  toggleSingleRow(row: Image) {
    this.selection.toggle(row);
  }

  disableCheckBox(row: Image) {
    const isSelected = this.selection.isSelected(row);

    if (
      this.selection.selected.length === this.MAX_ALLOWED_SELECTED_IMAGES &&
      !isSelected
    ) {
      return true;
    }

    return false;
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: Image): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${
      row.id + 1
    }`;
  }

  onImageSelectionTypeChanged(event: MatSelectChange) {
    // Clear selection every time type is changed
    this.selection.clear();
    if (event.value === 'reference-image') {
      this.imageSelectionType = 'Reference Image';
      this.MAX_ALLOWED_SELECTED_IMAGES = 3;
    } else if (event.value === 'first-last-frame') {
      this.imageSelectionType = 'First/Last Frame';
      this.MAX_ALLOWED_SELECTED_IMAGES = 2;
    }
  }

  refreshTable(triggerDetectChanges: boolean) {
    // Create copy to show always the latest generated images
    const reversed = [...this.generatedImages].reverse();
    this.dataSource.data = reversed;
    if (triggerDetectChanges) {
      this.cdr.detectChanges();
    }
  }

  onDeleteGeneratedImage(image: Image) {
    // Send trigger to parent component to update the img carousel in case
    // a displayed image has been removed
    this.generatedImageDeletedEvent.emit(image);
    // Refresh table that relies on this.generatedImages array
    this.refreshTable(false);
  }
}
