import CloudSyncIcon from '@mui/icons-material/CloudSync';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadOffIcon from '@mui/icons-material/FileDownloadOff';
import LaunchIcon from '@mui/icons-material/Launch';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import { Button, Dialog, DialogContent, Tooltip } from '@mui/material';

import React, { forwardRef, useContext, useState } from 'react';

import { useSelector } from 'react-redux';

import { forkJoin } from 'rxjs';

import type { ProgressBackgroundProps } from '@src/components';
import { TaskAdd } from '@src/components';

import type { Download, GlobalSettings, TaskForm } from '@src/models';
import { ColorLevel, ColorLevelMap, DownloadStatus, downloadStatusToColor } from '@src/models';

import { DownloadService, InterceptService, LoggerService, NotificationService } from '@src/services';

import type { StoreState } from '@src/store';
import { ContainerContext } from '@src/store';
import { getGlobalDownload, getSettingsDownloadsTransfer } from '@src/store/selectors';
import { useI18n } from '@src/utils';

import { ContentItem } from '../content-item';

import { DownloadCard } from './download-card';
import { DownloadDetail } from './download-detail';

import type { ContentItemAccordionProps } from '../content-item';
import type { ForwardRefRenderFunction } from 'react';

type DownloadItemProps = { download: Download; hideStatus?: boolean; accordion: ContentItemAccordionProps; className?: string };
export type DownloadItemButton = {
  key: 'erase' | 'cancel' | 'retry' | 'pause' | 'resume' | 'open' | 'transfer';
  icon: JSX.Element;
  color: ColorLevel;
};

const ButtonStyle = { display: 'flex', flex: '1 1 auto', minHeight: '2.5rem' };
const DownloadItemComponent: ForwardRefRenderFunction<HTMLDivElement, DownloadItemProps> = ({ download, hideStatus, accordion, className }, ref) => {
  const i18n = useI18n('panel', 'content', 'download', 'item');
  const [expanded, setExpanded] = useState(false);
  const [hover, setHover] = useState(false);

  // Dialog
  const [dialog, toggleDialog] = React.useState(false);
  const [form] = React.useState<TaskForm>({ uri: download.finalUrl, source: download.referrer });
  const { erase, resume, modal } = useSelector(getSettingsDownloadsTransfer);
  const { containerRef } = useContext(ContainerContext);

  const close = (_erase = false) => {
    toggleDialog(false);
    if (_erase) DownloadService.erase({ id: download.id }).subscribe();
  };

  const buttons: DownloadItemButton[] = [];

  let topButton: DownloadItemButton = { key: 'erase', icon: <DeleteIcon />, color: ColorLevel.error };
  if ([DownloadStatus.downloading, DownloadStatus.paused].includes(download.status))
    topButton = { key: 'cancel', icon: <FileDownloadOffIcon />, color: ColorLevel.primary };
  buttons.push(topButton);

  let bottomButton: DownloadItemButton = { key: 'retry', icon: <ReplayIcon />, color: ColorLevel.secondary };
  if (DownloadStatus.downloading === download.status) {
    bottomButton = { key: 'pause', icon: <PauseIcon />, color: ColorLevel.warning };
  } else if (download.canResume) {
    bottomButton = { key: 'resume', icon: <PlayArrowIcon />, color: ColorLevel.success };
  } else if (DownloadStatus.complete === download.status) {
    bottomButton = { key: 'open', icon: <LaunchIcon />, color: ColorLevel.secondary };
  }
  buttons.push(bottomButton);

  const showBackground = useSelector<StoreState, GlobalSettings['download']>(getGlobalDownload)?.background;
  const background: ProgressBackgroundProps = showBackground
    ? {
        primary: `${ColorLevelMap[downloadStatusToColor(download.status)]}${hover ? 30 : 20}`,
        progress: download.progress ?? 0,
      }
    : {};

  const errorHandler = (button: DownloadItemButton['key']) => ({
    error: (error: Error) => {
      LoggerService.error(`Download action '${button}' failed.`, error);
      NotificationService.error({
        title: i18n(`download_${button}_fail`, 'common', 'error'),
        message: error?.message ?? error?.name ?? '',
      });
    },
  });

  const handleClick = ($event: React.MouseEvent, key: DownloadItemButton['key']) => {
    $event.stopPropagation();
    switch (key) {
      case 'erase':
        return DownloadService.erase({ id: download.id }).subscribe(errorHandler(key));
      case 'cancel':
        return DownloadService.cancel(download.id).subscribe(errorHandler(key));
      case 'retry':
        return forkJoin([
          DownloadService.download({
            url: download.finalUrl,
            conflictAction: 'uniquify',
            saveAs: $event.shiftKey,
          }),
          DownloadService.erase({ id: download.id }),
        ]).subscribe(errorHandler(key));
      case 'pause':
        return DownloadService.pause(download.id).subscribe(errorHandler(key));
      case 'resume':
        return DownloadService.resume(download.id).subscribe(errorHandler(key));
      case 'open':
        if ($event.shiftKey) return DownloadService.open(download.id).subscribe();
        return DownloadService.show(download.id).subscribe(errorHandler(key));
      case 'transfer':
        if ($event.shiftKey || !modal) return InterceptService.transfer(download, { erase, resume }).subscribe(errorHandler(key));
        return toggleDialog(true);
      default:
        LoggerService.warn(`Key '${key}' is unknown`);
    }
  };

  const detailsButtons = buttons.slice().reverse();
  detailsButtons.unshift({ key: 'transfer', icon: <CloudSyncIcon />, color: ColorLevel.info });
  return (
    <>
      <ContentItem
        ref={ref}
        className={className}
        accordion={accordion}
        onHover={_visible => setHover(_visible)}
        onToggle={_expanded => setExpanded(_expanded)}
        background={background}
        summary={{
          card: <DownloadCard download={download} hideStatus={hideStatus} expanded={expanded} hover={hover} />,
          buttons: (
            <>
              {buttons?.map(button => (
                <Tooltip
                  arrow
                  key={button.key}
                  title={i18n(button.key, 'common', 'buttons')}
                  placement={'left'}
                  PopperProps={{ disablePortal: true }}
                >
                  <span>
                    <Button key={button.key} sx={ButtonStyle} onClick={$event => handleClick($event, button.key)} color={button.color}>
                      {button.icon}
                    </Button>
                  </span>
                </Tooltip>
              ))}
            </>
          ),
        }}
        details={<DownloadDetail download={download} buttons={detailsButtons} onclick={handleClick} />}
      />
      <Dialog
        open={dialog}
        fullWidth={true}
        onClose={() => close()}
        maxWidth={'md'}
        PaperProps={{ sx: { maxHeight: 'calc(100% - 1em)' } }}
        container={containerRef?.current}
      >
        <DialogContent sx={{ p: '0', fontSize: '1rem' }}>
          <TaskAdd form={form} withCancel={true} onFormCancel={() => close()} onFormSubmit={() => close(erase)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export const DownloadItem = forwardRef(DownloadItemComponent);
