import createCache from '@emotion/cache';
import React from 'react';

import { render } from 'react-dom';

import { mockI18n } from '@src/mocks';
import type { StoreOrProxy } from '@src/models';
import { AppInstance, ServiceInstance } from '@src/models';
import { ContentApp } from '@src/pages/content/components/content-app';
import type { AnchorPayload, TaskDialogPayload } from '@src/pages/content/service';
import { anchor$, taskDialog$ } from '@src/pages/content/service';
import { DownloadService, LoggerService, NotificationService, PollingService, QueryService } from '@src/services';
import { store } from '@src/store';

export class ContentAppWc extends HTMLElement {
  async connectedCallback() {
    await mockI18n();
    this.init();
    this.render();
  }

  init(storeProxy: StoreOrProxy = store) {
    LoggerService.init(storeProxy, ServiceInstance.Content);
    DownloadService.init(storeProxy);
    QueryService.init(storeProxy, ServiceInstance.Content);
    NotificationService.init(storeProxy, ServiceInstance.Content);
    PollingService.init(storeProxy);
  }

  /**
   * Render the web component
   * @param root
   * @param storeOrProxy
   */
  render(root: Element = this, storeOrProxy: StoreOrProxy = store) {
    const shadowRoot = root.attachShadow({ mode: 'closed' });
    shadowRoot.innerHTML = `
      <div id="${AppInstance.content}-container">
          <div id="${AppInstance.content}-app"></div>
      </div>
    `;

    const container = shadowRoot.querySelector(`#${AppInstance.content}-container`) as HTMLElement;
    const app = shadowRoot.querySelector(`#${AppInstance.content}-app`);
    const cache = createCache({ key: `${AppInstance.content}-cache`, container });

    return render(<ContentApp storeOrProxy={storeOrProxy} cache={cache} container={container} />, app);
  }

  /**
   * Open quick menu dialog by dispatching a click event
   * @param payload
   */
  anchor(payload: AnchorPayload) {
    anchor$.next(payload);
  }

  /**
   * Open task dialog by dispatching a task event
   * @param payload
   */
  dialog(payload: TaskDialogPayload) {
    taskDialog$.next(payload);
  }
}