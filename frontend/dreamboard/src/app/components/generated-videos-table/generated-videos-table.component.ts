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
import { Video } from '../../models/video-gen-models';

@Component({
  selector: 'app-generated-videos-table',
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
  templateUrl: './generated-videos-table.component.html',
  styleUrl: './generated-videos-table.component.css',
})
export class GeneratedVideosTableComponent implements AfterViewInit, OnChanges {
  @Input() generatedVideos!: Video[];
  @Input() selectedVideosForVideo!: Video[];
  @Input() isSelectionMode!: boolean;
  @Output() generatedVideoDeletedEvent = new EventEmitter<Video>();
  displayedColumns: string[] = ['videoPreview', 'actions'];
  dataSource: MatTableDataSource<Video>;
  selection = new SelectionModel<Video>(true, []);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  maxAllowedSelectedVideos: number = 1;

  constructor(private cdr: ChangeDetectorRef) {
    // Assign the data to the data source for the table to render
    this.dataSource = new MatTableDataSource(this.generatedVideos);
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.setSelection();
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

  toggleSingleRow(row: Video): void {
    this.selection.toggle(row);
  }

  setMaxAllowedSelectedVideos(max: number): void {
    this.maxAllowedSelectedVideos = max;
  }

  disableCheckBox(row: Video): boolean {
    const isSelected = this.selection.isSelected(row);
    if (
      this.selection.selected.length === this.maxAllowedSelectedVideos &&
      !isSelected
    ) {
      return true;
    }

    return false;
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: Video): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${
      row.id + 1
    }`;
  }

  refreshTable(triggerDetectChanges: boolean): void {
    // Create copy to show always the latest generated images
    const reversed = [...this.generatedVideos].reverse();
    this.dataSource.data = reversed;
    if (triggerDetectChanges) {
      this.cdr.detectChanges();
    }
  }

  setSelection(): void {
    this.selection.clear();
    if (this.selectedVideosForVideo) {
      this.selectedVideosForVideo.forEach((selectedVideoForVideo: Video) => {
        // We need to select the videos from object references in the table
        // Otherwise selectedVideosForVideo will have a different reference objs
        // when loaded from DB and it will not be correctly selected.
        const found = this.generatedVideos.find((video: Video) => {
          return video.id === selectedVideoForVideo.id;
        });
        if (found) {
          this.selection.select(found);
        }
      });
    }
  }

  onDeleteGeneratedVideo(video: Video): void {
    // Send trigger to parent component to update the img carousel in case
    // a displayed video has been removed
    this.generatedVideoDeletedEvent.emit(video);
    // Refresh table that relies on this.generatedVideos array
    this.refreshTable(false);
  }

  getPageSizeOptions(): number[] {
    return [3, 5, 10, 15];
  }
}
