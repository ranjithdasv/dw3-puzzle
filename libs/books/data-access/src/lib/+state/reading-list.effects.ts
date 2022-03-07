import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Actions, createEffect, ofType, OnInitEffects } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, concatMap, exhaustMap, map, tap } from 'rxjs/operators';
import { ReadingListItem, Book } from '@tmo/shared/models';
import * as ReadingListActions from './reading-list.actions';
import {MatSnackBar} from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { TypedAction } from '@ngrx/store/src/models';
@Injectable()
export class ReadingListEffects implements OnInitEffects {
  loadReadingList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReadingListActions.init),
      exhaustMap(() =>
        this.http.get<ReadingListItem[]>('/api/reading-list').pipe(
          map((data) =>
            ReadingListActions.loadReadingListSuccess({ list: data })
          ),
          catchError((error) =>
            of(ReadingListActions.loadReadingListError({ error }))
          )
        )
      )
    )
  );

  addBook$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReadingListActions.addToReadingList),
      concatMap(({ book, undo }) =>
        this.http.post('/api/reading-list', book).pipe(
          map(() =>
            ReadingListActions.confirmedAddToReadingList({
              book,
              undo: !!undo
            })
          ),
          catchError(() =>
            of(ReadingListActions.failedAddToReadingList({ book }))
          )
        )
      )
    )
  );

  confirmAddBook$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ReadingListActions.confirmedAddToReadingList),
        tap(({ book, undo }) => {
          if (!undo) {
            const { id, ...rest } = book;
            const item: ReadingListItem = {
              bookId: book.id,
              ...rest
            };

            this.openMatSnackBar(
              'Added \"' +`${book.title}`+ '\" to the reading list',
              'Undo',
              ReadingListActions.removeFromReadingList({
                item,
                undo: true
              })
            );
          }
        })
      ),
    {
      dispatch: false
    }
  );

  removeBook$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReadingListActions.removeFromReadingList),
      concatMap(({ item, undo }) =>
        this.http.delete(`/api/reading-list/${item.bookId}`).pipe(
          map(() =>
            ReadingListActions.confirmedRemoveFromReadingList({
              item,
              undo: !!undo
            })
          ),
          catchError(() =>
            of(ReadingListActions.failedRemoveFromReadingList({ item }))
          )
        )
      )
    )
  );

  confirmRemoveBook$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ReadingListActions.confirmedRemoveFromReadingList),
        tap(({ item, undo }) => {
          if (!undo) {
            const { bookId, ...rest } = item;
            const book: Book = {
              id: item.bookId,
              ...rest
            };

            this.openMatSnackBar(
              'Removed \"' + `${item.title}` + '\" from the reading list',
              'Undo',
              ReadingListActions.addToReadingList({
                book,
                undo: true
              })
            );
          }
        })
      ),
    {
      dispatch: false
    }
  );

  openMatSnackBar = (
    message: string,
    actionText: string,
    action: TypedAction<string>
  ) => {
    this.matSnackBar
      .open(message, actionText, {
        duration: 5000
      })
      .onAction()
      .subscribe(() => {
        this.store.dispatch(action);
      });
  };


  ngrxOnInitEffects() {
    return ReadingListActions.init();
  }

  constructor(private actions$: Actions,
    private http: HttpClient,
    private matSnackBar: MatSnackBar,
    private readonly store: Store) { }
}
