import { switchMap, tap } from 'rxjs';

import type { InterceptPayload, InterceptResponse, TaskForm } from '@src/models';
import { ChromeMessageType } from '@src/models';
import { DownloadService, QueryService } from '@src/services';
import type { DownloadItem } from '@src/utils';
import { sendActiveTabMessage } from '@src/utils';

import type { Observable } from 'rxjs';

type InterceptOptions = { erase?: boolean; resume?: boolean };
export class InterceptService {
  static transfer<T extends DownloadItem>(download: T, { erase, resume }: InterceptOptions = {}): Observable<void> {
    return DownloadService.pause(download.id).pipe(
      switchMap(() => QueryService.createTask(download.finalUrl, download.referrer)),

      tap({
        error: err => {
          console.error(`Failed to create task for download '${download.id}'`, { err, download });
          if (resume) DownloadService.resume(download.id).subscribe();
        },
        complete: () => {
          console.debug(`Download ${download.id} intercepted and transferred successfully.`, { download });
          if (erase) DownloadService.erase({ id: download.id }).subscribe();
        },
      }),
    );
  }

  static openMenu<T extends DownloadItem>(download: T, { erase, resume }: InterceptOptions = {}): Observable<InterceptResponse> {
    const form: TaskForm = { uri: download.finalUrl, source: download.referrer };
    return DownloadService.pause(download.id).pipe(
      switchMap(() =>
        sendActiveTabMessage<InterceptPayload, InterceptResponse>({
          type: ChromeMessageType.intercept,
          payload: form,
        }),
      ),
      tap({
        next: ({ message, aborted }) => {
          if (message) console.debug(`Intercept for download ${download.id} exited with message`, message);
          if (aborted && resume) DownloadService.resume(download.id).subscribe();
          if (!aborted && erase) DownloadService.erase({ id: download.id }).subscribe();
        },
        error: err => {
          console.error(`Failed to send download '${download.id}' to active tab`, { err, download });
          if (resume) DownloadService.resume(download.id).subscribe();
        },
      }),
    );
  }
}