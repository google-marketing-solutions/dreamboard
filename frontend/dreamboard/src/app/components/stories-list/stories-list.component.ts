import { Component, inject, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { VideoStory } from '../../models/story-models';
import { getNewVideoScene } from '../../video-utils';
import { NewStoryDialogComponent } from '../new-story-dialog/new-story-dialog.component';
import { ExportStory } from '../../models/story-models';
import { StoriesStorageService } from '../../services/stories-storage.service';
import { ComponentsCommunicationService } from '../../services/components-communication.service';
import { openSnackBar, confirmAction } from '../../utils';

@Component({
  selector: 'app-stories-list',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './stories-list.component.html',
  styleUrl: './stories-list.component.css',
})
export class StoriesListComponent {
  displayedColumns: string[] = ['id', 'title', 'description', 'actions'];
  stories: VideoStory[] = [];
  dataSource = new MatTableDataSource(this.stories);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  private _snackBar = inject(MatSnackBar);
  newStoryDialog = inject(MatDialog);
  confirmDialog = inject(MatDialog);

  constructor(
    private storiesStorageService: StoriesStorageService,
    private componentsCommunicationService: ComponentsCommunicationService
  ) {}

  ngOnInit(): void {
    this.getStoriesByUserId();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /**
   * Opens a dialog for editing the settings of a specific video scene.
   * This dialog allows users to configure image and video generation parameters for the scene.
   * @param {VideoScene} scene - The video scene object to be edited.
   * @returns {void}
   */
  openNewStoryDialog(storyToEdit: VideoStory | null) {
    const dialogRef = this.newStoryDialog.open(NewStoryDialogComponent, {
      minWidth: '800px',
      data: storyToEdit,
    });

    // Subscribe to the afterClosed() observable to receive data upon closure
    dialogRef.afterClosed().subscribe((story: VideoStory) => {
      // Add only on close from Save event
      if (story && story.hasOwnProperty('id') && !storyToEdit) {
        const currentData = this.dataSource.data;
        currentData.push(story);
        this.dataSource.data = currentData;
      }
    });
  }

  getStoriesByUserId() {
    openSnackBar(this._snackBar, `Getting your stories...`, 10);

    const user = localStorage.getItem('user')!;
    this.storiesStorageService.getStoriesByUserId(user).subscribe(
      (stories: VideoStory[]) => {
        if (stories.length === 0) {
          openSnackBar(
            this._snackBar,
            `User ${user} doesn't have any stories yet.`,
            10
          );
        } else {
          openSnackBar(this._snackBar, `Stories loaded successfully!`, 3);
        }
        this.dataSource.data = stories;
      },
      (error: any) => {
        let errorMessage;
        if (error.error.hasOwnProperty('detail')) {
          errorMessage = error.error.detail;
        } else {
          errorMessage = error.error.message;
        }
        console.error(errorMessage);
        openSnackBar(
          this._snackBar,
          `ERROR: ${errorMessage}. Please try again.`
        );
      }
    );
  }

  editStory(story: VideoStory) {
    this.openNewStoryDialog(story);
  }

  exportStory(story: VideoStory) {
    // If story is new, add an empty scene
    if (story.scenes.length === 0) {
      story.scenes.push(getNewVideoScene(0));
    }

    const exportStory: ExportStory = {
      story: story,
      replaceExistingStoryOnExport: true,
      generateInitialImageForScenes: false,
    };
    this.componentsCommunicationService.storyExported(exportStory);
    this.componentsCommunicationService.tabChanged(2);
  }

  deleteStory(story: VideoStory) {
    // Confirm for delete action - Implement Angular dialog later
    openSnackBar(this._snackBar, `Deleting story...`);

    const user = localStorage.getItem('user')!;
    this.storiesStorageService.deleteStoryById(user, story.id).subscribe(
      (response: any) => {
        console.log(response);
        openSnackBar(this._snackBar, `Story deleted successfully!`, 15);
        const index = this.dataSource.data.findIndex(
          (item) => item.id === story.id
        );
        if (index > -1) {
          this.dataSource.data.splice(index, 1);
          // Important: Reassign the dataSource.data to trigger change detection
          this.dataSource.data = [...this.dataSource.data];
        }
      },
      (error: any) => {
        let errorMessage;
        if (error.error.hasOwnProperty('detail')) {
          errorMessage = error.error.detail;
        } else {
          errorMessage = error.error.message;
        }
        console.error(errorMessage);
        openSnackBar(
          this._snackBar,
          `ERROR: ${errorMessage}. Please try again.`
        );
      }
    );
  }

  onDeleteStory(story: VideoStory): void {
    // Confirm delete story
    confirmAction(
      this.confirmDialog,
      '250px',
      `Are you sure you want to delete story ${story.id}?`,
      story,
      this.deleteStory.bind(this)
    );
  }
}
