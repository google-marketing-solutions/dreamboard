import { Component, inject, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatTooltipModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './stories-list.component.html',
  styleUrl: './stories-list.component.css',
})
export class StoriesListComponent {
  displayedColumns: string[] = [
    'id',
    'title',
    'description',
    'owner',
    'created_at',
    'updated_at',
    'actions',
  ];
  stories: VideoStory[] = [];
  dataSource = new MatTableDataSource(this.stories);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  private _snackBar = inject(MatSnackBar);
  newStoryDialog = inject(MatDialog);
  confirmDialog = inject(MatDialog);

  constructor(
    private storiesStorageService: StoriesStorageService,
    private componentsCommunicationService: ComponentsCommunicationService,
  ) {}

  /**
   * Initializes the component by fetching the stories for the current user.
   */
  ngOnInit(): void {
    this.getStoriesByUserId();
  }

  /**
   * Lifecycle hook called after the view has been initialized.
   * Sets up the paginator and sort for the table data source.
   */
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Filters the stories table based on the input value.
   * @param {Event} event - The input event containing the filter value.
   */
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /**
   * Opens a dialog for creating a new story or editing an existing one.
   * @param {VideoStory | null} storyToEdit - The story object to be edited, or null for a new story.
   * @returns {void}
   */
  openNewStoryDialog(storyToEdit: VideoStory | null) {
    const dialogRef = this.newStoryDialog.open(NewStoryDialogComponent, {
      minWidth: '800px',
      data: storyToEdit,
      disableClose: true, // Prevents closing on Escape key and backdrop click
    });

    // Subscribe to the afterClosed() observable to receive data upon closure
    dialogRef.afterClosed().subscribe((story: VideoStory) => {
      // Add only on close from Save event
      if (story && story.hasOwnProperty('id') && !storyToEdit) {
        const currentData = this.dataSource.data;
        currentData.push(story);
        this.dataSource.data = currentData;
      }
      if (story && story.hasOwnProperty('id')) {
        // Refresh stories after story creation.
        this.getStoriesByUserId();
      }
    });
  }

  /**
   * Retrieves the stories associated with the current user from the storage service.
   * Updates the table data source with the retrieved stories.
   * @returns {void}
   */
  getStoriesByUserId() {
    openSnackBar(this._snackBar, `Getting your stories...`);

    const user = localStorage.getItem('user')!;
    this.storiesStorageService.getStoriesByUserId(user).subscribe(
      (stories: VideoStory[]) => {
        if (stories.length === 0) {
          openSnackBar(
            this._snackBar,
            `User ${user} doesn't have any stories yet.`,
            10,
          );
        } else {
          openSnackBar(this._snackBar, `Stories loaded successfully!`, 10);
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
          `ERROR: ${errorMessage}. Please try again.`,
        );
      },
    );
  }

  /**
   * Opens the new story dialog to edit the selected story.
   * @param {VideoStory} story - The story to be edited.
   */
  editStory(story: VideoStory) {
    this.openNewStoryDialog(story);
  }

  /**
   * Exports the selected story to the scene builder for video generation.
   * It ensures the story has at least one scene before exporting.
   * @param {VideoStory} story - The story to be exported.
   */
  exportStory(story: VideoStory) {
    // If story is new, add an empty scene
    if (story.scenes.length === 0) {
      story.scenes.push(getNewVideoScene(0));
    }

    const exportStory: ExportStory = {
      story: story,
      replaceExistingStoryOnExport: true,
      generateInitialImageForScenes: false,
      useGeminiEditorModel: false,
    };
    this.componentsCommunicationService.storyExported(exportStory);
    this.componentsCommunicationService.videoGenerated(story);
    this.componentsCommunicationService.tabChanged(2);
  }

  /**
   * Deletes a story by its ID.
   * It sends a delete request to the storage service and updates the table upon success.
   * @param {VideoStory} story - The story to be deleted.
   */
  deleteStory(story: VideoStory) {
    // Confirm for delete action - Implement Angular dialog later
    openSnackBar(this._snackBar, `Deleting story...`);

    const user = localStorage.getItem('user')!;
    this.storiesStorageService.deleteStoryById(user, story.id).subscribe(
      (response: any) => {
        console.log(response);
        openSnackBar(this._snackBar, `Story deleted successfully!`, 15);
        const index = this.dataSource.data.findIndex(
          (item) => item.id === story.id,
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
          `ERROR: ${errorMessage}. Please try again.`,
        );
      },
    );
  }

  /**
   * Opens a confirmation dialog before deleting a story.
   * @param {VideoStory} story - The story to be deleted.
   */
  onDeleteStory(story: VideoStory): void {
    // Confirm delete story
    confirmAction(
      this.confirmDialog,
      '450px',
      `Are you sure you want to delete story ${story.id}?`,
      story,
      this.deleteStory.bind(this),
    );
  }
}
