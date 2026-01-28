/***************************************************************************
 *
 *  Copyright 2025 Google Inc.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *  Note that these code samples being shared are not official Google
 *  products and are not formally supported.
 *
 ***************************************************************************/

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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SelectionModel } from '@angular/cdk/collections';
import { Image } from '../../models/image-gen-models';
import { Video } from '../../models/video-gen-models';

@Component({
  selector: 'app-assets-selection-table',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './assets-selection-table.component.html',
  styleUrl: './assets-selection-table.component.css',
})
export class AssetsSelectionTableComponent implements AfterViewInit, OnChanges {
  @Input() assets: Image[] | Video[] = [];
  @Input() assetType: string = '';
  @Input() maxAllowedSelectedAssets: number = 1;
  @Input() isSelectionMode = true;
  @Output() onAssetDeletedEvent = new EventEmitter<Image | Video>();
  displayedColumns: string[] = ['assetPreview', 'actions'];
  dataSource: MatTableDataSource<Image | Video>;
  selection = new SelectionModel<Image | Video>(true, []);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  /**
   * Initializes the component.
   * @param cdr - ChangeDetectorRef for manually triggering change detection.
   */
  constructor(private cdr: ChangeDetectorRef) {
    // Assign the data to the data source for the table to render
    this.dataSource = new MatTableDataSource(this.assets);
  }

  /**
   * Lifecycle hook that is called after Angular has fully initialized a component's view.
   * Sets the paginator for the data source.
   */
  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  /**
   * Lifecycle hook that is called when any data-bound property of a directive changes.
   * Refreshes the table data when inputs change.
   * @param changes - The changed properties.
   */
  ngOnChanges(changes: SimpleChanges): void {
    this.refreshTable(false);
  }

  /**
   * Filters the table data based on the input value.
   * @param event - The input event containing the filter value.
   */
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /**
   * Checks whether the number of selected elements matches the total number of rows.
   * @returns `true` if all rows are selected, otherwise `false`.
   */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /**
   * Clears all selected assets.
   */
  clearAllSelections(): void {
    this.selection.clear();
  }

  /**
   * Toggles the selection of a single row.
   * @param row - The asset row to toggle.
   */
  toggleSingleRow(row: Image): void {
    this.selection.toggle(row);
  }

  /**
   * Determines if the checkbox for a row should be disabled.
   * @param row - The asset row to check.
   * @returns `true` if the max allowed assets are selected and the current row is not selected; otherwise `false`.
   */
  disableCheckBox(row: Image): boolean {
    const isSelected = this.selection.isSelected(row);
    if (
      this.selection.selected.length === this.maxAllowedSelectedAssets &&
      !isSelected
    ) {
      return true;
    }

    return false;
  }

  /**
   * Returns the label for the checkbox on the passed row.
   * @param row - The asset row.
   * @returns The label string for the checkbox.
   */
  checkboxLabel(row?: Image): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${
      row.id + 1
    }`;
  }

  /**
   * Refreshes the table data source with the current assets.
   * @param triggerDetectChanges - Whether to manually trigger change detection.
   */
  refreshTable(triggerDetectChanges: boolean): void {
    // Create copy to show always the latest generated images
    const reversed = [...this.assets].reverse();
    this.dataSource.data = reversed;
    if (triggerDetectChanges) {
      this.cdr.detectChanges();
    }
  }

  /**
   * Retrieves the currently selected assets.
   * @returns An array of selected `Image` or `Video` objects.
   */
  getSelectedAssets(): Image[] | Video[] {
    return this.selection.selected;
  }

  /**
   * Handles the deletion of an asset.
   * Emits an event to the parent component and refreshes the table.
   * @param asset - The asset to be deleted.
   */
  onDeleteAsset(asset: Image | Video): void {
    // Send trigger to parent component to update the img carousel in case
    // a displayed asset has been removed
    this.onAssetDeletedEvent.emit(asset);
    // Refresh table that relies on this.assets array
    this.refreshTable(false);
  }

  /**
   * Returns the available page size options for the paginator.
   * @returns An array of numbers representing page sizes.
   */
  getPageSizeOptions(): number[] {
    return [5, 10, 15, 20, 25, 30];
  }
}
