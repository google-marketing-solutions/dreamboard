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

  constructor(private cdr: ChangeDetectorRef) {
    // Assign the data to the data source for the table to render
    this.dataSource = new MatTableDataSource(this.assets);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.refreshTable(false);
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  clearAllSelections(): void {
    this.selection.clear();
  }

  toggleSingleRow(row: Image): void {
    this.selection.toggle(row);
  }

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

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: Image): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${
      row.id + 1
    }`;
  }

  refreshTable(triggerDetectChanges: boolean): void {
    // Create copy to show always the latest generated images
    const reversed = [...this.assets].reverse();
    this.dataSource.data = reversed;
    if (triggerDetectChanges) {
      this.cdr.detectChanges();
    }
  }

  getSelectedAssets() {
    return this.selection.selected;
  }

  onDeleteAsset(asset: Image | Video): void {
    // Send trigger to parent component to update the img carousel in case
    // a displayed asset has been removed
    this.onAssetDeletedEvent.emit(asset);
    // Refresh table that relies on this.assets array
    this.refreshTable(false);
  }

  getPageSizeOptions(): number[] {
    return [5, 10, 15, 20, 25, 30];
  }
}
